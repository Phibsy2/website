import { Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, ApiResponse, DashboardStats } from '../types/index.js';
import { prisma } from '../services/database.js';
import { NotFoundError } from '../utils/errors.js';
import { decimalToNumber } from '../services/groupingAlgorithm.js';

// Dashboard-Statistiken abrufen
export const getDashboardStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const [
    totalBookings,
    pendingBookings,
    completedBookings,
    revenueData,
    avgRating,
    activeWalkers,
    totalCustomers,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: 'PENDING' } }),
    prisma.booking.count({ where: { status: 'COMPLETED' } }),
    prisma.booking.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { totalPrice: true },
    }),
    prisma.walkerProfile.aggregate({ _avg: { rating: true } }),
    prisma.walkerProfile.count({ where: { isAvailable: true } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
  ]);

  const stats: DashboardStats = {
    totalBookings,
    pendingBookings,
    completedBookings,
    totalRevenue: decimalToNumber(revenueData._sum.totalPrice),
    averageRating: decimalToNumber(avgRating._avg.rating),
    activeWalkers,
    totalCustomers,
  };

  const response: ApiResponse = {
    success: true,
    data: stats,
  };

  res.json(response);
});

// Alle Benutzer auflisten
export const getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page = 1, limit = 20, role, search, isActive } = req.query;

  const where: any = {};

  if (role) {
    where.role = role;
  }

  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  if (search) {
    where.OR = [
      { email: { contains: search as string, mode: 'insensitive' } },
      { firstName: { contains: search as string, mode: 'insensitive' } },
      { lastName: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
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
        _count: {
          select: {
            bookingsAsCustomer: true,
            dogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.user.count({ where }),
  ]);

  const response: ApiResponse = {
    success: true,
    data: users,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };

  res.json(response);
});

// Benutzer aktivieren/deaktivieren
export const toggleUserStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new NotFoundError('Benutzer');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    message: `Benutzer ${updated.isActive ? 'aktiviert' : 'deaktiviert'}`,
    data: updated,
  };

  res.json(response);
});

// Alle Buchungen auflisten
export const getAllBookings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page = 1, limit = 20, status, walkerId, customerId, from, to } = req.query;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (walkerId) {
    where.walkerId = walkerId;
  }

  if (customerId) {
    where.customerId = customerId;
  }

  if (from || to) {
    where.scheduledDate = {};
    if (from) where.scheduledDate.gte = new Date(from as string);
    if (to) where.scheduledDate.lte = new Date(to as string);
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        walker: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        address: true,
        dogs: { include: { dog: true } },
      },
      orderBy: { scheduledDate: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.booking.count({ where }),
  ]);

  const response: ApiResponse = {
    success: true,
    data: bookings,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };

  res.json(response);
});

// Buchung einem Walker zuweisen (Admin)
export const assignBookingToWalker = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { walkerId } = req.body;

  const [booking, walkerProfile] = await Promise.all([
    prisma.booking.findUnique({ where: { id } }),
    prisma.walkerProfile.findUnique({ where: { id: walkerId } }),
  ]);

  if (!booking) {
    throw new NotFoundError('Buchung');
  }

  if (!walkerProfile) {
    throw new NotFoundError('Walker');
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      walkerId,
      status: 'CONFIRMED',
    },
    include: {
      customer: { select: { firstName: true, lastName: true, email: true } },
      walker: { include: { user: { select: { firstName: true, lastName: true } } } },
      address: true,
    },
  });

  const response: ApiResponse = {
    success: true,
    message: 'Walker zugewiesen',
    data: updated,
  };

  res.json(response);
});

// Alle Walker auflisten (Admin-Ansicht)
export const getAllWalkers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page = 1, limit = 20, isAvailable } = req.query;

  const where: any = {};

  if (isAvailable !== undefined) {
    where.isAvailable = isAvailable === 'true';
  }

  const [walkers, total] = await Promise.all([
    prisma.walkerProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            isActive: true,
          },
        },
        serviceAreas: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
            groupWalks: true,
          },
        },
      },
      orderBy: { rating: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.walkerProfile.count({ where }),
  ]);

  const response: ApiResponse = {
    success: true,
    data: walkers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };

  res.json(response);
});

// Systemkonfiguration abrufen
export const getSystemConfig = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const configs = await prisma.systemConfig.findMany();

  const configMap = configs.reduce((acc, c) => {
    acc[c.key] = c.value;
    return acc;
  }, {} as Record<string, string>);

  const response: ApiResponse = {
    success: true,
    data: configMap,
  };

  res.json(response);
});

// Systemkonfiguration aktualisieren
export const updateSystemConfig = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { key, value, description } = req.body;

  const config = await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value, description },
    update: { value, description },
  });

  const response: ApiResponse = {
    success: true,
    message: 'Konfiguration aktualisiert',
    data: config,
  };

  res.json(response);
});

// Alle Gruppentermine auflisten (Admin)
export const getAllGroupWalks = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page = 1, limit = 20, status, walkerId } = req.query;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (walkerId) {
    where.walkerId = walkerId;
  }

  const [groupWalks, total] = await Promise.all([
    prisma.groupWalk.findMany({
      where,
      include: {
        walker: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        _count: {
          select: {
            participants: true,
            dogs: true,
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.groupWalk.count({ where }),
  ]);

  const response: ApiResponse = {
    success: true,
    data: groupWalks,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };

  res.json(response);
});

// Umsatz-Report generieren
export const getRevenueReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { from, to, groupBy = 'day' } = req.query;

  const startDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = to ? new Date(to as string) : new Date();

  const bookings = await prisma.booking.findMany({
    where: {
      status: 'COMPLETED',
      scheduledDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      totalPrice: true,
      scheduledDate: true,
    },
    orderBy: { scheduledDate: 'asc' },
  });

  // Gruppiere nach Tag/Woche/Monat
  const groupedData: Record<string, number> = {};

  bookings.forEach(booking => {
    let key: string;
    const date = booking.scheduledDate;

    switch (groupBy) {
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0]!;
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default: // day
        key = date.toISOString().split('T')[0]!;
    }

    groupedData[key] = (groupedData[key] || 0) + decimalToNumber(booking.totalPrice);
  });

  const response: ApiResponse = {
    success: true,
    data: {
      period: { from: startDate, to: endDate },
      groupBy,
      data: Object.entries(groupedData).map(([date, revenue]) => ({ date, revenue })),
      total: Object.values(groupedData).reduce((sum, v) => sum + v, 0),
    },
  };

  res.json(response);
});
