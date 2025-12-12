import { Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { prisma } from '../services/database.js';
import { NotFoundError } from '../utils/errors.js';

// Profil aktualisieren
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    message: 'Profil aktualisiert',
    data: user,
  };

  res.json(response);
});

// Adressen abrufen
export const getAddresses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const addresses = await prisma.address.findMany({
    where: { userId: req.user.userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  const response: ApiResponse = {
    success: true,
    data: addresses,
  };

  res.json(response);
});

// Adresse hinzufügen
export const addAddress = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  // Falls isDefault = true, alle anderen auf false setzen
  if (req.body.isDefault) {
    await prisma.address.updateMany({
      where: { userId: req.user.userId },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      userId: req.user.userId,
      ...req.body,
    },
  });

  const response: ApiResponse = {
    success: true,
    message: 'Adresse hinzugefügt',
    data: address,
  };

  res.status(201).json(response);
});

// Adresse aktualisieren
export const updateAddress = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { id } = req.params;

  const existing = await prisma.address.findFirst({
    where: { id, userId: req.user.userId },
  });

  if (!existing) {
    throw new NotFoundError('Adresse');
  }

  // Falls isDefault = true, alle anderen auf false setzen
  if (req.body.isDefault) {
    await prisma.address.updateMany({
      where: { userId: req.user.userId, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.update({
    where: { id },
    data: req.body,
  });

  const response: ApiResponse = {
    success: true,
    message: 'Adresse aktualisiert',
    data: address,
  };

  res.json(response);
});

// Adresse löschen
export const deleteAddress = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { id } = req.params;

  const existing = await prisma.address.findFirst({
    where: { id, userId: req.user.userId },
  });

  if (!existing) {
    throw new NotFoundError('Adresse');
  }

  await prisma.address.delete({ where: { id } });

  const response: ApiResponse = {
    success: true,
    message: 'Adresse gelöscht',
  };

  res.json(response);
});

// Hunde abrufen
export const getDogs = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const dogs = await prisma.dog.findMany({
    where: { ownerId: req.user.userId },
    orderBy: { createdAt: 'desc' },
  });

  const response: ApiResponse = {
    success: true,
    data: dogs,
  };

  res.json(response);
});

// Hund hinzufügen
export const addDog = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const dog = await prisma.dog.create({
    data: {
      ownerId: req.user.userId,
      ...req.body,
    },
  });

  const response: ApiResponse = {
    success: true,
    message: 'Hund hinzugefügt',
    data: dog,
  };

  res.status(201).json(response);
});

// Hund aktualisieren
export const updateDog = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { id } = req.params;

  const existing = await prisma.dog.findFirst({
    where: { id, ownerId: req.user.userId },
  });

  if (!existing) {
    throw new NotFoundError('Hund');
  }

  const dog = await prisma.dog.update({
    where: { id },
    data: req.body,
  });

  const response: ApiResponse = {
    success: true,
    message: 'Hund aktualisiert',
    data: dog,
  };

  res.json(response);
});

// Hund löschen
export const deleteDog = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { id } = req.params;

  const existing = await prisma.dog.findFirst({
    where: { id, ownerId: req.user.userId },
  });

  if (!existing) {
    throw new NotFoundError('Hund');
  }

  await prisma.dog.delete({ where: { id } });

  const response: ApiResponse = {
    success: true,
    message: 'Hund gelöscht',
  };

  res.json(response);
});

// Benachrichtigungen abrufen
export const getNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { page = 1, limit = 20, unreadOnly } = req.query;

  const where: any = { userId: req.user.userId };
  if (unreadOnly === 'true') {
    where.isRead = false;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.notification.count({ where }),
  ]);

  const response: ApiResponse = {
    success: true,
    data: notifications,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };

  res.json(response);
});

// Benachrichtigung als gelesen markieren
export const markNotificationRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  const { id } = req.params;

  await prisma.notification.updateMany({
    where: { id, userId: req.user.userId },
    data: { isRead: true },
  });

  const response: ApiResponse = {
    success: true,
    message: 'Benachrichtigung als gelesen markiert',
  };

  res.json(response);
});

// Alle Benachrichtigungen als gelesen markieren
export const markAllNotificationsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    return;
  }

  await prisma.notification.updateMany({
    where: { userId: req.user.userId, isRead: false },
    data: { isRead: true },
  });

  const response: ApiResponse = {
    success: true,
    message: 'Alle Benachrichtigungen als gelesen markiert',
  };

  res.json(response);
});
