/**
 * Intelligenter Terminzusammenlegungs-Algorithmus
 *
 * Dieser Algorithmus gruppiert Buchungen basierend auf:
 * 1. Geografische Nähe (Adressen im gleichen Radius)
 * 2. Zeitliche Kompatibilität (überlappende Zeitfenster)
 * 3. Kapazität des Walkers (maximale Hundeanzahl)
 * 4. Optimierung der Gesamtdistanz
 */

import { Decimal } from '@prisma/client/runtime/library';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Typen für den Algorithmus
export interface BookingCandidate {
  id: string;
  customerId: string;
  addressId: string;
  latitude: number;
  longitude: number;
  scheduledDate: Date;
  duration: number;
  dogCount: number;
  dogIds: string[];
  postalCode: string;
}

export interface GroupSuggestion {
  bookings: BookingCandidate[];
  centroid: { latitude: number; longitude: number };
  meetingPoint: { latitude: number; longitude: number; address: string };
  totalDistance: number;
  timeWindow: { start: Date; end: Date };
  totalDogs: number;
  estimatedSavings: number;
  score: number;
}

export interface GroupingOptions {
  maxRadiusKm?: number;
  timeWindowMinutes?: number;
  maxDogsPerGroup?: number;
  walkerId?: string;
}

// Haversine-Formel für Distanzberechnung zwischen zwei Koordinaten
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Erdradius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Zentroid (geografischer Mittelpunkt) einer Gruppe berechnen
export function calculateCentroid(
  bookings: BookingCandidate[]
): { latitude: number; longitude: number } {
  if (bookings.length === 0) {
    throw new Error('Keine Buchungen für Zentroid-Berechnung');
  }

  const sumLat = bookings.reduce((sum, b) => sum + b.latitude, 0);
  const sumLon = bookings.reduce((sum, b) => sum + b.longitude, 0);

  return {
    latitude: sumLat / bookings.length,
    longitude: sumLon / bookings.length,
  };
}

// Optimalen Treffpunkt basierend auf allen Adressen berechnen
export function findOptimalMeetingPoint(
  bookings: BookingCandidate[]
): { latitude: number; longitude: number } {
  // Verwende den Medioid (die Adresse mit der geringsten Gesamtdistanz zu allen anderen)
  let minTotalDistance = Infinity;
  let optimalPoint = { latitude: bookings[0]!.latitude, longitude: bookings[0]!.longitude };

  for (const candidate of bookings) {
    let totalDistance = 0;

    for (const other of bookings) {
      totalDistance += calculateDistance(
        candidate.latitude,
        candidate.longitude,
        other.latitude,
        other.longitude
      );
    }

    if (totalDistance < minTotalDistance) {
      minTotalDistance = totalDistance;
      optimalPoint = { latitude: candidate.latitude, longitude: candidate.longitude };
    }
  }

  return optimalPoint;
}

// Prüfen ob zwei Buchungen zeitlich kompatibel sind
export function areTimeCompatible(
  booking1: BookingCandidate,
  booking2: BookingCandidate,
  windowMinutes: number
): boolean {
  const time1 = booking1.scheduledDate.getTime();
  const time2 = booking2.scheduledDate.getTime();
  const windowMs = windowMinutes * 60 * 1000;

  return Math.abs(time1 - time2) <= windowMs;
}

