/**
 * Group Scheduling Algorithm
 *
 * Intelligently groups bookings together based on:
 * - Geographic proximity (customer addresses)
 * - Time window compatibility
 * - Dog compatibility (friendly, group-approved)
 * - Customer preferences
 * - Walker capacity and availability
 */

import { prisma } from '@/lib/prisma'
import {
  calculateDistance,
  calculateCenterPoint,
  calculateGroupRadius,
  optimizeWaypointOrder,
  calculateRouteDistance,
  Coordinates,
  isValidCoordinates,
  formatDistance,
  formatDuration,
  estimateWalkingTime,
} from '@/lib/geocoding'
import { parse, format, addMinutes, differenceInMinutes } from 'date-fns'
import { de } from 'date-fns/locale'

// Configuration
const DEFAULT_MAX_RADIUS_KM = 2.0 // Maximum radius for group
const DEFAULT_MAX_TIME_GAP_MINUTES = 30 // Maximum time difference for grouping
const GROUP_DISCOUNT_PERCENT = 15 // Discount for group walks
const MIN_GROUP_SIZE = 2 // Minimum bookings for a group
const MAX_DOGS_PER_GROUP = 4 // Maximum dogs in a group walk

// Types
interface BookingWithDetails {
  id: string
  requestedDate: Date
  requestedTimeStart: string
  requestedTimeEnd: string
  isGroupBooking: boolean
  customer: {
    id: string
    latitude: number | null
    longitude: number | null
    postalCode: string
    groupPreference: string
    maxGroupSize: number
    user: {
      name: string
    }
  }
  bookingDogs: {
    dog: {
      id: string
      name: string
      size: string
      friendlyWithDogs: boolean
      isGroupApproved: boolean
    }
  }[]
  service: {
    type: string
    basePrice: number
    groupDiscount: number
  }
}

interface GroupCandidate {
  bookings: BookingWithDetails[]
  center: Coordinates
  radius: number
  timeWindow: { start: string; end: string }
  totalDogs: number
  score: number
  estimatedRoute: Coordinates[]
  totalDistance: number
  walkerId?: string
  walkerName?: string
}

interface GroupOptimizationResult {
  success: boolean
  groups: GroupCandidate[]
  ungroupedBookings: BookingWithDetails[]
  stats: {
    totalBookings: number
    groupedBookings: number
    groupsCreated: number
    totalSavings: number
    averageGroupSize: number
  }
  errors: string[]
}

interface AvailableGroupSlot {
  id: string
  date: Date
  startTime: string
  endTime: string
  walker: {
    id: string
    name: string
    maxDogs: number
  }
  currentBookings: {
    id: string
    customerName: string
    dogs: { name: string; size: string }[]
    coordinates: Coordinates
  }[]
  currentDogs: number
  maxDogs: number
  center: Coordinates
  radius: number
  distanceFromCustomer: number
  estimatedSavings: number
  matchScore: number
}

/**
 * Check if a booking is eligible for group walks
 */
function isBookingGroupEligible(booking: BookingWithDetails): boolean {
  // Check customer preference
  if (booking.customer.groupPreference === 'SOLO_ONLY') {
    return false
  }

  // Check if all dogs in the booking are group-approved and friendly
  const allDogsEligible = booking.bookingDogs.every(
    (bd) => bd.dog.isGroupApproved && bd.dog.friendlyWithDogs
  )

  if (!allDogsEligible) {
    return false
  }

  // Check if service type supports grouping (SINGLE_WALK can become GROUP_WALK)
  const groupableServices = ['SINGLE_WALK', 'GROUP_WALK']
  if (!groupableServices.includes(booking.service.type)) {
    return false
  }

  return true
}

/**
 * Check if two bookings can be grouped together
 */
