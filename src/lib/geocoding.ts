/**
 * Geocoding and Distance Calculation Library
 *
 * Provides functions for:
 * - Converting addresses to coordinates (geocoding)
 * - Calculating distances between coordinates (Haversine formula)
 * - Finding nearby locations within a radius
 * - Calculating optimal pickup routes
 */

// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;

// Geocoding cache to reduce API calls
const geocodingCache = new Map<string, { lat: number; lng: number; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface AddressComponents {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country?: string;
}

export interface GeocodingResult {
  success: boolean;
  coordinates?: Coordinates;
  formattedAddress?: string;
  error?: string;
}

export interface DistanceResult {
  distance: number; // in km
  bearing: number;  // in degrees
}

export interface LocationWithDistance {
  id: string;
  coordinates: Coordinates;
  distance: number;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate the Haversine distance between two points
 * Returns distance in kilometers
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLng = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate bearing between two points
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(
  from: Coordinates,
  to: Coordinates
): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Check if two points are within a given radius
 */
export function isWithinRadius(
  point1: Coordinates,
  point2: Coordinates,
  radiusKm: number
): boolean {
  return calculateDistance(point1, point2) <= radiusKm;
}

/**
 * Calculate the center point of multiple coordinates
 */
export function calculateCenterPoint(points: Coordinates[]): Coordinates {
  if (points.length === 0) {
    throw new Error('Cannot calculate center of empty array');
  }

  if (points.length === 1) {
    return points[0];
  }

  let x = 0, y = 0, z = 0;

  for (const point of points) {
    const lat = toRadians(point.latitude);
    const lng = toRadians(point.longitude);

    x += Math.cos(lat) * Math.cos(lng);
    y += Math.cos(lat) * Math.sin(lng);
    z += Math.sin(lat);
  }

  const total = points.length;
  x /= total;
  y /= total;
  z /= total;

  const lng = Math.atan2(y, x);
  const hyp = Math.sqrt(x * x + y * y);
  const lat = Math.atan2(z, hyp);

  return {
    latitude: toDegrees(lat),
    longitude: toDegrees(lng),
  };
}

/**
 * Calculate the maximum radius needed to cover all points from center
 */
export function calculateGroupRadius(
  center: Coordinates,
  points: Coordinates[]
): number {
  if (points.length === 0) return 0;

  let maxDistance = 0;
  for (const point of points) {
    const distance = calculateDistance(center, point);
    if (distance > maxDistance) {
      maxDistance = distance;
    }
  }

  return maxDistance;
}

/**
 * Find all locations within a radius of a given point
 */
export function findLocationsWithinRadius<T extends { id: string; latitude: number | null; longitude: number | null }>(
  center: Coordinates,
  locations: T[],
  radiusKm: number
): (T & { distance: number })[] {
  return locations
    .filter((loc) => loc.latitude !== null && loc.longitude !== null)
    .map((loc) => ({
      ...loc,
      distance: calculateDistance(center, {
        latitude: loc.latitude!,
        longitude: loc.longitude!,
      }),
    }))
    .filter((loc) => loc.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Generate a cache key for address
 */
function generateCacheKey(address: AddressComponents): string {
  return `${address.street}_${address.houseNumber}_${address.postalCode}_${address.city}`.toLowerCase();
}

/**
 * Geocode an address to coordinates using Nominatim (OpenStreetMap)
 * Note: For production, consider using a commercial geocoding service
 */
export async function geocodeAddress(
  address: AddressComponents
): Promise<GeocodingResult> {
  const cacheKey = generateCacheKey(address);

  // Check cache
  const cached = geocodingCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      success: true,
      coordinates: { latitude: cached.lat, longitude: cached.lng },
    };
  }

  try {
    const country = address.country || 'Germany';
    const queryParts = [
      `${address.street} ${address.houseNumber}`,
      address.postalCode,
      address.city,
      country,
    ];

    const query = encodeURIComponent(queryParts.join(', '));
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PawfectService/1.0',
        'Accept-Language': 'de',
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.length === 0) {
      return {
        success: false,
        error: 'Adresse konnte nicht gefunden werden',
      };
    }

    const result = data[0];
    const coordinates = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };

    // Cache the result
    geocodingCache.set(cacheKey, {
      lat: coordinates.latitude,
      lng: coordinates.longitude,
      timestamp: Date.now(),
    });

    return {
      success: true,
      coordinates,
      formattedAddress: result.display_name,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

/**
 * Reverse geocode coordinates to an address
 */
export async function reverseGeocode(
  coordinates: Coordinates
): Promise<GeocodingResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${coordinates.latitude}&lon=${coordinates.longitude}&format=json&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PawfectService/1.0',
        'Accept-Language': 'de',
      },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error,
      };
    }

    return {
      success: true,
      coordinates,
      formattedAddress: data.display_name,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
  }
}

