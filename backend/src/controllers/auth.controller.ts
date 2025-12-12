import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import * as authService from '../services/auth.js';

// Registrierung
export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body);

  const response: ApiResponse = {
    success: true,
    message: 'Registrierung erfolgreich',
    data: result,
  };

  res.status(201).json(response);
});

// Login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);

  const response: ApiResponse = {
    success: true,
    message: 'Anmeldung erfolgreich',
    data: result,
  };

  res.json(response);
});

// Token erneuern
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshUserToken(refreshToken);

  const response: ApiResponse = {
    success: true,
    message: 'Token erneuert',
    data: tokens,
  };

  res.json(response);
});

// Logout
export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken } = req.body;

  if (req.user) {
    await authService.logoutUser(req.user.userId, refreshToken);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Abmeldung erfolgreich',
  };

  res.json(response);
});

// Aktuellen Benutzer abrufen
export const me = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const user = await authService.getUserById(req.user.userId);

  const response: ApiResponse = {
    success: true,
    data: user,
  };

  res.json(response);
});

// Passwort ändern
export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.userId, currentPassword, newPassword);

  const response: ApiResponse = {
    success: true,
    message: 'Passwort geändert - bitte erneut anmelden',
  };

  res.json(response);
});
