import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';
import { logSecurity } from '../utils/logger.js';

// Helmet Security Headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

// Allgemeines Rate Limiting
export const generalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  message: {
    success: false,
    message: 'Zu viele Anfragen - bitte versuchen Sie es später erneut',
    errors: [{ message: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' }],
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logSecurity('Rate limit überschritten', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json(options.message);
  },
});

// Strengeres Rate Limiting für Authentifizierung
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 10, // Max 10 Login-Versuche
  message: {
    success: false,
    message: 'Zu viele Anmeldeversuche - bitte warten Sie 15 Minuten',
    errors: [{ message: 'Too many login attempts', code: 'AUTH_RATE_LIMIT' }],
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res, next, options) => {
    logSecurity('Auth rate limit überschritten', {
      ip: req.ip,
      email: req.body?.email,
    });
    res.status(429).json(options.message);
  },
});

// Rate Limiting für API-Keys/Sensitive Endpoints
export const sensitiveRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 Minute
  max: 5,
  message: {
    success: false,
    message: 'Zu viele Anfragen an sensiblen Endpunkt',
    errors: [{ message: 'Sensitive endpoint rate limit', code: 'SENSITIVE_RATE_LIMIT' }],
  },
});

// Request Sanitization
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Entferne potenziell gefährliche Zeichen aus String-Feldern
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Entferne null bytes und andere gefährliche Zeichen
      return obj.replace(/\0/g, '').trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        // Verhindere Prototype Pollution
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          logSecurity('Prototype pollution Versuch', { ip: req.ip, key });
          continue;
        }
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// SQL Injection Prevention Check (zusätzlich zu Prisma's parameterized queries)
export const checkSqlInjection = (req: Request, res: Response, next: NextFunction): void => {
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    if (value && typeof value === 'object') {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    logSecurity('Potentieller SQL Injection Versuch', {
      ip: req.ip,
      path: req.path,
      body: req.body,
      query: req.query,
    });

    res.status(400).json({
      success: false,
      message: 'Ungültige Zeichen in der Anfrage',
      errors: [{ message: 'Invalid characters detected', code: 'INVALID_INPUT' }],
    });
    return;
  }

  next();
};

// XSS Prevention Headers
export const xssPreventionHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

// CORS Konfiguration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = config.CORS_ORIGIN.split(',').map(o => o.trim());

    // Erlaube Anfragen ohne Origin (z.B. mobile Apps, Postman)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin) || config.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      logSecurity('CORS Verletzung', { origin });
      callback(new Error('CORS nicht erlaubt'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
  maxAge: 86400, // 24 Stunden
};
