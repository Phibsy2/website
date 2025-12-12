import { Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import * as groupWalkService from '../services/groupWalk.js';

// Gruppentermin erstellen
export const createGroupWalk = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const groupWalk = await groupWalkService.createGroupWalk(req.user.userId, req.body);

  const response: ApiResponse = {
    success: true,
    message: 'Gruppentermin erstellt',
    data: groupWalk,
  };

  res.status(201).json(response);
});

// Gruppentermin beitreten
export const joinGroupWalk = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { id } = req.params;
  const groupWalk = await groupWalkService.joinGroupWalk(id!, req.user.userId, req.body);

  const response: ApiResponse = {
    success: true,
    message: 'Erfolgreich angemeldet',
    data: groupWalk,
  };

  res.json(response);
});

// Vom Gruppentermin abmelden
export const leaveGroupWalk = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { id } = req.params;
  await groupWalkService.leaveGroupWalk(id!, req.user.userId);

  const response: ApiResponse = {
    success: true,
    message: 'Erfolgreich abgemeldet',
  };

  res.json(response);
});

// Gruppentermine auflisten
export const getGroupWalks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, sortBy, sortOrder, status, walkerId, latitude, longitude, radius } = req.query;

  const result = await groupWalkService.getGroupWalks({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy as string,
    sortOrder: sortOrder as 'asc' | 'desc',
    status: status as string,
    walkerId: walkerId as string,
    latitude: latitude ? Number(latitude) : undefined,
    longitude: longitude ? Number(longitude) : undefined,
    radius: radius ? Number(radius) : undefined,
  });

  const response: ApiResponse = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.json(response);
});

// Einzelnen Gruppentermin abrufen
export const getGroupWalk = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const groupWalk = await groupWalkService.getGroupWalkById(id!);

  const response: ApiResponse = {
    success: true,
    data: groupWalk,
  };

  res.json(response);
});

// Gruppentermin starten
export const startGroupWalk = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { id } = req.params;
  const groupWalk = await groupWalkService.startGroupWalk(id!, req.user.userId);

  const response: ApiResponse = {
    success: true,
    message: 'Gruppentermin gestartet',
    data: groupWalk,
  };

  res.json(response);
});

// Gruppentermin abschließen
export const completeGroupWalk = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { id } = req.params;
  const groupWalk = await groupWalkService.completeGroupWalk(id!, req.user.userId);

  const response: ApiResponse = {
    success: true,
    message: 'Gruppentermin abgeschlossen',
    data: groupWalk,
  };

  res.json(response);
});

// Gruppentermin absagen
export const cancelGroupWalk = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { id } = req.params;
  const isAdmin = req.user.role === 'ADMIN';
  const groupWalk = await groupWalkService.cancelGroupWalk(id!, req.user.userId, isAdmin);

  const response: ApiResponse = {
    success: true,
    message: 'Gruppentermin abgesagt',
    data: groupWalk,
  };

  res.json(response);
});