function canGroupBookings(
  booking1: BookingWithDetails,
  booking2: BookingWithDetails,
  maxRadiusKm: number,
  maxTimeGapMinutes: number
): { canGroup: boolean; reason?: string } {
  // Check if both have valid coordinates
  if (
    !isValidCoordinates({
      latitude: booking1.customer.latitude ?? undefined,
      longitude: booking1.customer.longitude ?? undefined,
    }) ||
    !isValidCoordinates({
      latitude: booking2.customer.latitude ?? undefined,
      longitude: booking2.customer.longitude ?? undefined,
    })
  ) {
    return { canGroup: false, reason: 'Fehlende Koordinaten' }
  }

  // Check distance
  const distance = calculateDistance(
    { latitude: booking1.customer.latitude!, longitude: booking1.customer.longitude! },
    { latitude: booking2.customer.latitude!, longitude: booking2.customer.longitude! }
  )

  if (distance > maxRadiusKm * 2) {
    return { canGroup: false, reason: `Entfernung zu groß (${formatDistance(distance)})` }
  }

  // Check time overlap
  const time1Start = parse(booking1.requestedTimeStart, 'HH:mm', new Date())
  const time1End = parse(booking1.requestedTimeEnd, 'HH:mm', new Date())
  const time2Start = parse(booking2.requestedTimeStart, 'HH:mm', new Date())
  const time2End = parse(booking2.requestedTimeEnd, 'HH:mm', new Date())

  const timeGap = Math.min(
    Math.abs(differenceInMinutes(time1Start, time2Start)),
    Math.abs(differenceInMinutes(time1End, time2End))
  )

  if (timeGap > maxTimeGapMinutes) {
    return { canGroup: false, reason: `Zeitfenster zu unterschiedlich (${timeGap} Min.)` }
  }

  // Check total dogs would not exceed limit
  const totalDogs = booking1.bookingDogs.length + booking2.bookingDogs.length
  const maxDogs = Math.min(booking1.customer.maxGroupSize, booking2.customer.maxGroupSize)
  if (totalDogs > maxDogs) {
    return { canGroup: false, reason: `Zu viele Hunde (${totalDogs})` }
  }

  return { canGroup: true }
}

/**
 * Calculate a score for a potential group (higher is better)
 */
function calculateGroupScore(group: BookingWithDetails[]): number {
  if (group.length < MIN_GROUP_SIZE) return 0

  let score = 100 // Base score

  // More bookings = better efficiency
  score += group.length * 20

  // Calculate geographic compactness
  const coordinates = group
    .filter((b) => isValidCoordinates({
      latitude: b.customer.latitude ?? undefined,
      longitude: b.customer.longitude ?? undefined,
    }))
    .map((b) => ({
      latitude: b.customer.latitude!,
      longitude: b.customer.longitude!,
    }))

  if (coordinates.length >= 2) {
    const center = calculateCenterPoint(coordinates)
    const radius = calculateGroupRadius(center, coordinates)

    // Smaller radius = more compact = higher score
    if (radius < 0.5) score += 50
    else if (radius < 1.0) score += 30
    else if (radius < 1.5) score += 10
  }

  // Time window alignment bonus
  const timeStarts = group.map((b) =>
    parse(b.requestedTimeStart, 'HH:mm', new Date()).getTime()
  )
  const timeSpread = Math.max(...timeStarts) - Math.min(...timeStarts)
  const timeSpreadMinutes = timeSpread / (1000 * 60)

  if (timeSpreadMinutes < 15) score += 30
  else if (timeSpreadMinutes < 30) score += 15

  // Prefer groups where customers want group walks
  const groupPreferredCount = group.filter(
    (b) => b.customer.groupPreference === 'GROUP_PREFERRED'
  ).length
  score += groupPreferredCount * 10

  return score
}

/**
 * Greedy algorithm to find optimal groupings
 */
