import winston from 'winston';
import { config } from '../config/index.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom Log-Format
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }

  if (stack) {
    log += `\n${stack}`;
  }

  return log;
});

// Logger-Instanz erstellen
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  defaultMeta: { service: 'dog-walking-api' },
  transports: [
    // Konsolen-Output (nur in Entwicklung mit Farben)
    new winston.transports.Console({
      format: combine(
        config.NODE_ENV === 'development' ? colorize() : winston.format.uncolorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
    // Fehler-Log-Datei
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Kombiniertes Log-Datei
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Stream für Morgan HTTP-Logging
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Hilfsfunktionen für strukturiertes Logging
export const logRequest = (method: string, path: string, userId?: string) => {
  logger.info(`${method} ${path}`, { userId });
};

export const logError = (error: Error, context?: Record<string, unknown>) => {
  logger.error(error.message, { error, ...context });
};

export const logSecurity = (event: string, details: Record<string, unknown>) => {
  logger.warn(`SECURITY: ${event}`, details);
};
