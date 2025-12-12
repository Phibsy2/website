import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDistance } from '@/lib/geocoding'

// GET: Get walker's group walk slots
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'WALKER') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const walkerId = session.user.walkerId
    if (!walkerId) {
      return NextResponse.json(
        { error: 'Walker-Profil nicht gefunden' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const groupOnly = searchParams.get('groupOnly') !== 'false'

    // Build date filter
    let dateFilter = {}
    if (dateParam) {
      const date = new Date(dateParam)
      const startOfDay = new Date(date.setHours(0, 0, 0, 0))
      const endOfDay = new Date(date.setHours(23, 59, 59, 999))
      dateFilter = {
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      }
    } else {
      // Default to upcoming slots
      dateFilter = {
        date: {
          gte: new Date(),
        },
      }
    }

    const walkSlots = await prisma.walkSlot.findMany({
      where: {
        walkerId,
        ...(groupOnly ? { isGroupSlot: true } : {}),
        ...dateFilter,
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
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    })

    return NextResponse.json({
      slots: walkSlots.map((slot) => ({
        id: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
        isGroupSlot: slot.isGroupSlot,
        currentDogs: slot.currentDogs,
        maxDogs: slot.maxDogs,
        acceptedByWalker: slot.acceptedByWalker,
        // Group-specific data
        groupRadius: slot.groupRadius,
        groupRadiusFormatted: slot.groupRadius ? formatDistance(slot.groupRadius) : null,
        centerLatitude: slot.centerLatitude,
        centerLongitude: slot.centerLongitude,
        totalDistance: slot.totalDistance,
        totalDistanceFormatted: slot.totalDistance ? formatDistance(slot.totalDistance) : null,
        optimizationScore: slot.optimizationScore,
        areaPostalCode: slot.areaPostalCode,
        // Route data
        routeWaypoints: slot.routeWaypoints ? JSON.parse(slot.routeWaypoints) : null,
        // Bookings
        bookings: slot.bookings.map((booking) => ({
          id: booking.id,
          status: booking.status,
          isGroupBooking: booking.isGroupBooking,
          totalPrice: booking.totalPrice,
          groupDiscount: booking.groupDiscount,
          customerNotes: booking.customerNotes,
          customer: {
            id: booking.customer.id,
            name: booking.customer.user.name,
            phone: booking.customer.user.phone,
            street: booking.customer.street,
            houseNumber: booking.customer.houseNumber,
            postalCode: booking.customer.postalCode,
            city: booking.customer.city,
            latitude: booking.customer.latitude,
            longitude: booking.customer.longitude,
          },
          dogs: booking.bookingDogs.map((bd) => ({
            id: bd.dog.id,
            name: bd.dog.name,
            breed: bd.dog.breed,
            size: bd.dog.size,
            imageUrl: bd.dog.imageUrl,
            specialNeeds: bd.dog.specialNeeds,
            notes: bd.notes,
          })),
        })),
      })),
      count: walkSlots.length,
    })
  } catch (error) {
    console.error('Error fetching walker group slots:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Gruppentermine' },
      { status: 500 }
    )
  }
}
