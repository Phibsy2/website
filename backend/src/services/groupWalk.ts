import { GroupWalkStatus, Prisma } from '@prisma/client';
import { prisma } from './database.js';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  ConflictError
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import {
  CreateGroupWalkDto,
  JoinGroupWalkDto,
  PaginationParams
} from '../types/index.js';
import { calculateDistance, decimalToNumber } from './groupingAlgorithm.js';

// Gruppentermin erstellen
export async function createGroupWalk(walkerId: string, data: CreateGroupWalkDto) {
  // Walker-Profil abrufen
  const walkerProfile = await prisma.walkerProfile.findFirst({
    where: { userId: walkerId },
  });

  if (!walkerProfile) {
    throw new NotFoundError('Walker-Profil');
  }

  // Validierung: max Teilnehmer <= Walker's maxDogs
  if (data.maxParticipants > walkerProfile.maxDogs) {
    throw new ValidationError([{
      field: 'maxParticipants',
      message: `Maximale Teilnehmerzahl darf nicht über ${walkerProfile.maxDogs} liegen`,
    }]);
  }

  const groupWalk = await prisma.groupWalk.create({
    data: {
      walkerId: walkerProfile.id,
      title: data.title,
      description: data.description,
      meetingPoint: data.meetingPoint,
      meetingLat: data.meetingLat,
      meetingLng: data.meetingLng,
      scheduledDate: new Date(data.scheduledDate),
      duration: data.duration,
      maxParticipants: data.maxParticipants,
      pricePerDog: data.pricePerDog,
      status: GroupWalkStatus.OPEN,
    },
    include: {
      walker: { include: { user: true } },
    },
  });

  logger.info('Gruppentermin erstellt', { groupWalkId: groupWalk.id, walkerId });

  return groupWalk;
}

// Gruppentermin beitreten
export async function joinGroupWalk(
  groupWalkId: string,
  userId: string,
  data: JoinGroupWalkDto
) {
  // Gruppentermin prüfen
  const groupWalk = await prisma.groupWalk.findUnique({
    where: { id: groupWalkId },
    include: {
      dogs: true,
      participants: true,
    },
  });

  if (!groupWalk) {
    throw new NotFoundError('Gruppentermin');
  }

  if (groupWalk.status !== GroupWalkStatus.OPEN) {
    throw new ConflictError('Dieser Gruppentermin ist nicht mehr verfügbar');
  }

  // Kapazität prüfen
  const newDogCount = groupWalk.dogs.length + data.dogIds.length;
  if (newDogCount > groupWalk.maxParticipants) {
    throw new ConflictError(
      `Nicht genug Plätze verfügbar. Verfügbar: ${groupWalk.maxParticipants - groupWalk.dogs.length}`
    );
  }

  // Adresse validieren
  const address = await prisma.address.findFirst({
    where: { id: data.addressId, userId },
  });

  if (!address) {
    throw new NotFoundError('Adresse');
  }

  // Distanz zum Treffpunkt prüfen (max 5 km)
  if (address.latitude && address.longitude) {
    const distance = calculateDistance(
      decimalToNumber(address.latitude),
      decimalToNumber(address.longitude),
      decimalToNumber(groupWalk.meetingLat),
      decimalToNumber(groupWalk.meetingLng)
    );

    if (distance > 5) {
      throw new ValidationError([{
        field: 'addressId',
        message: `Die Adresse ist ${distance.toFixed(1)} km vom Treffpunkt entfernt (max. 5 km)`,
      }]);
    }
  }

  // Hunde validieren
  const dogs = await prisma.dog.findMany({
    where: { id: { in: data.dogIds }, ownerId: userId },
  });

  if (dogs.length !== data.dogIds.length) {
    throw new ValidationError([{
      field: 'dogIds',
      message: 'Einer oder mehrere Hunde wurden nicht gefunden',
    }]);
  }

  // Prüfen ob Hunde bereits teilnehmen
  const alreadyParticipating = await prisma.groupWalkDog.findFirst({
    where: {
      groupWalkId,
      dogId: { in: data.dogIds },
    },
  });

  if (alreadyParticipating) {
    throw new ConflictError('Ein oder mehrere Hunde nehmen bereits teil');
  }

  // Teilnahme hinzufügen
  await prisma.$transaction([
    // Teilnehmer hinzufügen
    prisma.groupWalkParticipant.upsert({
      where: {
        groupWalkId_addressId: {
          groupWalkId,
          addressId: data.addressId,
        },
      },
      create: {
        groupWalkId,
        addressId: data.addressId,
      },
      update: {},
    }),
    // Hunde hinzufügen
    prisma.groupWalkDog.createMany({
      data: data.dogIds.map(dogId => ({
        groupWalkId,
        dogId,
      })),
    }),
    // Zähler aktualisieren
    prisma.groupWalk.update({
      where: { id: groupWalkId },
      data: {
        currentParticipants: { increment: data.dogIds.length },
        status: newDogCount >= groupWalk.maxParticipants
          ? GroupWalkStatus.FULL
          : GroupWalkStatus.OPEN,
      },
    }),
  ]);

  // Aktualisierte Daten abrufen
  const updatedGroupWalk = await prisma.groupWalk.findUnique({
    where: { id: groupWalkId },
    include: {
      walker: { include: { user: true } },
      participants: { include: { address: true } },
      dogs: { include: { dog: { include: { owner: true } } } },
    },
  });

  logger.info('Teilnehmer zum Gruppentermin hinzugefügt', {
    groupWalkId,
    userId,
    dogCount: data.dogIds.length,
  });

  return updatedGroupWalk;
}

