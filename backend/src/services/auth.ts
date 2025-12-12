import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from './database.js';
import { generateTokens, verifyRefreshToken } from '../middleware/auth.js';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError
} from '../utils/errors.js';
import { logger, logSecurity } from '../utils/logger.js';
import { RegisterUserDto, LoginDto, TokenPayload } from '../types/index.js';

const SALT_ROUNDS = 12;

// Benutzer registrieren
export async function registerUser(data: RegisterUserDto) {
  // Prüfen ob E-Mail bereits existiert
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existingUser) {
    throw new ConflictError('Ein Benutzer mit dieser E-Mail existiert bereits');
  }

  // Passwort hashen
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  // Benutzer erstellen
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role || UserRole.CUSTOMER,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  logger.info('Neuer Benutzer registriert', { userId: user.id, role: user.role });

  // Tokens generieren
  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Refresh Token speichern
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Tage
    },
  });

  return { user, ...tokens };
}

// Benutzer anmelden
export async function loginUser(data: LoginDto) {
  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (!user) {
    logSecurity('Fehlgeschlagener Login - Benutzer nicht gefunden', { email: data.email });
    throw new AuthenticationError('Ungültige E-Mail oder Passwort');
  }

  if (!user.isActive) {
    logSecurity('Login-Versuch für deaktivierten Account', { userId: user.id });
    throw new AuthenticationError('Ihr Konto wurde deaktiviert');
  }

  // Passwort prüfen
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

  if (!isPasswordValid) {
    logSecurity('Fehlgeschlagener Login - falsches Passwort', { userId: user.id });
    throw new AuthenticationError('Ungültige E-Mail oder Passwort');
  }

  logger.info('Benutzer angemeldet', { userId: user.id });

  // Tokens generieren
  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Refresh Token speichern
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Alte Refresh Tokens aufräumen (max 5 pro User)
  const tokens_db = await prisma.refreshToken.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  if (tokens_db.length > 5) {
    const tokensToDelete = tokens_db.slice(5).map(t => t.id);
    await prisma.refreshToken.deleteMany({
      where: { id: { in: tokensToDelete } },
    });
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
    },
    ...tokens,
  };
}

// Token erneuern
export async function refreshUserToken(refreshToken: string) {
  // Token in Datenbank suchen
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!storedToken) {
    logSecurity('Ungültiger Refresh Token', { token: refreshToken.substring(0, 20) + '...' });
    throw new AuthenticationError('Ungültiger Refresh Token');
  }

  // Token abgelaufen?
  if (storedToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    throw new AuthenticationError('Refresh Token abgelaufen');
  }

  // Benutzer aktiv?
  if (!storedToken.user.isActive) {
    throw new AuthenticationError('Konto deaktiviert');
  }

  // Token verifizieren
  try {
    verifyRefreshToken(refreshToken);
  } catch {
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });
    throw new AuthenticationError('Ungültiger Refresh Token');
  }

  // Alten Token löschen
  await prisma.refreshToken.delete({ where: { id: storedToken.id } });

  // Neue Tokens generieren
  const newTokens = generateTokens({
    userId: storedToken.user.id,
    email: storedToken.user.email,
    role: storedToken.user.role,
  });

  // Neuen Refresh Token speichern
  await prisma.refreshToken.create({
    data: {
      userId: storedToken.user.id,
      token: newTokens.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  logger.info('Token erneuert', { userId: storedToken.user.id });

  return newTokens;
}

// Abmelden (Refresh Token löschen)
export async function logoutUser(userId: string, refreshToken?: string) {
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: { userId, token: refreshToken },
    });
  } else {
    // Alle Refresh Tokens des Benutzers löschen
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  logger.info('Benutzer abgemeldet', { userId });
}

// Passwort ändern
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('Benutzer');
  }

  // Aktuelles Passwort prüfen
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!isValid) {
    throw new ValidationError([
      { field: 'currentPassword', message: 'Aktuelles Passwort ist falsch' },
    ]);
  }

  // Neues Passwort hashen und speichern
  const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  // Alle Refresh Tokens löschen (erzwingt Neuanmeldung)
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });

  logger.info('Passwort geändert', { userId });
}

// Benutzer per ID abrufen
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError('Benutzer');
  }

  return user;
}
