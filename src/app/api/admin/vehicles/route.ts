import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const vehicleSchema = z.object({
  licensePlate: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.number().min(1990).max(new Date().getFullYear() + 1),
  color: z.string().min(1),
  maxDogs: z.number().min(1).max(6).default(4),
  mileage: z.number().min(0).default(0),
  insuranceNumber: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  nextServiceDue: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const vehicles = await prisma.vehicle.findMany({
      include: {
        assignedWalker: {
          include: { user: true },
        },
      },
      orderBy: { licensePlate: 'asc' },
    })

    return NextResponse.json(vehicles)
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    return NextResponse.json(
      { error: 'Fahrzeuge konnten nicht geladen werden' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = vehicleSchema.parse(body)

    // Check if license plate already exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { licensePlate: validatedData.licensePlate },
    })

    if (existingVehicle) {
      return NextResponse.json(
        { error: 'Kennzeichen bereits vorhanden' },
        { status: 400 }
      )
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        licensePlate: validatedData.licensePlate,
        brand: validatedData.brand,
        model: validatedData.model,
        year: validatedData.year,
        color: validatedData.color,
        maxDogs: validatedData.maxDogs,
        mileage: validatedData.mileage,
        insuranceNumber: validatedData.insuranceNumber,
        insuranceExpiry: validatedData.insuranceExpiry
          ? new Date(validatedData.insuranceExpiry)
          : null,
        nextServiceDue: validatedData.nextServiceDue
          ? new Date(validatedData.nextServiceDue)
          : null,
        notes: validatedData.notes,
      },
    })

    return NextResponse.json(vehicle, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating vehicle:', error)
    return NextResponse.json(
      { error: 'Fahrzeug konnte nicht erstellt werden' },
      { status: 500 }
    )
  }
}
