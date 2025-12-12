import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/index.js';
import { logger, httpLogStream } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './services/database.js';
import {
  securityHeaders,
  generalRateLimiter,
  sanitizeRequest,
  checkSqlInjection,
  xssPreventionHeaders,
  corsOptions,
} from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

// Express App erstellen
const app = express();

// Trust Proxy (für Rate Limiting hinter Reverse Proxy)
app.set('trust proxy', 1);

// Security Middleware
app.use(securityHeaders);
app.use(xssPreventionHeaders);
app.use(cors(corsOptions));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Sanitization & Security
app.use(sanitizeRequest);
app.use(checkSqlInjection);

// Rate Limiting
app.use(generalRateLimiter);

// HTTP Logging
app.use(morgan('combined', { stream: httpLogStream }));

// API Routes
app.use('/api', routes);

// 404 Handler
app.use(notFoundHandler);

// Error Handler
app.use(errorHandler);

// Server starten
async function startServer() {
  try {
    // Datenbankverbindung herstellen
    await connectDatabase();

    // Server starten
    const server = app.listen(config.PORT, () => {
      logger.info(`Server läuft auf http://${config.HOST}:${config.PORT}`);
      logger.info(`Umgebung: ${config.NODE_ENV}`);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} empfangen - Server wird heruntergefahren...`);

      server.close(async () => {
        logger.info('HTTP-Server geschlossen');

        try {
          await disconnectDatabase();
          logger.info('Datenbankverbindung geschlossen');
          process.exit(0);
        } catch (error) {
          logger.error('Fehler beim Schließen der Datenbankverbindung', { error });
          process.exit(1);
        }
      });

      // Force Shutdown nach 30 Sekunden
      setTimeout(() => {
        logger.error('Force Shutdown nach Timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Unhandled Errors
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', { error });
      shutdown('UNCAUGHT_EXCEPTION');
    });

  } catch (error) {
    logger.error('Server konnte nicht gestartet werden', { error });
    process.exit(1);
  }
}

// Server starten
startServer();

export default app;
