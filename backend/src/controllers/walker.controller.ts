import { Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import * as walkerService from '../services/walker.js';

// Walker-Profil erstellen
export const createProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const profile = await walkerService.createWalkerProfile(req.user.userId, req.body);

  const response: ApiResponse = {
    success: true,
    message: 'Walker-Profil erstellt',
    data: profile,
  };

  res.status(201).json(response);
});

// Walker-Profil aktualisieren
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const profile = await walkerService.updateWalkerProfile(req.user.userId, req.body);

  const response: ApiResponse = {
    success: true,
    message: 'Walker-Profil aktualisiert',
    data: profile,
  };

  res.json(response);
});

// Eigenes Walker-Profil abrufen
export const getMyProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const profile = await walkerService.getWalkerProfile(req.user.userId);

  const response: ApiResponse = {
    success: true,
    data: profile,
  };

  res.json(response);
});

// Walker-Profil per ID abrufen (öffentlich)
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const profile = await walkerService.getWalkerProfile(id!);

  const response: ApiResponse = {
    success: true,
    data: profile,
  };

  res.json(response);
});

// Alle Walker auflisten
export const getWalkers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page, limit, sortBy, sortOrder, available, minRating, maxRate, latitude, longitude, radius } = req.query;

  const result = await walkerService.getWalkers({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy as string,
    sortOrder: sortOrder as 'asc' | 'desc',
    available: available === 'true' ? true : available === 'false' ? false : undefined,
    minRating: minRating ? Number(minRating) : undefined,
    maxRate: maxRate ? Number(maxRate) : undefined,
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

// Service-Gebiet hinzufügen
export const addServiceArea = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const serviceArea = await walkerService.addServiceArea(req.user.userId, req.body);

  const response: ApiResponse = {
    success: true,
    message: 'Service-Gebiet hinzugefügt',
    data: serviceArea,
  };

  res.status(201).json(response);
});

// Service-Gebiet entfernen
export const removeServiceArea = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { postalCode } = req.params;
  await walkerService.removeServiceArea(req.user.userId, postalCode!);

  const response: ApiResponse = {
    success: true,
    message: 'Service-Gebiet entfernt',
  };

  res.json(response);
});

// Verfügbarkeit setzen
export const setAvailability = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const availability = await walkerService.setAvailability(req.user.userId, req.body);

  const response: ApiResponse = {
    success: true,
    message: 'Verfügbarkeit gesetzt',
    data: availability,
  };

  res.json(response);
});

// Verfügbarkeit entfernen
export const removeAvailability = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { id } = req.params;
  await walkerService.removeAvailability(req.user.userId, id!);

  const response: ApiResponse = {
    success: true,
    message: 'Verfügbarkeit entfernt',
  };

  res.json(response);
});

// Walker-Statistiken abrufen
export const getStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const stats = await walkerService.getWalkerStats(req.user.userId);

  const response: ApiResponse = {
    success: true,
    data: stats,
  };

  res.json(response);
});

// Bewertung hinzufügen
export const addReview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { bookingId } = req.params;
  const review = await walkerService.addReview(bookingId!, req.user.userId, req.body);

  const response: ApiResponse = {
    success: true,
    message: 'Bewertung hinzugefügt',
    data: review,
  };

  res.status(201).json(response);
});
