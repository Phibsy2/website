import { z } from 'zod';

// Umgebungsvariablen-Schema für Validierung
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  HOST: z.string().default('localhost'),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  GROUP_WALK_MAX_RADIUS_KM: z.string().transform(Number).default('3'),
  GROUP_WALK_TIME_WINDOW_MINUTES: z.string().transform(Number).default('60'),
});

// Validiere und lade Konfiguration
function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Ungültige Umgebungsvariablen:');
    console.error(result.error.format());

    // In Produktion Fehler werfen, in Entwicklung Defaults verwenden
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Konfigurationsfehler - bitte Umgebungsvariablen prüfen');
    }

    // Fallback für Entwicklung
    return {
      NODE_ENV: 'development' as const,
      PORT: 3001,
      HOST: 'localhost',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/dogwalking',
      JWT_SECRET: 'development-secret-key-min-32-characters!!',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_SECRET: 'development-refresh-key-min-32-chars!!',
      JWT_REFRESH_EXPIRES_IN: '7d',
      CORS_ORIGIN: 'http://localhost:3000',
      RATE_LIMIT_WINDOW_MS: 900000,
      RATE_LIMIT_MAX: 100,
      LOG_LEVEL: 'debug' as const,
      GROUP_WALK_MAX_RADIUS_KM: 3,
      GROUP_WALK_TIME_WINDOW_MINUTES: 60,
    };
  }

  return result.data;
}

export const config = loadConfig();

// Typ-Export für TypeScript
export type Config = typeof config;
