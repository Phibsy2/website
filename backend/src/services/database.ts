import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Prisma Client mit Logging
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Singleton Pattern für Prisma (wichtig für Development mit Hot-Reload)
export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Event-basiertes Logging
prisma.$on('query' as never, (e: any) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Query: ${e.query}`, { duration: `${e.duration}ms` });
  }
});

prisma.$on('error' as never, (e: any) => {
  logger.error('Prisma Error', { error: e.message });
});

// Datenbankverbindung testen
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Datenbankverbindung erfolgreich hergestellt');
  } catch (error) {
    logger.error('Datenbankverbindung fehlgeschlagen', { error });
    throw error;
  }
}

// Datenbankverbindung schließen
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Datenbankverbindung geschlossen');
}

// Health Check für Datenbank
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default prisma;
