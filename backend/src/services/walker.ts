import { Prisma } from '@prisma/client';
import { prisma } from './database.js';
import {
  NotFoundError,
  ConflictError,
  ValidationError
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import {
  CreateWalkerProfileDto,
  UpdateWalkerProfileDto,
  PaginationParams,
  WalkerStats
} from '../types/index.js';
import { calculateDistance, decimalToNumber } from './groupingAlgorithm.js';

// Walker-Profil erstellen
export async function createWalkerProfile(userId: string, data: CreateWalkerProfileDto) {
  // Prüfen ob bereits ein Profil existiert
  const existingProfile = await prisma.walkerProfile.findUnique({
    where: { userId },
  });

  if (existingProfile) {
    throw new ConflictError('Walker-Profil existiert bereits');
  }

  const profile = await prisma.walkerProfile.create({
    data: {
      userId,
      bio: data.bio,
      experience: data.experience ?? 0,
      maxDogs: data.maxDogs ?? 4,
      hourlyRate: data.hourlyRate,
      serviceRadius: data.serviceRadius ?? 5,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  });

  // Benutzerrolle auf WALKER setzen
  await prisma.user.update({
    where: { id: userId },
    data: { role: 'WALKER' },
  });

  logger.info('Walker-Profil erstellt', { userId, profileId: profile.id });

  return profile;
}

// Walker-Profil aktualisieren
export async function updateWalkerProfile(userId: string, data: UpdateWalkerProfileDto) {
  const profile = await prisma.walkerProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new NotFoundError('Walker-Profil');
  }

  const updated = await prisma.walkerProfile.update({
    where: { userId },
    data: {
      bio: data.bio,
      experience: data.experience,
      maxDogs: data.maxDogs,
      hourlyRate: data.hourlyRate,
      serviceRadius: data.serviceRadius,
      isAvailable: data.isAvailable,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      serviceAreas: true,
      availabilities: true,
    },
  });

  logger.info('Walker-Profil aktualisiert', { userId, profileId: profile.id });

  return updated;
}

// Walker-Profil per User ID abrufen
export async function getWalkerProfile(userId: string) {
  const profile = await prisma.walkerProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      serviceAreas: true,
      availabilities: true,
      reviews: {
        include: {
          booking: {
            include: {
              customer: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!profile) {
    throw new NotFoundError('Walker-Profil');
  }

  return profile;
}

// Alle Walker abrufen (mit Filtern)
export async function getWalkers(
  params: PaginationParams & {
    available?: boolean;
    minRating?: number;
    maxRate?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
  } = {}
) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'rating',
    sortOrder = 'desc',
    available,
    minRating,
    maxRate,
    latitude,
    longitude,
    radius = 10,
  } = params;

  const skip = (page - 1) * limit;

  const where: Prisma.WalkerProfileWhereInput = {
    ...(available !== undefined && { isAvailable: available }),
    ...(minRating && { rating: { gte: minRating } }),
    ...(maxRate && { hourlyRate: { lte: maxRate } }),
    user: { isActive: true },
  };

  let walkers = await prisma.walkerProfile.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      serviceAreas: true,
    },
    orderBy: { [sortBy]: sortOrder },
  });

  // Nach Service-Gebiet filtern wenn Koordinaten angegeben
  if (latitude && longitude) {
    walkers = walkers.filter(walker => {
      // Prüfen ob Walker Service-Gebiete in der Nähe hat
      return walker.serviceAreas.some(area => {
        const distance = calculateDistance(
          latitude,
          longitude,
          decimalToNumber(area.latitude),
          decimalToNumber(area.longitude)
        );
        return distance <= radius && distance <= walker.serviceRadius;
      });
    });
  }

  const total = walkers.length;
  const paginatedWalkers = walkers.slice(skip, skip + limit);

  return {
    data: paginatedWalkers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Service-Gebiet hinzufügen
export async function addServiceArea(
  userId: string,
  data: { postalCode: string; city: string; latitude: number; longitude: number }
) {
  const profile = await prisma.walkerProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new NotFoundError('Walker-Profil');
  }

  const serviceArea = await prisma.serviceArea.upsert({
    where: {
      walkerProfileId_postalCode: {
        walkerProfileId: profile.id,
        postalCode: data.postalCode,
      },
    },
    create: {
      walkerProfileId: profile.id,
      ...data,
    },
    update: {
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
    },
  });

  logger.info('Service-Gebiet hinzugefügt', { userId, postalCode: data.postalCode });

  return serviceArea;
}

