// Custom Error-Klassen für die Anwendung

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Spezifische Fehlertypen
export class ValidationError extends AppError {
  public readonly errors: Array<{ field: string; message: string }>;

  constructor(errors: Array<{ field: string; message: string }>) {
    super('Validierungsfehler', 400, 'VALIDATION_ERROR');
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentifizierung fehlgeschlagen') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Keine Berechtigung für diese Aktion') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Ressource') {
    super(`${resource} nicht gefunden`, 404, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Ressourcenkonflikt') {
    super(message, 409, 'CONFLICT');
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Zu viele Anfragen - bitte warten') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Datenbankfehler') {
    super(message, 500, 'DATABASE_ERROR', false);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

// Error Type Guards
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError;
};
