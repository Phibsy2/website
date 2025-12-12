import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { AppError, ValidationError, isAppError } from '../utils/errors.js';
import { logger, logError } from '../utils/logger.js';
import { ApiResponse } from '../types/index.js';

// Zentraler Error Handler
export const errorHandler: ErrorRequestHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log alle Fehler
  logError(error, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.userId,
  });

  // Bekannte App-Fehler
  if (isAppError(error)) {
    const response: ApiResponse = {
      success: false,
      message: error.message,
      errors: error instanceof ValidationError
        ? error.errors
        : [{ message: error.message, code: error.code }],
    };

    res.status(error.statusCode).json(response);
    return;
  }

  // Prisma-Fehler behandeln
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const response = handlePrismaError(error);
    res.status(response.statusCode).json(response.body);
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    const response: ApiResponse = {
      success: false,
      message: 'Ungültige Daten',
      errors: [{ message: 'Die übergebenen Daten sind ungültig', code: 'VALIDATION_ERROR' }],
    };
    res.status(400).json(response);
    return;
  }

  // Unbekannte Fehler
  const response: ApiResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Ein interner Fehler ist aufgetreten'
      : error.message,
    errors: [{
      message: process.env.NODE_ENV === 'production'
        ? 'Interner Serverfehler'
        : error.stack || error.message,
      code: 'INTERNAL_ERROR',
    }],
  };

  res.status(500).json(response);
};

// Prisma-Fehler in lesbare Meldungen umwandeln
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  body: ApiResponse;
} {
  let statusCode = 500;
  let message = 'Datenbankfehler';
  let code = 'DATABASE_ERROR';

  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      statusCode = 409;
      const field = (error.meta?.target as string[])?.join(', ') || 'Feld';
      message = `Ein Eintrag mit diesem ${field} existiert bereits`;
      code = 'DUPLICATE_ENTRY';
      break;

    case 'P2003':
      // Foreign key constraint violation
      statusCode = 400;
      message = 'Referenzierte Ressource existiert nicht';
      code = 'INVALID_REFERENCE';
      break;

    case 'P2025':
      // Record not found
      statusCode = 404;
      message = 'Ressource nicht gefunden';
      code = 'NOT_FOUND';
      break;

    case 'P2014':
      // Required relation violation
      statusCode = 400;
      message = 'Erforderliche Verknüpfung fehlt';
      code = 'MISSING_RELATION';
      break;

    default:
      logger.error(`Unbehandelter Prisma-Fehler: ${error.code}`, { error });
  }

  return {
    statusCode,
    body: {
      success: false,
      message,
      errors: [{ message, code }],
    },
  };
}

// 404 Handler für nicht gefundene Routen
export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    message: 'Route nicht gefunden',
    errors: [{
      message: `Die Route ${req.method} ${req.path} existiert nicht`,
      code: 'ROUTE_NOT_FOUND',
    }],
  };

  res.status(404).json(response);
};

// Async Handler Wrapper (verhindert try-catch in jedem Controller)
export const asyncHandler = <T extends (...args: any[]) => Promise<any>>(fn: T) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