// Service-Gebiet entfernen
export async function removeServiceArea(userId: string, postalCode: string) {
  const profile = await prisma.walkerProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new NotFoundError('Walker-Profil');
  }

  await prisma.serviceArea.delete({
    where: {
      walkerProfileId_postalCode: {
        walkerProfileId: profile.id,
        postalCode,
      },
    },
  });

  logger.info('Service-Gebiet entfernt', { userId, postalCode });
}

// Verfügbarkeit setzen
export async function setAvailability(
  userId: string,
  data: { dayOfWeek: number; startTime: string; endTime: string; isActive?: boolean }
) {
  const profile = await prisma.walkerProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new NotFoundError('Walker-Profil');
  }

  // Zeitvalidierung
  const [startHour, startMin] = data.startTime.split(':').map(Number);
  const [endHour, endMin] = data.endTime.split(':').map(Number);
  const startMinutes = startHour! * 60 + startMin!;
  const endMinutes = endHour! * 60 + endMin!;

  if (endMinutes <= startMinutes) {
    throw new ValidationError([{
      field: 'endTime',
      message: 'Endzeit muss nach Startzeit liegen',
    }]);
  }

  const availability = await prisma.walkerAvailability.upsert({
    where: {
      walkerProfileId_dayOfWeek_startTime_endTime: {
        walkerProfileId: profile.id,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    },
    create: {
      walkerProfileId: profile.id,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      isActive: data.isActive ?? true,
    },
    update: {
      isActive: data.isActive ?? true,
    },
  });

  return availability;
}

// Verfügbarkeit entfernen
export async function removeAvailability(
  userId: string,
  availabilityId: string
) {
  const profile = await prisma.walkerProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new NotFoundError('Walker-Profil');
  }

  const availability = await prisma.walkerAvailability.findFirst({
    where: {
      id: availabilityId,
      walkerProfileId: profile.id,
    },
  });

  if (!availability) {
    throw new NotFoundError('Verfügbarkeit');
  }

  await prisma.walkerAvailability.delete({
    where: { id: availabilityId },
  });
}

// Walker-Statistiken abrufen
export async function getWalkerStats(userId: string): Promise<WalkerStats> {
  const profile = await prisma.walkerProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new NotFoundError('Walker-Profil');
  }

  const [totalWalks, upcomingWalks, earnings] = await Promise.all([
    prisma.booking.count({
      where: {
        walkerId: profile.id,
        status: 'COMPLETED',
      },
    }),
    prisma.booking.count({
      where: {
        walkerId: profile.id,
        status: { in: ['CONFIRMED', 'PENDING'] },
        scheduledDate: { gte: new Date() },
      },
    }),
    prisma.booking.aggregate({
      where: {
        walkerId: profile.id,
        status: 'COMPLETED',
      },
      _sum: { totalPrice: true },
    }),
  ]);

  return {
    totalWalks,
    upcomingWalks,
    totalEarnings: decimalToNumber(earnings._sum.totalPrice),
    averageRating: decimalToNumber(profile.rating),
    totalReviews: profile.totalReviews,
  };
}

// Bewertung hinzufügen
export async function addReview(
  bookingId: string,
  userId: string,
  data: { rating: number; comment?: string }
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { review: true, walker: true },
  });

  if (!booking) {
    throw new NotFoundError('Buchung');
  }

  if (booking.customerId !== userId) {
    throw new ValidationError([{
      field: 'bookingId',
      message: 'Nur der Kunde kann eine Bewertung abgeben',
    }]);
  }

  if (booking.status !== 'COMPLETED') {
    throw new ValidationError([{
      field: 'bookingId',
      message: 'Nur abgeschlossene Buchungen können bewertet werden',
    }]);
  }

  if (booking.review) {
    throw new ConflictError('Diese Buchung wurde bereits bewertet');
  }

  if (!booking.walkerId) {
    throw new ValidationError([{
      field: 'bookingId',
      message: 'Keine Walker-Zuweisung für diese Buchung',
    }]);
  }

  // Bewertung erstellen
  const review = await prisma.review.create({
    data: {
      bookingId,
      walkerId: booking.walkerId,
      rating: data.rating,
      comment: data.comment,
    },
  });

  // Walker-Rating aktualisieren
  const walkerReviews = await prisma.review.findMany({
    where: { walkerId: booking.walkerId },
  });

  const avgRating = walkerReviews.reduce((sum, r) => sum + r.rating, 0) / walkerReviews.length;

  await prisma.walkerProfile.update({
    where: { id: booking.walkerId },
    data: {
      rating: avgRating,
      totalReviews: walkerReviews.length,
    },
  });

  logger.info('Bewertung hinzugefügt', {
    bookingId,
    walkerId: booking.walkerId,
    rating: data.rating,
  });

  return review;
}
