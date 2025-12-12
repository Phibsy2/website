import { Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import * as bookingService from '../services/booking.js';

// Buchung erstellen
export const createBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const booking = await bookingService.createBooking(req.user.userId, req.body);

  const response: ApiResponse = {
    success: true,
    message: 'Buchung erstellt',
    data: booking,
  };

  res.status(201).json(response);
});

// Buchung aktualisieren
export const updateBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { id } = req.params;
  const booking = await bookingService.updateBooking(
    id!,
    req.user.userId,
    req.user.role,
    req.body
  );

  const response: ApiResponse = {
    success: true,
    message: 'Buchung aktualisiert',
    data: booking,
  };

  res.json(response);
});

// Buchung stornieren
export const cancelBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { id } = req.params;
  const { reason } = req.body;

  const booking = await bookingService.cancelBooking(
    id!,
    req.user.userId,
    req.user.role,
    reason
  );

  const response: ApiResponse = {
    success: true,
    message: 'Buchung storniert',
    data: booking,
  };

  res.json(response);
});

// Eigene Buchungen abrufen (Kunde)
export const getMyBookings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { page, limit, sortBy, sortOrder } = req.query;

  const result = await bookingService.getCustomerBookings(req.user.userId, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy as string,
    sortOrder: sortOrder as 'asc' | 'desc',
  });

  const response: ApiResponse = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.json(response);
});

// Walker-Buchungen abrufen
export const getWalkerBookings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { page, limit, sortBy, sortOrder, status } = req.query;

  // Walker-Profil ID abrufen
  const { prisma } = await import('../services/database.js');
  const profile = await prisma.walkerProfile.findUnique({
    where: { userId: req.user.userId },
  });

  if (!profile) {
    res.status(404).json({ success: false, message: 'Walker-Profil nicht gefunden' });
    return;
  }

  const result = await bookingService.getWalkerBookings(profile.id, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy as string,
    sortOrder: sortOrder as 'asc' | 'desc',
    status: status as string,
  });

  const response: ApiResponse = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  res.json(response);
});

// Einzelne Buchung abrufen
export const getBooking = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { id } = req.params;
  const booking = await bookingService.getBookingById(id!);

  // Autorisierung prüfen
  const isOwner = booking.customerId === req.user.userId;
  const isWalker = booking.walker?.userId === req.user.userId;
  const isAdmin = req.user.role === 'ADMIN';

  if (!isOwner && !isWalker && !isAdmin) {
    res.status(403).json({ success: false, message: 'Keine Berechtigung' });
    return;
  }

  const response: ApiResponse = {
    success: true,
    data: booking,
  };

  res.json(response);
});

// Walker zuweisen
export const assignWalker = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { walkerId } = req.body;

  const booking = await bookingService.assignWalker(id!, walkerId);

  const response: ApiResponse = {
    success: true,
    message: 'Walker zugewiesen',
    data: booking,
  };

  res.json(response);
});

// Gruppierungsvorschläge abrufen
export const getGroupingSuggestions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { walkerId } = req.query;

  const suggestions = await bookingService.getGroupingSuggestions(walkerId as string);

  const response: ApiResponse = {
    success: true,
    data: suggestions,
  };

  res.json(response);
});
