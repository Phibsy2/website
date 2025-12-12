import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const dogSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  breed: z.string().nullable().optional(),
  size: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']),
  birthDate: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
  vaccinated: z.boolean().default(false),
  neutered: z.boolean().default(false),
  friendlyWithDogs: z.boolean().default(true),
  friendlyWithPeople: z.boolean().default(true),
  specialNeeds: z.string().nullable().optional(),
  veterinarian: z.string().nullable().optional(),
  vetPhone: z.string().nullable().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user.customerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const dogs = await prisma.dog.findMany({
      where: {
        customerId: session.user.customerId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(dogs)
  } catch (error) {
    console.error('Error fetching dogs:', error)
    return NextResponse.json(
      { error: 'Hunde konnten nicht geladen werden' },
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
    const validatedData = dogSchema.parse(body)

    const dog = await prisma.dog.create({
      data: {
        customerId: session.user.customerId,
        name: validatedData.name,
        breed: validatedData.breed,
        size: validatedData.size,
        birthDate: validatedData.birthDate ? new Date(validatedData.birthDate) : null,
        weight: validatedData.weight,
        vaccinated: validatedData.vaccinated,
        neutered: validatedData.neutered,
        friendlyWithDogs: validatedData.friendlyWithDogs,
        friendlyWithPeople: validatedData.friendlyWithPeople,
        specialNeeds: validatedData.specialNeeds,
        veterinarian: validatedData.veterinarian,
        vetPhone: validatedData.vetPhone,
      },
    })

    return NextResponse.json(dog, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating dog:', error)
    return NextResponse.json(
      { error: 'Hund konnte nicht hinzugefuegt werden' },
      { status: 500 }
    )
  }
}