// Vom Gruppentermin abmelden
export async function leaveGroupWalk(
  groupWalkId: string,
  userId: string
) {
  const groupWalk = await prisma.groupWalk.findUnique({
    where: { id: groupWalkId },
    include: {
      dogs: { include: { dog: true } },
    },
  });

  if (!groupWalk) {
    throw new NotFoundError('Gruppentermin');
  }

  if (groupWalk.status === GroupWalkStatus.IN_PROGRESS ||
      groupWalk.status === GroupWalkStatus.COMPLETED) {
    throw new ConflictError('Abmeldung nicht mehr möglich');
  }

  // Hunde des Benutzers finden
  const userDogs = groupWalk.dogs.filter(d => d.dog.ownerId === userId);

  if (userDogs.length === 0) {
    throw new NotFoundError('Keine Teilnahme gefunden');
  }

  // Teilnahme entfernen
  await prisma.$transaction([
    prisma.groupWalkDog.deleteMany({
      where: {
        groupWalkId,
        dogId: { in: userDogs.map(d => d.dogId) },
      },
    }),
    prisma.groupWalk.update({
      where: { id: groupWalkId },
      data: {
        currentParticipants: { decrement: userDogs.length },
        status: GroupWalkStatus.OPEN,
      },
    }),
  ]);

  logger.info('Teilnehmer vom Gruppentermin abgemeldet', {
    groupWalkId,
    userId,
    dogCount: userDogs.length,
  });
}

