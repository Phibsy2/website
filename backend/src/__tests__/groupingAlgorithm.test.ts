import {
  calculateDistance,
  calculateCentroid,
  findOptimalMeetingPoint,
  areTimeCompatible,
  calculateTimeWindow,
  findOptimalGroups,
  BookingCandidate,
} from '../services/groupingAlgorithm';

describe('Grouping Algorithm', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // Berlin to Potsdam (approximately 27 km)
      const distance = calculateDistance(52.5200, 13.4050, 52.3906, 13.0645);
      expect(distance).toBeGreaterThan(25);
      expect(distance).toBeLessThan(30);
    });

    it('should return 0 for same location', () => {
      const distance = calculateDistance(52.5200, 13.4050, 52.5200, 13.4050);
      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const distance = calculateDistance(-33.8688, 151.2093, -33.9, 151.2);
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('calculateCentroid', () => {
    it('should calculate centroid of multiple points', () => {
      const bookings: BookingCandidate[] = [
        createBooking('1', 52.52, 13.40),
        createBooking('2', 52.50, 13.38),
        createBooking('3', 52.54, 13.42),
      ];

      const centroid = calculateCentroid(bookings);

      expect(centroid.latitude).toBeCloseTo(52.52, 1);
      expect(centroid.longitude).toBeCloseTo(13.40, 1);
    });

    it('should throw error for empty array', () => {
      expect(() => calculateCentroid([])).toThrow();
    });
  });

  describe('findOptimalMeetingPoint', () => {
    it('should find the point with minimum total distance to all others', () => {
      const bookings: BookingCandidate[] = [
        createBooking('1', 52.52, 13.40),
        createBooking('2', 52.50, 13.38),
        createBooking('3', 52.51, 13.39),
      ];

      const optimal = findOptimalMeetingPoint(bookings);

      // The optimal point should be one of the input points
      expect(bookings.some(
        b => b.latitude === optimal.latitude && b.longitude === optimal.longitude
      )).toBe(true);
    });
  });

  describe('areTimeCompatible', () => {
    it('should return true for bookings within time window', () => {
      const booking1 = createBooking('1', 0, 0, new Date('2024-01-15T10:00:00'));
      const booking2 = createBooking('2', 0, 0, new Date('2024-01-15T10:30:00'));

      expect(areTimeCompatible(booking1, booking2, 60)).toBe(true);
    });

    it('should return false for bookings outside time window', () => {
      const booking1 = createBooking('1', 0, 0, new Date('2024-01-15T10:00:00'));
      const booking2 = createBooking('2', 0, 0, new Date('2024-01-15T12:00:00'));

      expect(areTimeCompatible(booking1, booking2, 60)).toBe(false);
    });
  });

  describe('calculateTimeWindow', () => {
    it('should calculate correct time window', () => {
      const bookings: BookingCandidate[] = [
        createBooking('1', 0, 0, new Date('2024-01-15T10:00:00'), 60),
        createBooking('2', 0, 0, new Date('2024-01-15T10:30:00'), 60),
        createBooking('3', 0, 0, new Date('2024-01-15T11:00:00'), 60),
      ];

      const window = calculateTimeWindow(bookings);

      expect(window.start).toEqual(new Date('2024-01-15T10:00:00'));
      // End should be latest booking start + duration
      expect(window.end).toEqual(new Date('2024-01-15T12:00:00'));
    });
  });

  describe('findOptimalGroups', () => {
    it('should group nearby bookings with similar times', () => {
      const bookings: BookingCandidate[] = [
        createBooking('1', 52.520, 13.400, new Date('2024-01-15T10:00:00')),
        createBooking('2', 52.521, 13.401, new Date('2024-01-15T10:15:00')),
        createBooking('3', 52.519, 13.399, new Date('2024-01-15T10:30:00')),
        // Far away booking
        createBooking('4', 52.600, 13.500, new Date('2024-01-15T10:00:00')),
      ];

      const groups = findOptimalGroups(bookings, {
        maxRadiusKm: 3,
        timeWindowMinutes: 60,
        maxDogsPerGroup: 6,
      });

      expect(groups.length).toBeGreaterThanOrEqual(1);
      // First group should contain 3 nearby bookings
      if (groups.length > 0) {
        expect(groups[0]!.bookings.length).toBe(3);
      }
    });

    it('should return empty array for single booking', () => {
      const bookings: BookingCandidate[] = [
        createBooking('1', 52.520, 13.400),
      ];

      const groups = findOptimalGroups(bookings);
      expect(groups).toHaveLength(0);
    });

    it('should respect maxDogsPerGroup constraint', () => {
      const bookings: BookingCandidate[] = [
        createBooking('1', 52.520, 13.400, undefined, 60, 3),
        createBooking('2', 52.521, 13.401, undefined, 60, 3),
        createBooking('3', 52.519, 13.399, undefined, 60, 3),
      ];

      const groups = findOptimalGroups(bookings, { maxDogsPerGroup: 4 });

      // Should not create a group that exceeds maxDogs
      groups.forEach(group => {
        expect(group.totalDogs).toBeLessThanOrEqual(4);
      });
    });

    it('should not group bookings that are too far apart', () => {
      const bookings: BookingCandidate[] = [
        createBooking('1', 52.520, 13.400),
        createBooking('2', 53.520, 14.400), // ~100km away
      ];

      const groups = findOptimalGroups(bookings, { maxRadiusKm: 5 });
      expect(groups).toHaveLength(0);
    });
  });
});

// Helper function to create booking candidates
function createBooking(
  id: string,
  lat: number,
  lng: number,
  date: Date = new Date('2024-01-15T10:00:00'),
  duration: number = 60,
  dogCount: number = 1
): BookingCandidate {
  return {
    id,
    customerId: `customer-${id}`,
    addressId: `address-${id}`,
    latitude: lat,
    longitude: lng,
    scheduledDate: date,
    duration,
    dogCount,
    dogIds: Array(dogCount).fill(null).map((_, i) => `dog-${id}-${i}`),
    postalCode: '10115',
  };
}
