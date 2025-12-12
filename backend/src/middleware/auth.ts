import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { config } from '../config/index.js';
import { AuthenticatedRequest, TokenPayload } from '../types/index.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';
import { logger, logSecurity } from '../utils/logger.js';

// JWT Token verifizieren
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Kein Authentifizierungs-Token vorhanden');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AuthenticationError('Ungültiges Token-Format');
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logSecurity('Token abgelaufen', { ip: req.ip });
      next(new AuthenticationError('Token abgelaufen'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      logSecurity('Ungültiges Token', { ip: req.ip, error: (error as Error).message });
      next(new AuthenticationError('Ungültiges Token'));
    } else {
      next(error);
    }
  }
};

// Optionale Authentifizierung (Token wird geprüft, aber nicht erforderlich)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_SECRET) as TokenPayload;
        req.user = decoded;
      } catch {
        // Token ungültig, aber wir fahren ohne Authentifizierung fort
        logger.debug('Optionale Authentifizierung fehlgeschlagen');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Rollen-basierte Autorisierung
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError('Nicht authentifiziert'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logSecurity('Unberechtigter Zugriff versucht', {
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });
      next(new AuthorizationError('Keine Berechtigung für diese Aktion'));
      return;
    }

    next();
  };
};

// Eigentümer-Überprüfung (für ressourcenspezifische Aktionen)
export const isOwnerOrAdmin = (getResourceUserId: (req: AuthenticatedRequest) => string | Promise<string>) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Nicht authentifiziert');
      }

      // Admins haben immer Zugriff
      if (req.user.role === UserRole.ADMIN) {
        return next();
      }

      const resourceUserId = await getResourceUserId(req);

      if (req.user.userId !== resourceUserId) {
        logSecurity('Nicht autorisierter Ressourcenzugriff', {
          userId: req.user.userId,
          resourceUserId,
          path: req.path,
        });
        throw new AuthorizationError('Keine Berechtigung für diese Ressource');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Token-Generierung
export const generateTokens = (payload: Omit<TokenPayload, 'iat' | 'exp'>) => {
  const accessToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
};

// Refresh Token verifizieren
export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as TokenPayload;
};