function findOptimalGroupings(
  bookings: BookingWithDetails[],
  maxRadiusKm: number,
  maxTimeGapMinutes: number
): GroupCandidate[] {
  const groups: GroupCandidate[] = []
  const grouped = new Set<string>()

  // Sort bookings by time, then by coordinates for locality
  const sortedBookings = [...bookings].sort((a, b) => {
    const timeCompare = a.requestedTimeStart.localeCompare(b.requestedTimeStart)
    if (timeCompare !== 0) return timeCompare
    return (a.customer.latitude || 0) - (b.customer.latitude || 0)
  })

  for (const booking of sortedBookings) {
    if (grouped.has(booking.id)) continue
    if (!isBookingGroupEligible(booking)) continue

    // Try to build a group starting with this booking
    const currentGroup: BookingWithDetails[] = [booking]
    const currentDogs = booking.bookingDogs.length

    // Find compatible bookings
    for (const candidate of sortedBookings) {
      if (grouped.has(candidate.id)) continue
      if (candidate.id === booking.id) continue
      if (!isBookingGroupEligible(candidate)) continue

      // Check if candidate can join the group
      const totalDogsIfAdded = currentDogs + candidate.bookingDogs.length
      if (totalDogsIfAdded > MAX_DOGS_PER_GROUP) continue

      // Check compatibility with all existing group members
      let canJoin = true
      for (const member of currentGroup) {
        const { canGroup } = canGroupBookings(member, candidate, maxRadiusKm, maxTimeGapMinutes)
        if (!canGroup) {
          canJoin = false
          break
        }
      }

      if (canJoin) {
        currentGroup.push(candidate)
        if (currentGroup.reduce((sum, b) => sum + b.bookingDogs.length, 0) >= MAX_DOGS_PER_GROUP) {
          break // Group is full
        }
      }
    }

    // Only create group if we have at least MIN_GROUP_SIZE bookings
    if (currentGroup.length >= MIN_GROUP_SIZE) {
      const coordinates = currentGroup
        .filter((b) => isValidCoordinates({
          latitude: b.customer.latitude ?? undefined,
          longitude: b.customer.longitude ?? undefined,
        }))
        .map((b) => ({
          latitude: b.customer.latitude!,
          longitude: b.customer.longitude!,
        }))

      const center = calculateCenterPoint(coordinates)
      const radius = calculateGroupRadius(center, coordinates)

      // Calculate optimal route
      const optimizedRoute = optimizeWaypointOrder(coordinates)
      const totalDistance = calculateRouteDistance(optimizedRoute)

      // Calculate time window
      const startTimes = currentGroup.map((b) => b.requestedTimeStart)
      const endTimes = currentGroup.map((b) => b.requestedTimeEnd)

      groups.push({
        bookings: currentGroup,
        center,
        radius,
        timeWindow: {
          start: startTimes.sort()[0],
          end: endTimes.sort().reverse()[0],
        },
        totalDogs: currentGroup.reduce((sum, b) => sum + b.bookingDogs.length, 0),
        score: calculateGroupScore(currentGroup),
        estimatedRoute: optimizedRoute,
        totalDistance,
      })

      currentGroup.forEach((b) => grouped.add(b.id))
    }
  }

  // Sort groups by score (best first)
  return groups.sort((a, b) => b.score - a.score)
}

/**
 * Find available walkers for a group
 */
