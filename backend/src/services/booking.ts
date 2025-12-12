import { BookingStatus, Prisma } from '@prisma/client';
import { prisma } from './database.js';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  ConflictError
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import {
  CreateBookingDto,
  UpdateBookingDto,
  PaginationParams
} from '../types/index.js';
import {
  findOptimalGroups,
  BookingCandidate,
  decimalToNumber
} from './groupingAlgorithm.js';

// Buchung erstellen
export async function createBooking(customerId: string, data: CreateBookingDto) {
  // Adresse validieren
  const address = await prisma.address.findFirst({
    where: { id: data.addressId, userId: customerId },
  });

  if (!address) {
    throw new NotFoundError('Adresse');
  }

  // Hunde validieren
  const dogs = await prisma.dog.findMany({
    where: { id: { in: data.dogIds }, ownerId: customerId },
  });

  if (dogs.length !== data.dogIds.length) {
    throw new ValidationError([
      { field: 'dogIds', message: 'Einer oder mehrere Hunde wurden nicht gefunden' },
    ]);
  }

  // Prüfen ob alle Hunde geimpft sind
  const unvaccinatedDogs = dogs.filter(d => !d.isVaccinated);
  if (unvaccinatedDogs.length > 0) {
    throw new ValidationError([
      { field: 'dogIds', message: `Folgende Hunde sind nicht geimpft: ${unvaccinatedDogs.map(d => d.name).join(', ')}` },
    ]);
  }

  // Preis berechnen
  const basePrice = 15; // Basispreis pro Stunde
  const pricePerDog = 10; // Zusatzpreis pro Hund
  const hours = data.duration / 60;
  const totalPrice = (basePrice + (dogs.length - 1) * pricePerDog) * hours;

  // Buchung erstellen
  const booking = await prisma.booking.create({
    data: {
      customerId,
      addressId: data.addressId,
      scheduledDate: new Date(data.scheduledDate),
      duration: data.duration,
      totalPrice,
      notes: data.notes,
      walkerId: data.walkerId,
      status: data.walkerId ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
      dogs: {
        create: data.dogIds.map(dogId => ({ dogId })),
      },
    },
    include: {
      address: true,
      dogs: { include: { dog: true } },
      walker: { include: { user: true } },
      customer: true,
    },
  });

  logger.info('Neue Buchung erstellt', { bookingId: booking.id, customerId });

  return booking;
}

// Buchung aktualisieren
export async function updateBooking(
  bookingId: string,
  userId: string,
  userRole: string,
  data: UpdateBookingDto
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, walker: true },
  });

  if (!booking) {
    throw new NotFoundError('Buchung');
  }

  // Autorisierung prüfen
  const isOwner = booking.customerId === userId;
  const isAssignedWalker = booking.walker?.userId === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAssignedWalker && !isAdmin) {
    throw new AuthorizationError('Keine Berechtigung für diese Buchung');
  }

  // Statusübergänge validieren
  if (data.status) {
    validateStatusTransition(booking.status, data.status as BookingStatus, userRole);
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
      duration: data.duration,
      notes: data.notes,
      status: data.status as BookingStatus,
    },
    include: {
      address: true,
      dogs: { include: { dog: true } },
      walker: { include: { user: true } },
      customer: true,
    },
  });

  logger.info('Buchung aktualisiert', { bookingId, userId, changes: data });

  return updatedBooking;
}

// Status-Übergang validieren
function validateStatusTransition(
  currentStatus: BookingStatus,
  newStatus: BookingStatus,
  userRole: string
) {
  const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
    [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
    [BookingStatus.CONFIRMED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
    [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
    [BookingStatus.COMPLETED]: [],
    [BookingStatus.CANCELLED]: [],
  };

  if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
    if (userRole !== 'ADMIN') {
      throw new ValidationError([{
        field: 'status',
        message: `Übergang von ${currentStatus} zu ${newStatus} nicht erlaubt`,
      }]);
    }
  }
}

// Buchung stornieren
export async function cancelBooking(
  bookingId: string,
  userId: string,
  userRole: string,
  reason?: string
) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { walker: true },
  });

  if (!booking) {
    throw new NotFoundError('Buchung');
  }

  const isOwner = booking.customerId === userId;
  const isAssignedWalker = booking.walker?.userId === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAssignedWalker && !isAdmin) {
    throw new AuthorizationError('Keine Berechtigung für diese Buchung');
  }

  if (booking.status === BookingStatus.COMPLETED) {
    throw new ConflictError('Abgeschlossene Buchungen können nicht storniert werden');
  }

  if (booking.status === BookingStatus.CANCELLED) {
    throw new ConflictError('Buchung ist bereits storniert');
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BookingStatus.CANCELLED,
      cancellationReason: reason,
    },
    include: {
      address: true,
      dogs: { include: { dog: true } },
      walker: { include: { user: true } },
      customer: true,
    },
  });

  logger.info('Buchung storniert', { bookingId, userId, reason });

  return updatedBooking;
}