// Zeitfenster für eine Gruppe berechnen
export function calculateTimeWindow(
  bookings: BookingCandidate[]
): { start: Date; end: Date } {
  const times = bookings.map(b => b.scheduledDate.getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  // Das Zeitfenster beginnt beim frühesten Termin
  // und endet beim spätesten Termin + dessen Dauer
  const latestBooking = bookings.find(b => b.scheduledDate.getTime() === maxTime)!;

  return {
    start: new Date(minTime),
    end: new Date(maxTime + latestBooking.duration * 60 * 1000),
  };
}

// Gesamtdistanz für eine Gruppe berechnen (Summe aller Distanzen zum Treffpunkt)
export function calculateTotalDistance(
  bookings: BookingCandidate[],
  meetingPoint: { latitude: number; longitude: number }
): number {
  return bookings.reduce((total, booking) => {
    return total + calculateDistance(
      booking.latitude,
      booking.longitude,
      meetingPoint.latitude,
      meetingPoint.longitude
    );
  }, 0);
}

// Geschätzte Ersparnis berechnen (Zeit und Kosten)
export function calculateEstimatedSavings(
  bookings: BookingCandidate[],
  baseRatePerHour: number = 15
): number {
  if (bookings.length <= 1) return 0;

  // Einzeltermine würden mehr Zeit/Kosten brauchen
  const individualTime = bookings.reduce((sum, b) => sum + b.duration, 0);

  // Gruppentermin spart etwa 30% Zeit pro zusätzlichem Hund
  const groupTime = bookings[0]!.duration + (bookings.length - 1) * 0.3 * bookings[0]!.duration;

  const timeSaved = individualTime - groupTime;
  return (timeSaved / 60) * baseRatePerHour;
}

// Bewertung einer Gruppe (höher = besser)
export function scoreGroup(
  bookings: BookingCandidate[],
  meetingPoint: { latitude: number; longitude: number },
  maxRadius: number
): number {
  if (bookings.length < 2) return 0;

  // Faktoren für die Bewertung
  const distanceFactor = 1 - (calculateTotalDistance(bookings, meetingPoint) / (maxRadius * bookings.length));
  const sizeFactor = Math.min(bookings.length / 4, 1); // Optimal bei 4 Buchungen
  const savingsFactor = calculateEstimatedSavings(bookings) / 50; // Normalisiert auf ~50€ max

  // Gewichtete Summe
  return (distanceFactor * 0.4 + sizeFactor * 0.3 + savingsFactor * 0.3) * 100;
}

// Hauptalgorithmus: Finde optimale Gruppierungen
export function findOptimalGroups(
  bookings: BookingCandidate[],
  options: GroupingOptions = {}
): GroupSuggestion[] {
  const {
    maxRadiusKm = config.GROUP_WALK_MAX_RADIUS_KM,
    timeWindowMinutes = config.GROUP_WALK_TIME_WINDOW_MINUTES,
    maxDogsPerGroup = 6,
  } = options;

  logger.info('Starte Gruppierungsalgorithmus', {
    bookingCount: bookings.length,
    maxRadiusKm,
    timeWindowMinutes,
    maxDogsPerGroup,
  });

  if (bookings.length < 2) {
    return [];
  }

  const groups: GroupSuggestion[] = [];
  const usedBookingIds = new Set<string>();

  // Sortiere Buchungen nach Zeit
  const sortedBookings = [...bookings].sort(
    (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()
  );

  // Greedy-Algorithmus: Für jede ungruppierte Buchung, finde beste Gruppe
  for (const anchor of sortedBookings) {
    if (usedBookingIds.has(anchor.id)) continue;

    // Finde alle kompatiblen Buchungen
    const compatible: BookingCandidate[] = [anchor];
    let totalDogs = anchor.dogCount;

    for (const candidate of sortedBookings) {
      if (candidate.id === anchor.id || usedBookingIds.has(candidate.id)) continue;

      // Prüfe Zeitkompatibilität
      if (!areTimeCompatible(anchor, candidate, timeWindowMinutes)) continue;

      // Prüfe Distanz zum Anker
      const distance = calculateDistance(
        anchor.latitude,
        anchor.longitude,
        candidate.latitude,
        candidate.longitude
      );

      if (distance > maxRadiusKm) continue;

      // Prüfe Kapazität
      if (totalDogs + candidate.dogCount > maxDogsPerGroup) continue;

      // Prüfe Distanz zu allen anderen in der Gruppe
      let withinRadius = true;
      for (const existing of compatible) {
        const distToExisting = calculateDistance(
          candidate.latitude,
          candidate.longitude,
          existing.latitude,
          existing.longitude
        );
        if (distToExisting > maxRadiusKm * 1.5) {
          withinRadius = false;
          break;
        }
      }

      if (withinRadius) {
        compatible.push(candidate);
        totalDogs += candidate.dogCount;
      }
    }

    // Nur Gruppen mit mindestens 2 Buchungen erstellen
    if (compatible.length >= 2) {
      const meetingPoint = findOptimalMeetingPoint(compatible);
      const centroid = calculateCentroid(compatible);
      const totalDistance = calculateTotalDistance(compatible, meetingPoint);
      const timeWindow = calculateTimeWindow(compatible);
      const estimatedSavings = calculateEstimatedSavings(compatible);
      const score = scoreGroup(compatible, meetingPoint, maxRadiusKm);

      groups.push({
        bookings: compatible,
        centroid,
        meetingPoint: {
          ...meetingPoint,
          address: '', // Wird später durch Geocoding aufgelöst
        },
        totalDistance,
        timeWindow,
        totalDogs,
        estimatedSavings,
        score,
      });

      // Markiere alle Buchungen als verwendet
      compatible.forEach(b => usedBookingIds.add(b.id));
    }
  }

  // Sortiere Gruppen nach Score (beste zuerst)
  groups.sort((a, b) => b.score - a.score);

  logger.info('Gruppierungsalgorithmus abgeschlossen', {
    foundGroups: groups.length,
    groupedBookings: usedBookingIds.size,
    remainingBookings: bookings.length - usedBookingIds.size,
  });

  return groups;
}

// Erweiterte Gruppierung mit K-Means Clustering
export function clusterBookings(
  bookings: BookingCandidate[],
  k: number = 3,
  maxIterations: number = 100
): BookingCandidate[][] {
  if (bookings.length <= k) {
    return bookings.map(b => [b]);
  }

  // Initialisiere Zentroide zufällig
  const centroids: { latitude: number; longitude: number }[] = [];
  const shuffled = [...bookings].sort(() => Math.random() - 0.5);

  for (let i = 0; i < k; i++) {
    centroids.push({
      latitude: shuffled[i]!.latitude,
      longitude: shuffled[i]!.longitude,
    });
  }

  let clusters: BookingCandidate[][] = [];
  let iterations = 0;

  while (iterations < maxIterations) {
    // Weise jede Buchung dem nächsten Zentroid zu
    const newClusters: BookingCandidate[][] = Array.from({ length: k }, () => []);

    for (const booking of bookings) {
      let minDist = Infinity;
      let closestCluster = 0;

      for (let i = 0; i < k; i++) {
        const dist = calculateDistance(
          booking.latitude,
          booking.longitude,
          centroids[i]!.latitude,
          centroids[i]!.longitude
        );

        if (dist < minDist) {
          minDist = dist;
          closestCluster = i;
        }
      }

      newClusters[closestCluster]!.push(booking);
    }

    // Aktualisiere Zentroide
    let converged = true;

    for (let i = 0; i < k; i++) {
      if (newClusters[i]!.length === 0) continue;

      const newCentroid = calculateCentroid(newClusters[i]!);
      const movement = calculateDistance(
        centroids[i]!.latitude,
        centroids[i]!.longitude,
        newCentroid.latitude,
        newCentroid.longitude
      );

      if (movement > 0.01) {
        converged = false;
      }

      centroids[i] = newCentroid;
    }

    clusters = newClusters;
    iterations++;

    if (converged) break;
  }

  logger.debug('K-Means Clustering abgeschlossen', { iterations, clusters: clusters.length });

  return clusters.filter(c => c.length > 0);
}

// Tagesplanung optimieren: Beste Route durch alle Termine
export function optimizeRoute(
  bookings: BookingCandidate[],
  startPoint?: { latitude: number; longitude: number }
): BookingCandidate[] {
  if (bookings.length <= 2) return bookings;

  // Nearest Neighbor Heuristik
  const route: BookingCandidate[] = [];
  const remaining = new Set(bookings);

  // Starte beim Start punkt oder ersten Termin
  let current = startPoint
    ? { latitude: startPoint.latitude, longitude: startPoint.longitude }
    : { latitude: bookings[0]!.latitude, longitude: bookings[0]!.longitude };

  while (remaining.size > 0) {
    let nearest: BookingCandidate | null = null;
    let minDist = Infinity;

    for (const booking of remaining) {
      const dist = calculateDistance(
        current.latitude,
        current.longitude,
        booking.latitude,
        booking.longitude
      );

      if (dist < minDist) {
        minDist = dist;
        nearest = booking;
      }
    }

    if (nearest) {
      route.push(nearest);
      remaining.delete(nearest);
      current = { latitude: nearest.latitude, longitude: nearest.longitude };
    }
  }

  return route;
}

// Konvertiere Prisma Decimal zu number
export function decimalToNumber(value: Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}
