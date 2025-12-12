import { prisma } from '@/lib/prisma'
import { calculateDistance } from '@/lib/utils'
import { addDays, format, parse, isWithinInterval, addMinutes } from 'date-fns'

interface SchedulingResult {
  walkSlotId?: string
  isNewSlot: boolean
  suggestedSlots: SuggestedSlot[]
}

interface SuggestedSlot {
  id: string
  date: Date
  startTime: string
  endTime: string
  walkerId: string
  walkerName: string
  currentDogs: number
  maxDogs: number
  distance: number // Distance to pickup location in km
  matchScore: number // Higher is better match
}

// Find available walk slots or suggest creating new ones
export async function findAvailableSlots(
  requestedDate: Date,
  requestedTimeStart: string,
  requestedTimeEnd: string,
  pickupPostalCode: string,
  pickupLatitude?: number,
  pickupLongitude?: number,
  dogsCount: number = 1
): Promise<SchedulingResult> {
  // 1. Find existing walk slots in the same area and time window
  const existingSlots = await prisma.walkSlot.findMany({
    where: {
      date: {
        gte: new Date(requestedDate.setHours(0, 0, 0, 0)),
        lt: new Date(requestedDate.setHours(23, 59, 59, 999)),
      },
      status: 'OPEN',
      areaPostalCode: pickupPostalCode,
    },
    include: {
      walker: {
        include: {
          user: true,
        },
      },
    },
  })

  const suggestedSlots: SuggestedSlot[] = []

  // 2. Score existing slots
  for (const slot of existingSlots) {
    if (slot.currentDogs + dogsCount > slot.maxDogs) {
      continue // Not enough capacity
    }

    // Check time overlap
    const slotStart = parse(slot.startTime, 'HH:mm', new Date())
    const slotEnd = parse(slot.endTime, 'HH:mm', new Date())
    const reqStart = parse(requestedTimeStart, 'HH:mm', new Date())
    const reqEnd = parse(requestedTimeEnd, 'HH:mm', new Date())

    // Check if requested time overlaps with slot time
    const hasOverlap =
      (reqStart >= slotStart && reqStart < slotEnd) ||
      (reqEnd > slotStart && reqEnd <= slotEnd) ||
      (reqStart <= slotStart && reqEnd >= slotEnd)

    if (!hasOverlap) {
      continue
    }

    // Calculate match score
    let matchScore = 100

    // Prefer slots with some dogs (better utilization)
    if (slot.currentDogs > 0) {
      matchScore += 20
    }

    // Prefer slots that are almost full (efficient)
    const fillRate = (slot.currentDogs + dogsCount) / slot.maxDogs
    matchScore += fillRate * 30

    suggestedSlots.push({
      id: slot.id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      walkerId: slot.walkerId,
      walkerName: slot.walker.user.name,
      currentDogs: slot.currentDogs,
      maxDogs: slot.maxDogs,
      distance: 0, // Same postal code
      matchScore,
    })
  }

  // 3. Find available walkers for new slots if no good matches
  if (suggestedSlots.length === 0) {
    const availableWalkers = await prisma.walker.findMany({
      where: {
        isActive: true,
        workAreas: {
          has: pickupPostalCode,
        },
        // Check if walker works on this day
        workDays: {
          has: requestedDate.getDay(),
        },
      },
      include: {
        user: true,
        walkSlots: {
          where: {
            date: {
              gte: new Date(requestedDate.setHours(0, 0, 0, 0)),
              lt: new Date(requestedDate.setHours(23, 59, 59, 999)),
            },
          },
        },
      },
    })

    for (const walker of availableWalkers) {
      // Check if walker is available at requested time
      const walkerStart = parse(walker.availableFrom, 'HH:mm', new Date())
      const walkerEnd = parse(walker.availableTo, 'HH:mm', new Date())
      const reqStart = parse(requestedTimeStart, 'HH:mm', new Date())
      const reqEnd = parse(requestedTimeEnd, 'HH:mm', new Date())

      if (reqStart < walkerStart || reqEnd > walkerEnd) {
        continue // Outside walker's working hours
      }

      // Check for conflicts with existing slots
      const hasConflict = walker.walkSlots.some((slot) => {
        const slotStart = parse(slot.startTime, 'HH:mm', new Date())
        const slotEnd = parse(slot.endTime, 'HH:mm', new Date())
        return (
          (reqStart >= slotStart && reqStart < slotEnd) ||
          (reqEnd > slotStart && reqEnd <= slotEnd)
        )
      })

      if (hasConflict) {
        continue
      }

      suggestedSlots.push({
        id: `new-${walker.id}`,
        date: requestedDate,
        startTime: requestedTimeStart,
        endTime: requestedTimeEnd,
        walkerId: walker.id,
        walkerName: walker.user.name,
        currentDogs: 0,
        maxDogs: walker.maxDogs,
        distance: 0,
        matchScore: 50, // Lower score than existing slots
      })
    }
  }

  // Sort by match score (descending)
  suggestedSlots.sort((a, b) => b.matchScore - a.matchScore)

  return {
    walkSlotId: suggestedSlots[0]?.id,
    isNewSlot: suggestedSlots[0]?.id.startsWith('new-') ?? true,
    suggestedSlots: suggestedSlots.slice(0, 5), // Return top 5 suggestions
  }
}