// Buchungen für Kunde abrufen
export async function getCustomerBookings(
  customerId: string,
  params: PaginationParams = {}
) {
  const { page = 1, limit = 10, sortBy = 'scheduledDate', sortOrder = 'desc' } = params;
  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { customerId },
      include: {
        address: true,
        dogs: { include: { dog: true } },
        walker: { include: { user: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where: { customerId } }),
  ]);

  return {
    data: bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Buchungen für Walker abrufen
export async function getWalkerBookings(
  walkerId: string,
  params: PaginationParams & { status?: string } = {}
) {
  const { page = 1, limit = 10, sortBy = 'scheduledDate', sortOrder = 'asc', status } = params;
  const skip = (page - 1) * limit;

  const where: Prisma.BookingWhereInput = {
    walkerId,
    ...(status && { status: status as BookingStatus }),
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        address: true,
        dogs: { include: { dog: true } },
        customer: true,
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    data: bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Buchung einem Walker zuweisen
export async function assignWalker(bookingId: string, walkerId: string) {
  const [booking, walkerProfile] = await Promise.all([
    prisma.booking.findUnique({
      where: { id: bookingId },
      include: { dogs: true, address: true },
    }),
    prisma.walkerProfile.findUnique({
      where: { id: walkerId },
    }),
  ]);

  if (!booking) {
    throw new NotFoundError('Buchung');
  }

  if (!walkerProfile) {
    throw new NotFoundError('Walker-Profil');
  }

  if (!walkerProfile.isAvailable) {
    throw new ConflictError('Walker ist derzeit nicht verfügbar');
  }

  // Prüfen ob Walker genug Kapazität hat
  if (booking.dogs.length > walkerProfile.maxDogs) {
    throw new ValidationError([{
      field: 'walkerId',
      message: `Walker kann maximal ${walkerProfile.maxDogs} Hunde gleichzeitig führen`,
    }]);
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      walkerId,
      status: BookingStatus.CONFIRMED,
    },
    include: {
      address: true,
      dogs: { include: { dog: true } },
      walker: { include: { user: true } },
      customer: true,
    },
  });

  logger.info('Walker zugewiesen', { bookingId, walkerId });

  return updatedBooking;
}

// Gruppierungsvorschläge für ausstehende Buchungen
export async function getGroupingSuggestions(walkerId?: string) {
  // Hole alle ausstehenden Buchungen ohne Gruppenzuweisung
  const where: Prisma.BookingWhereInput = {
    status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    groupWalkId: null,
    scheduledDate: { gte: new Date() },
  };

  if (walkerId) {
    where.walkerId = walkerId;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      address: true,
      dogs: true,
    },
  });

  // Konvertiere zu Kandidaten für den Algorithmus
  const candidates: BookingCandidate[] = bookings
    .filter(b => b.address.latitude && b.address.longitude)
    .map(b => ({
      id: b.id,
      customerId: b.customerId,
      addressId: b.addressId,
      latitude: decimalToNumber(b.address.latitude),
      longitude: decimalToNumber(b.address.longitude),
      scheduledDate: b.scheduledDate,
      duration: b.duration,
      dogCount: b.dogs.length,
      dogIds: b.dogs.map(d => d.dogId),
      postalCode: b.address.postalCode,
    }));

  // Finde optimale Gruppierungen
  const suggestions = findOptimalGroups(candidates);

  return suggestions;
}

// Einzelne Buchung abrufen
export async function getBookingById(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      address: true,
      dogs: { include: { dog: true } },
      walker: { include: { user: true } },
      customer: true,
      groupWalk: true,
      review: true,
    },
  });

  if (!booking) {
    throw new NotFoundError('Buchung');
  }

  return booking;
}
