import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findAvailableSlots, assignBookingToSlot } from '@/lib/scheduling'
import { z } from 'zod'

const bookingSchema = z.object({
  serviceId: z.string(),
  dogIds: z.array(z.string()).min(1, 'Mindestens ein Hund erforderlich'),
  requestedDate: z.string(),
  requestedTimeStart: z.string(),
  requestedTimeEnd: z.string(),
  useCustomerAddress: z.boolean().default(true),
  pickupStreet: z.string().optional(),
  pickupHouseNumber: z.string().optional(),
  pickupPostalCode: z.string().optional(),
  pickupCity: z.string().optional(),
  customerNotes: z.string().optional(),
  selectedSlotId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    let where: any = {}

    if (session.user.role === 'CUSTOMER' && session.user.customerId) {
      where.customerId = session.user.customerId
    } else if (session.user.role === 'WALKER' && session.user.walkerId) {
      where.walkSlot = {
        walkerId: session.user.walkerId,
      }
    }

    if (status) {
      where.status = status
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        customer: {
          include: { user: true },
        },
        service: true,
        bookingDogs: {
          include: { dog: true },
        },
        walkSlot: {
          include: {
            walker: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { requestedDate: 'desc' },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Buchungen konnten nicht geladen werden' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user.customerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = bookingSchema.parse(body)

    // Get customer data
    const customer = await prisma.customer.findUnique({
      where: { id: session.user.customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Kundendaten nicht gefunden' },
        { status: 404 }
      )
    }

    // Get service for pricing
    const service = await prisma.service.findUnique({
      where: { id: validatedData.serviceId },
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Service nicht gefunden' },
        { status: 404 }
      )
    }

    // Verify dogs belong to customer
    const dogs = await prisma.dog.findMany({
      where: {
        id: { in: validatedData.dogIds },
        customerId: session.user.customerId,
        isActive: true,
      },
    })

    if (dogs.length !== validatedData.dogIds.length) {
      return NextResponse.json(
        { error: 'Ungueltige Hundeauswahl' },
        { status: 400 }
      )
    }

    // Calculate price
    let totalPrice = service.basePrice * dogs.length
    if (service.type === 'GROUP_WALK') {
      totalPrice = totalPrice * (1 - service.groupDiscount)
    }

    // Determine pickup location
    const postalCode = validatedData.useCustomerAddress
      ? customer.postalCode
      : validatedData.pickupPostalCode || customer.postalCode

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        customerId: session.user.customerId,
        serviceId: validatedData.serviceId,
        requestedDate: new Date(validatedData.requestedDate),
        requestedTimeStart: validatedData.requestedTimeStart,
        requestedTimeEnd: validatedData.requestedTimeEnd,
        useCustomerAddress: validatedData.useCustomerAddress,
        pickupStreet: validatedData.pickupStreet,
        pickupHouseNumber: validatedData.pickupHouseNumber,
        pickupPostalCode: validatedData.pickupPostalCode,
        pickupCity: validatedData.pickupCity,
        customerNotes: validatedData.customerNotes,
        totalPrice,
        status: 'PENDING',
        bookingDogs: {
          create: validatedData.dogIds.map((dogId) => ({
            dogId,
          })),
        },
      },
      include: {
        bookingDogs: {
          include: { dog: true },
        },
        service: true,
      },
    })

    // Try to auto-assign to a walk slot
    if (validatedData.selectedSlotId) {
      // Customer selected a specific slot
      try {
        const slot = await prisma.walkSlot.findUnique({
          where: { id: validatedData.selectedSlotId },
        })

        if (slot && slot.currentDogs + dogs.length <= slot.maxDogs) {
          await assignBookingToSlot(
            booking.id,
            slot.id,
            slot.walkerId,
            slot.date,
            slot.startTime,
            slot.endTime,
            postalCode,
            dogs.length
          )
        }
      } catch (err) {
        console.error('Error assigning to selected slot:', err)
      }
    } else {
      // Try to find an available slot automatically
      try {
        const result = await findAvailableSlots(
          new Date(validatedData.requestedDate),
          validatedData.requestedTimeStart,
          validatedData.requestedTimeEnd,
          postalCode,
          undefined,
          undefined,
          dogs.length
        )

        if (result.suggestedSlots.length > 0 && !result.isNewSlot) {
          const bestSlot = result.suggestedSlots[0]
          await assignBookingToSlot(
            booking.id,
            bestSlot.id,
            bestSlot.walkerId,
            bestSlot.date,
            bestSlot.startTime,
            bestSlot.endTime,
            postalCode,
            dogs.length
          )
        }
      } catch (err) {
        console.error('Error auto-assigning slot:', err)
      }
    }

    // TODO: Send confirmation email

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Buchung konnte nicht erstellt werden' },
      { status: 500 }
    )
  }
}