// Gruppentermine abrufen (öffentlich)
export async function getGroupWalks(
  params: PaginationParams & {
    status?: string;
    walkerId?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
  } = {}
) {
  const {
    page = 1,
    limit = 10,
    sortBy = 'scheduledDate',
    sortOrder = 'asc',
    status,
    walkerId,
    latitude,
    longitude,
    radius = 10,
  } = params;

  const skip = (page - 1) * limit;

  const where: Prisma.GroupWalkWhereInput = {
    scheduledDate: { gte: new Date() },
    ...(status && { status: status as GroupWalkStatus }),
    ...(walkerId && { walkerId }),
  };

  let groupWalks = await prisma.groupWalk.findMany({
    where,
    include: {
      walker: { include: { user: true } },
      participants: { include: { address: true } },
      dogs: { include: { dog: true } },
    },
    orderBy: { [sortBy]: sortOrder },
  });

  // Nach Entfernung filtern wenn Koordinaten angegeben
  if (latitude && longitude) {
    groupWalks = groupWalks.filter(gw => {
      const distance = calculateDistance(
        latitude,
        longitude,
        decimalToNumber(gw.meetingLat),
        decimalToNumber(gw.meetingLng)
      );
      return distance <= radius;
    });
  }

  const total = groupWalks.length;
  const paginatedWalks = groupWalks.slice(skip, skip + limit);

  return {
    data: paginatedWalks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Einzelnen Gruppentermin abrufen
export async function getGroupWalkById(groupWalkId: string) {
  const groupWalk = await prisma.groupWalk.findUnique({
    where: { id: groupWalkId },
    include: {
      walker: { include: { user: true } },
      participants: { include: { address: true } },
      dogs: { include: { dog: { include: { owner: true } } } },
      bookings: true,
    },
  });

  if (!groupWalk) {
    throw new NotFoundError('Gruppentermin');
  }

  return groupWalk;
}

// Gruppentermin starten
export async function startGroupWalk(groupWalkId: string, walkerId: string) {
  const groupWalk = await prisma.groupWalk.findUnique({
    where: { id: groupWalkId },
    include: { walker: true },
  });

  if (!groupWalk) {
    throw new NotFoundError('Gruppentermin');
  }

  if (groupWalk.walker.userId !== walkerId) {
    throw new AuthorizationError('Nur der zugewiesene Walker kann den Termin starten');
  }

  if (groupWalk.status !== GroupWalkStatus.OPEN &&
      groupWalk.status !== GroupWalkStatus.FULL) {
    throw new ConflictError('Gruppentermin kann nicht gestartet werden');
  }

  const updated = await prisma.groupWalk.update({
    where: { id: groupWalkId },
    data: { status: GroupWalkStatus.IN_PROGRESS },
    include: {
      walker: { include: { user: true } },
      dogs: { include: { dog: true } },
    },
  });

  logger.info('Gruppentermin gestartet', { groupWalkId, walkerId });

  return updated;
}

// Gruppentermin abschließen
export async function completeGroupWalk(groupWalkId: string, walkerId: string) {
  const groupWalk = await prisma.groupWalk.findUnique({
    where: { id: groupWalkId },
    include: { walker: true },
  });

  if (!groupWalk) {
    throw new NotFoundError('Gruppentermin');
  }

  if (groupWalk.walker.userId !== walkerId) {
    throw new AuthorizationError('Nur der zugewiesene Walker kann den Termin abschließen');
  }

  if (groupWalk.status !== GroupWalkStatus.IN_PROGRESS) {
    throw new ConflictError('Nur laufende Termine können abgeschlossen werden');
  }

  const updated = await prisma.groupWalk.update({
    where: { id: groupWalkId },
    data: { status: GroupWalkStatus.COMPLETED },
    include: {
      walker: { include: { user: true } },
      dogs: { include: { dog: true } },
    },
  });

  logger.info('Gruppentermin abgeschlossen', { groupWalkId, walkerId });

  return updated;
}

// Gruppentermin absagen
export async function cancelGroupWalk(groupWalkId: string, userId: string, isAdmin: boolean) {
  const groupWalk = await prisma.groupWalk.findUnique({
    where: { id: groupWalkId },
    include: { walker: true },
  });

  if (!groupWalk) {
    throw new NotFoundError('Gruppentermin');
  }

  if (groupWalk.walker.userId !== userId && !isAdmin) {
    throw new AuthorizationError('Keine Berechtigung');
  }

  if (groupWalk.status === GroupWalkStatus.COMPLETED) {
    throw new ConflictError('Abgeschlossene Termine können nicht storniert werden');
  }

  const updated = await prisma.groupWalk.update({
    where: { id: groupWalkId },
    data: { status: GroupWalkStatus.CANCELLED },
    include: {
      walker: { include: { user: true } },
      dogs: { include: { dog: { include: { owner: true } } } },
    },
  });

  logger.info('Gruppentermin abgesagt', { groupWalkId, userId });

  // TODO: Benachrichtigung an alle Teilnehmer senden

  return updated;
}
