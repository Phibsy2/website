import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: List all dogs with group approval status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const pendingOnly = searchParams.get('pendingApproval') === 'true'
    const customerId = searchParams.get('customerId')

    const whereClause: Record<string, unknown> = {
      isActive: true,
    }

    if (pendingOnly) {
      whereClause.isGroupApproved = false
      whereClause.friendlyWithDogs = true // Only show dogs that are potentially groupable
    }

    if (customerId) {
      whereClause.customerId = customerId
    }

    const dogs = await prisma.dog.findMany({
      where: whereClause,
      include: {
        customer: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [
        { isGroupApproved: 'asc' }, // Pending first
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({
      dogs: dogs.map((dog) => ({
        id: dog.id,
        name: dog.name,
        breed: dog.breed,
        size: dog.size,
        weight: dog.weight,
        vaccinated: dog.vaccinated,
        neutered: dog.neutered,
        friendlyWithDogs: dog.friendlyWithDogs,
        friendlyWithPeople: dog.friendlyWithPeople,
        specialNeeds: dog.specialNeeds,
        isGroupApproved: dog.isGroupApproved,
        groupApprovedAt: dog.groupApprovedAt,
        groupApprovalNotes: dog.groupApprovalNotes,
        imageUrl: dog.imageUrl,
        customer: {
          id: dog.customer.id,
          name: dog.customer.user.name,
          email: dog.customer.user.email,
        },
      })),
      count: dogs.length,
    })
  } catch (error) {
    console.error('Error fetching dogs:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Hunde' },
      { status: 500 }
    )
  }
}