/**
 * Estimate walking time between two points (assuming ~5 km/h walking speed)
 */
export function estimateWalkingTime(
  point1: Coordinates,
  point2: Coordinates
): number {
  const distanceKm = calculateDistance(point1, point2);
  const walkingSpeedKmH = 5; // Average dog walking speed
  return Math.ceil((distanceKm / walkingSpeedKmH) * 60); // Return minutes
}

/**
 * Estimate driving time between two points (rough estimate, ~30 km/h urban)
 */
export function estimateDrivingTime(
  point1: Coordinates,
  point2: Coordinates
): number {
  const distanceKm = calculateDistance(point1, point2);
  const drivingSpeedKmH = 30; // Urban driving speed
  return Math.ceil((distanceKm / drivingSpeedKmH) * 60); // Return minutes
}

/**
 * Calculate the total route distance for ordered waypoints
 */
export function calculateRouteDistance(waypoints: Coordinates[]): number {
  if (waypoints.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDistance += calculateDistance(waypoints[i], waypoints[i + 1]);
  }

  return totalDistance;
}

/**
 * Simple greedy algorithm for ordering waypoints to minimize total distance
 * Starts from the first point and always goes to the nearest unvisited point
 */
export function optimizeWaypointOrder(waypoints: Coordinates[]): Coordinates[] {
  if (waypoints.length <= 2) return waypoints;

  const optimized: Coordinates[] = [waypoints[0]];
  const remaining = waypoints.slice(1);

  while (remaining.length > 0) {
    const current = optimized[optimized.length - 1];
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const distance = calculateDistance(current, remaining[i]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    optimized.push(remaining[nearestIndex]);
    remaining.splice(nearestIndex, 1);
  }

  return optimized;
}

/**
 * 2-opt optimization for route improvement
 * Iteratively improves the route by swapping edges
 */
export function optimizeRouteWithTwoOpt(waypoints: Coordinates[]): Coordinates[] {
  if (waypoints.length < 4) return waypoints;

  let route = [...waypoints];
  let improved = true;

  while (improved) {
    improved = false;

    for (let i = 1; i < route.length - 2; i++) {
      for (let j = i + 1; j < route.length - 1; j++) {
        // Calculate current distance
        const currentDist =
          calculateDistance(route[i - 1], route[i]) +
          calculateDistance(route[j], route[j + 1]);

        // Calculate distance after swap
        const newDist =
          calculateDistance(route[i - 1], route[j]) +
          calculateDistance(route[i], route[j + 1]);

        if (newDist < currentDist) {
          // Reverse the segment between i and j
          const newRoute = [
            ...route.slice(0, i),
            ...route.slice(i, j + 1).reverse(),
            ...route.slice(j + 1),
          ];
          route = newRoute;
          improved = true;
        }
      }
    }
  }

  return route;
}

/**
 * Generate a formatted route summary for display
 */
export function generateRouteSummary(
  waypoints: { coordinates: Coordinates; label: string }[]
): {
  totalDistance: number;
  estimatedWalkingTime: number;
  estimatedDrivingTime: number;
  legs: { from: string; to: string; distance: number; walkingTime: number }[];
} {
  const legs: { from: string; to: string; distance: number; walkingTime: number }[] = [];
  let totalDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const distance = calculateDistance(
      waypoints[i].coordinates,
      waypoints[i + 1].coordinates
    );
    totalDistance += distance;
    legs.push({
      from: waypoints[i].label,
      to: waypoints[i + 1].label,
      distance: Math.round(distance * 100) / 100,
      walkingTime: estimateWalkingTime(
        waypoints[i].coordinates,
        waypoints[i + 1].coordinates
      ),
    });
  }

  return {
    totalDistance: Math.round(totalDistance * 100) / 100,
    estimatedWalkingTime: legs.reduce((sum, leg) => sum + leg.walkingTime, 0),
    estimatedDrivingTime: Math.ceil(totalDistance / 30 * 60), // 30 km/h urban
    legs,
  };
}

/**
 * Check if coordinates are valid
 */
export function isValidCoordinates(coords: Partial<Coordinates>): coords is Coordinates {
  return (
    typeof coords.latitude === 'number' &&
    typeof coords.longitude === 'number' &&
    coords.latitude >= -90 &&
    coords.latitude <= 90 &&
    coords.longitude >= -180 &&
    coords.longitude <= 180
  );
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} Min.`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} Std. ${mins} Min.` : `${hours} Std.`;
}
