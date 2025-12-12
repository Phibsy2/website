import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateEmployeeNumber } from '@/lib/utils'
import { z } from 'zod'

const walkerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  hourlyRate: z.number().positive(),
  maxDogs: z.number().min(1).max(6).default(4),
  canDriveCar: z.boolean().default(false),
  workAreas: z.array(z.string()).min(1),
  availableFrom: z.string().default('08:00'),
  availableTo: z.string().default('18:00'),
  workDays: z.array(z.number()).min(1).default([1, 2, 3, 4, 5]),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const walkers = await prisma.walker.findMany({
      include: {
        user: true,
        assignedVehicle: true,
      },
      orderBy: {
        user: { name: 'asc' },
      },
    })

    return NextResponse.json(walkers)
  } catch (error) {
    console.error('Error fetching walkers:', error)
    return NextResponse.json(
      { error: 'Walker konnten nicht geladen werden' },
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
    const validatedData = walkerSchema.parse(body)

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'E-Mail-Adresse wird bereits verwendet' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(validatedData.password)
    const employeeNumber = generateEmployeeNumber()

    // Create user and walker in transaction
    const walker = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          phone: validatedData.phone,
          role: 'WALKER',
        },
      })

      return tx.walker.create({
        data: {
          userId: user.id,
          employeeNumber,
          startDate: new Date(),
          hourlyRate: validatedData.hourlyRate,
          maxDogs: validatedData.maxDogs,
          canDriveCar: validatedData.canDriveCar,
          workAreas: validatedData.workAreas,
          availableFrom: validatedData.availableFrom,
          availableTo: validatedData.availableTo,
          workDays: validatedData.workDays,
        },
        include: {
          user: true,
        },
      })
    })

    return NextResponse.json(walker, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating walker:', error)
    return NextResponse.json(
      { error: 'Walker konnte nicht erstellt werden' },
      { status: 500 }
    )
  }
}