// Create a new walk slot or add booking to existing slot
export async function assignBookingToSlot(
  bookingId: string,
  walkSlotId: string,
  walkerId: string,
  date: Date,
  startTime: string,
  endTime: string,
  areaPostalCode: string,
  dogsCount: number
): Promise<string> {
  let slotId = walkSlotId

  // If it's a new slot, create it
  if (walkSlotId.startsWith('new-')) {
    const walker = await prisma.walker.findUnique({
      where: { id: walkerId },
    })

    if (!walker) {
      throw new Error('Walker nicht gefunden')
    }

    const newSlot = await prisma.walkSlot.create({
      data: {
        walkerId,
        date,
        startTime,
        endTime,
        maxDogs: walker.maxDogs,
        currentDogs: dogsCount,
        areaPostalCode,
        status: 'OPEN',
      },
    })
    slotId = newSlot.id
  } else {
    // Update existing slot
    await prisma.walkSlot.update({
      where: { id: walkSlotId },
      data: {
        currentDogs: {
          increment: dogsCount,
        },
        status: {
          set: 'OPEN', // Will be updated to FULL if necessary
        },
      },
    })

    // Check if slot is now full
    const slot = await prisma.walkSlot.findUnique({
      where: { id: walkSlotId },
    })

    if (slot && slot.currentDogs >= slot.maxDogs) {
      await prisma.walkSlot.update({
        where: { id: walkSlotId },
        data: { status: 'FULL' },
      })
    }
  }

  // Link booking to slot
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      walkSlotId: slotId,
      status: 'WALKER_ASSIGNED',
    },
  })

  return slotId
}

// Auto-assign bookings to optimize routes
export async function autoAssignPendingBookings(date: Date): Promise<number> {
  const pendingBookings = await prisma.booking.findMany({
    where: {
      requestedDate: {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999)),
      },
      status: 'PENDING',
    },
    include: {
      customer: true,
      bookingDogs: true,
    },
    orderBy: {
      requestedTimeStart: 'asc',
    },
  })

  let assignedCount = 0

  for (const booking of pendingBookings) {
    const postalCode = booking.useCustomerAddress
      ? booking.customer.postalCode
      : booking.pickupPostalCode || booking.customer.postalCode

    const result = await findAvailableSlots(
      booking.requestedDate,
      booking.requestedTimeStart,
      booking.requestedTimeEnd,
      postalCode,
      booking.useCustomerAddress ? booking.customer.latitude ?? undefined : booking.pickupLatitude ?? undefined,
      booking.useCustomerAddress ? booking.customer.longitude ?? undefined : booking.pickupLongitude ?? undefined,
      booking.bookingDogs.length
    )

    if (result.suggestedSlots.length > 0) {
      const bestSlot = result.suggestedSlots[0]
      await assignBookingToSlot(
        booking.id,
        bestSlot.id,
        bestSlot.walkerId,
        bestSlot.date,
        bestSlot.startTime,
        bestSlot.endTime,
        postalCode,
        booking.bookingDogs.length
      )
      assignedCount++
    }
  }

  return assignedCount
}

// Get walker's daily schedule
export async function getWalkerDailySchedule(walkerId: string, date: Date) {
  const walkSlots = await prisma.walkSlot.findMany({
    where: {
      walkerId,
      date: {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    },
    include: {
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
    orderBy: {
      startTime: 'asc',
    },
  })

  return walkSlots
}