async function findWalkerForGroup(
  group: GroupCandidate,
  date: Date
): Promise<{ walkerId: string; walkerName: string } | null> {
  // Get the primary postal code from center coordinates
  // For now, use the most common postal code among bookings
  const postalCodes = group.bookings.map((b) => b.customer.postalCode)
  const postalCodeCount = postalCodes.reduce((acc, pc) => {
    acc[pc] = (acc[pc] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const primaryPostalCode = Object.entries(postalCodeCount).sort((a, b) => b[1] - a[1])[0][0]

  const dayOfWeek = date.getDay()

  const availableWalkers = await prisma.walker.findMany({
    where: {
      isActive: true,
      workAreas: {
        has: primaryPostalCode,
      },
      workDays: {
        has: dayOfWeek,
      },
      maxDogs: {
        gte: group.totalDogs,
      },
    },
    include: {
      user: true,
      walkSlots: {
        where: {
          date: {
            gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
            lt: new Date(new Date(date).setHours(23, 59, 59, 999)),
          },
        },
      },
    },
  })

  for (const walker of availableWalkers) {
    // Check if walker is available at the group's time window
    const walkerStart = parse(walker.availableFrom, 'HH:mm', new Date())
    const walkerEnd = parse(walker.availableTo, 'HH:mm', new Date())
    const groupStart = parse(group.timeWindow.start, 'HH:mm', new Date())
    const groupEnd = parse(group.timeWindow.end, 'HH:mm', new Date())

    if (groupStart < walkerStart || groupEnd > walkerEnd) {
      continue
    }

    // Check for conflicts with existing slots
    const hasConflict = walker.walkSlots.some((slot) => {
      const slotStart = parse(slot.startTime, 'HH:mm', new Date())
      const slotEnd = parse(slot.endTime, 'HH:mm', new Date())
      return (
        (groupStart >= slotStart && groupStart < slotEnd) ||
        (groupEnd > slotStart && groupEnd <= slotEnd) ||
        (groupStart <= slotStart && groupEnd >= slotEnd)
      )
    })

    if (!hasConflict) {
      return {
        walkerId: walker.id,
        walkerName: walker.user.name,
      }
    }
  }

  return null
}

/**
 * Main function: Optimize bookings for a given date
 */
export async function optimizeGroupsForDate(
  date: Date,
  maxRadiusKm: number = DEFAULT_MAX_RADIUS_KM,
  maxTimeGapMinutes: number = DEFAULT_MAX_TIME_GAP_MINUTES
): Promise<GroupOptimizationResult> {
  const errors: string[] = []

  // Fetch all pending bookings for the date
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const bookings = await prisma.booking.findMany({
    where: {
      requestedDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
      status: {
        in: ['PENDING', 'CONFIRMED'],
      },
      walkSlotId: null, // Not yet assigned to a slot
    },
    include: {
      customer: {
        include: {
          user: true,
        },
      },
      bookingDogs: {
        include: {
          dog: true,
        },
      },
      service: true,
    },
  }) as unknown as BookingWithDetails[]

  if (bookings.length === 0) {
    return {
      success: true,
      groups: [],
      ungroupedBookings: [],
      stats: {
        totalBookings: 0,
        groupedBookings: 0,
        groupsCreated: 0,
        totalSavings: 0,
        averageGroupSize: 0,
      },
      errors: [],
    }
  }

  // Filter to only group-eligible bookings
  const eligibleBookings = bookings.filter(isBookingGroupEligible)
  const ineligibleBookings = bookings.filter((b) => !isBookingGroupEligible(b))

  // Find optimal groupings
  const groups = findOptimalGroupings(eligibleBookings, maxRadiusKm, maxTimeGapMinutes)

  // Assign walkers to groups
  for (const group of groups) {
    const walkerAssignment = await findWalkerForGroup(group, date)
    if (walkerAssignment) {
      group.walkerId = walkerAssignment.walkerId
      group.walkerName = walkerAssignment.walkerName
    } else {
      errors.push(
        `Kein verfügbarer Walker für Gruppe gefunden (${group.bookings.length} Buchungen, ${group.timeWindow.start}-${group.timeWindow.end})`
      )
    }
  }

  // Calculate stats
  const groupedBookingIds = new Set(groups.flatMap((g) => g.bookings.map((b) => b.id)))
  const ungroupedBookings = [
    ...eligibleBookings.filter((b) => !groupedBookingIds.has(b.id)),
    ...ineligibleBookings,
  ]

  let totalSavings = 0
  for (const group of groups) {
    for (const booking of group.bookings) {
      const discount = booking.service.basePrice * (GROUP_DISCOUNT_PERCENT / 100)
      totalSavings += discount * booking.bookingDogs.length
    }
  }

  return {
    success: errors.length === 0,
    groups,
    ungroupedBookings,
    stats: {
      totalBookings: bookings.length,
      groupedBookings: groupedBookingIds.size,
      groupsCreated: groups.length,
      totalSavings,
      averageGroupSize: groups.length > 0
        ? groupedBookingIds.size / groups.length
        : 0,
    },
    errors,
  }
}

/**
 * Apply grouping results to the database
 */
export async function applyGroupOptimization(
  groups: GroupCandidate[],
  date: Date
): Promise<{ slotsCreated: number; bookingsUpdated: number; errors: string[] }> {
  let slotsCreated = 0
  let bookingsUpdated = 0
  const errors: string[] = []

  for (const group of groups) {
    if (!group.walkerId) {
      errors.push(`Gruppe ohne Walker übersprungen`)
      continue
    }

    try {
      // Get primary postal code
      const postalCodes = group.bookings.map((b) => b.customer.postalCode)
      const postalCodeCount = postalCodes.reduce((acc, pc) => {
        acc[pc] = (acc[pc] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      const primaryPostalCode = Object.entries(postalCodeCount).sort((a, b) => b[1] - a[1])[0][0]

      // Create walk slot
      const walkSlot = await prisma.walkSlot.create({
        data: {
          walkerId: group.walkerId,
          date: date,
          startTime: group.timeWindow.start,
          endTime: group.timeWindow.end,
          maxDogs: MAX_DOGS_PER_GROUP,
          currentDogs: group.totalDogs,
          status: group.totalDogs >= MAX_DOGS_PER_GROUP ? 'FULL' : 'OPEN',
          isGroupSlot: true,
          groupRadius: group.radius,
          centerLatitude: group.center.latitude,
          centerLongitude: group.center.longitude,
          totalDistance: group.totalDistance,
          optimizationScore: group.score,
          areaPostalCode: primaryPostalCode,
          routeWaypoints: JSON.stringify(group.estimatedRoute),
        },
      })
      slotsCreated++

      // Update bookings
      for (const booking of group.bookings) {
        const originalPrice = booking.service.basePrice * booking.bookingDogs.length
        const discount = GROUP_DISCOUNT_PERCENT / 100
        const newPrice = originalPrice * (1 - discount)

        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            walkSlotId: walkSlot.id,
            status: 'WALKER_ASSIGNED',
            isGroupBooking: true,
            groupDiscount: discount,
            originalPrice: originalPrice,
            totalPrice: newPrice,
          },
        })
        bookingsUpdated++

        // Create notification for customer
        const customer = await prisma.customer.findUnique({
          where: { id: booking.customer.id },
          include: { user: true },
        })

        if (customer) {
          await prisma.notification.create({
            data: {
              userId: customer.userId,
              type: 'GROUP_JOINED',
              title: 'Gruppenspaziergang zugewiesen',
              message: `Ihre Buchung wurde einem Gruppenspaziergang zugewiesen. Sie sparen ${(discount * 100).toFixed(0)}%!`,
              link: '/customer',
            },
          })
        }
      }
    } catch (error) {
      errors.push(
        `Fehler beim Erstellen der Gruppe: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      )
    }
  }

  return { slotsCreated, bookingsUpdated, errors }
}

/**
 * Find available group slots for a customer to join
 */
export async function findAvailableGroupSlots(
  customerId: string,
  date: Date,
  dogsToAdd: string[],
  maxRadiusKm: number = DEFAULT_MAX_RADIUS_KM
): Promise<AvailableGroupSlot[]> {
  // Get customer details
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { user: true },
  })

  if (!customer || !customer.latitude || !customer.longitude) {
    return []
  }

  // Check if all dogs are group-approved
  const dogs = await prisma.dog.findMany({
    where: {
      id: { in: dogsToAdd },
      customerId: customerId,
    },
  })

  const allDogsEligible = dogs.every((d) => d.isGroupApproved && d.friendlyWithDogs)
  if (!allDogsEligible) {
    return []
  }

  // Find open group slots for the date
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  const openSlots = await prisma.walkSlot.findMany({
    where: {
      date: {
        gte: startOfDay,
        lt: endOfDay,
      },
      status: 'OPEN',
      isGroupSlot: true,
      currentDogs: {
        lt: MAX_DOGS_PER_GROUP - dogsToAdd.length + 1, // Has room for our dogs
      },
    },
    include: {
      walker: {
        include: {
          user: true,
        },
      },
      bookings: {
        include: {
          customer: {
            include: {
              user: true,
            },
          },
          bookingDogs: {
            include: {
              dog: true,
            },
          },
        },
      },
    },
  })

  const customerCoords: Coordinates = {
    latitude: customer.latitude,
    longitude: customer.longitude,
  }

  const availableSlots: AvailableGroupSlot[] = []

  for (const slot of openSlots) {
    // Check if slot has valid center coordinates
    if (!slot.centerLatitude || !slot.centerLongitude) continue

    const slotCenter: Coordinates = {
      latitude: slot.centerLatitude,
      longitude: slot.centerLongitude,
    }

    // Check distance from customer to slot center
    const distance = calculateDistance(customerCoords, slotCenter)

    // Check if within acceptable radius
    const effectiveRadius = Math.max(slot.groupRadius || maxRadiusKm, maxRadiusKm)
    if (distance > effectiveRadius * 1.5) continue // Allow some flexibility

    // Check capacity
    if (slot.currentDogs + dogsToAdd.length > slot.maxDogs) continue

    // Calculate match score
    let matchScore = 100

    // Closer = better
    if (distance < 0.5) matchScore += 50
    else if (distance < 1.0) matchScore += 30
    else if (distance < 1.5) matchScore += 10

    // More dogs = more social
    matchScore += slot.currentDogs * 5

    // Get current bookings info
    const currentBookings = slot.bookings.map((b) => ({
      id: b.id,
      customerName: b.customer.user.name,
      dogs: b.bookingDogs.map((bd) => ({
        name: bd.dog.name,
        size: bd.dog.size,
      })),
      coordinates: {
        latitude: b.customer.latitude!,
        longitude: b.customer.longitude!,
      },
    }))

    // Calculate estimated savings
    const service = await prisma.service.findFirst({
      where: { type: 'GROUP_WALK' },
    })
    const basePrice = service?.basePrice || 18
    const estimatedSavings = basePrice * dogsToAdd.length * (GROUP_DISCOUNT_PERCENT / 100)

    availableSlots.push({
      id: slot.id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      walker: {
        id: slot.walker.id,
        name: slot.walker.user.name,
        maxDogs: slot.walker.maxDogs,
      },
      currentBookings,
      currentDogs: slot.currentDogs,
      maxDogs: slot.maxDogs,
      center: slotCenter,
      radius: slot.groupRadius || maxRadiusKm,
      distanceFromCustomer: distance,
      estimatedSavings,
      matchScore,
    })
  }

  // Sort by match score
  return availableSlots.sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Join a customer to an existing group slot
 */
export async function joinGroupSlot(
  slotId: string,
  customerId: string,
  dogIds: string[],
  timeStart: string,
  timeEnd: string
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    // Verify slot exists and has capacity
    const slot = await prisma.walkSlot.findUnique({
      where: { id: slotId },
      include: { walker: true },
    })

    if (!slot) {
      return { success: false, error: 'Slot nicht gefunden' }
    }

    if (slot.status !== 'OPEN') {
      return { success: false, error: 'Slot ist nicht mehr verfügbar' }
    }

    if (slot.currentDogs + dogIds.length > slot.maxDogs) {
      return { success: false, error: 'Nicht genug Platz im Slot' }
    }

    // Verify dogs are eligible
    const dogs = await prisma.dog.findMany({
      where: {
        id: { in: dogIds },
        customerId: customerId,
      },
    })

    if (dogs.length !== dogIds.length) {
      return { success: false, error: 'Einige Hunde wurden nicht gefunden' }
    }

    const ineligibleDogs = dogs.filter((d) => !d.isGroupApproved || !d.friendlyWithDogs)
    if (ineligibleDogs.length > 0) {
      return {
        success: false,
        error: `Folgende Hunde sind nicht für Gruppenspaziergänge freigegeben: ${ineligibleDogs.map((d) => d.name).join(', ')}`,
      }
    }

    // Get GROUP_WALK service
    const service = await prisma.service.findFirst({
      where: { type: 'GROUP_WALK' },
    })

    if (!service) {
      return { success: false, error: 'Gruppenspaziergang-Service nicht gefunden' }
    }

    // Calculate pricing
    const originalPrice = service.basePrice * dogIds.length
    const discount = service.groupDiscount
    const finalPrice = originalPrice * (1 - discount)

    // Get customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return { success: false, error: 'Kunde nicht gefunden' }
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        customerId,
        serviceId: service.id,
        requestedDate: slot.date,
        requestedTimeStart: timeStart,
        requestedTimeEnd: timeEnd,
        status: 'WALKER_ASSIGNED',
        useCustomerAddress: true,
        totalPrice: finalPrice,
        isGroupBooking: true,
        groupDiscount: discount,
        originalPrice: originalPrice,
        walkSlotId: slotId,
        bookingDogs: {
          create: dogIds.map((dogId) => ({
            dogId,
          })),
        },
      },
    })

    // Update slot
    const newCurrentDogs = slot.currentDogs + dogIds.length
    await prisma.walkSlot.update({
      where: { id: slotId },
      data: {
        currentDogs: newCurrentDogs,
        status: newCurrentDogs >= slot.maxDogs ? 'FULL' : 'OPEN',
      },
    })

    // Update center point with new customer location
    if (customer.latitude && customer.longitude) {
      const bookings = await prisma.booking.findMany({
        where: { walkSlotId: slotId },
        include: { customer: true },
      })

      const coordinates = bookings
        .filter((b) => b.customer.latitude && b.customer.longitude)
        .map((b) => ({
          latitude: b.customer.latitude!,
          longitude: b.customer.longitude!,
        }))

      if (coordinates.length > 0) {
        const newCenter = calculateCenterPoint(coordinates)
        const newRadius = calculateGroupRadius(newCenter, coordinates)

        await prisma.walkSlot.update({
          where: { id: slotId },
          data: {
            centerLatitude: newCenter.latitude,
            centerLongitude: newCenter.longitude,
            groupRadius: newRadius,
          },
        })
      }
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId: customer.userId,
        type: 'GROUP_JOINED',
        title: 'Gruppenspaziergang gebucht',
        message: `Sie haben erfolgreich einen Gruppenspaziergang gebucht und sparen ${(discount * 100).toFixed(0)}%!`,
        link: '/customer',
      },
    })

    return { success: true, bookingId: booking.id }
  } catch (error) {
    console.error('Error joining group slot:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }
  }
}

/**
 * Run the optimization and save results
 */
export async function runGroupOptimization(
  date: Date,
  maxRadiusKm: number = DEFAULT_MAX_RADIUS_KM,
  maxTimeGapMinutes: number = DEFAULT_MAX_TIME_GAP_MINUTES,
  applyResults: boolean = false
): Promise<{
  runId: string
  result: GroupOptimizationResult
  applied?: { slotsCreated: number; bookingsUpdated: number; errors: string[] }
}> {
  // Create optimization run record
  const run = await prisma.groupOptimizationRun.create({
    data: {
      targetDate: date,
      maxRadius: maxRadiusKm,
      maxTimeGap: maxTimeGapMinutes,
      status: 'RUNNING',
      startedAt: new Date(),
      bookingsAnalyzed: 0,
      groupsCreated: 0,
      bookingsGrouped: 0,
      totalSavings: 0,
    },
  })

  try {
    // Run optimization
    const result = await optimizeGroupsForDate(date, maxRadiusKm, maxTimeGapMinutes)

    // Update run record
    await prisma.groupOptimizationRun.update({
      where: { id: run.id },
      data: {
        status: result.success ? 'COMPLETED' : 'COMPLETED',
        completedAt: new Date(),
        bookingsAnalyzed: result.stats.totalBookings,
        groupsCreated: result.stats.groupsCreated,
        bookingsGrouped: result.stats.groupedBookings,
        totalSavings: result.stats.totalSavings,
        results: JSON.stringify({
          groups: result.groups.map((g) => ({
            bookingIds: g.bookings.map((b) => b.id),
            center: g.center,
            radius: g.radius,
            timeWindow: g.timeWindow,
            totalDogs: g.totalDogs,
            score: g.score,
            walkerId: g.walkerId,
          })),
          ungroupedBookingIds: result.ungroupedBookings.map((b) => b.id),
          errors: result.errors,
        }),
        errorMessage: result.errors.length > 0 ? result.errors.join('\n') : null,
      },
    })

    let applied
    if (applyResults && result.groups.length > 0) {
      applied = await applyGroupOptimization(result.groups, date)
    }

    return { runId: run.id, result, applied }
  } catch (error) {
    // Update run record with error
    await prisma.groupOptimizationRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
    })

    throw error
  }
}

/**
 * Get group-eligible dogs for a customer
 */
export async function getGroupEligibleDogs(customerId: string): Promise<{
  eligible: { id: string; name: string; size: string; breed?: string }[]
  ineligible: { id: string; name: string; reason: string }[]
}> {
  const dogs = await prisma.dog.findMany({
    where: {
      customerId,
      isActive: true,
    },
  })

  const eligible: { id: string; name: string; size: string; breed?: string }[] = []
  const ineligible: { id: string; name: string; reason: string }[] = []

  for (const dog of dogs) {
    if (!dog.isGroupApproved) {
      ineligible.push({
        id: dog.id,
        name: dog.name,
        reason: 'Noch nicht für Gruppenspaziergänge freigegeben',
      })
    } else if (!dog.friendlyWithDogs) {
      ineligible.push({
        id: dog.id,
        name: dog.name,
        reason: 'Nicht verträglich mit anderen Hunden',
      })
    } else {
      eligible.push({
        id: dog.id,
        name: dog.name,
        size: dog.size,
        breed: dog.breed || undefined,
      })
    }
  }

  return { eligible, ineligible }
}
