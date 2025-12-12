import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const approvalSchema = z.object({
  approved: z.boolean(),
  notes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { id: dogId } = await params
    const body = await request.json()

    const validationResult = approvalSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { approved, notes } = validationResult.data

    // Check if dog exists
    const dog = await prisma.dog.findUnique({
      where: { id: dogId },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!dog) {
      return NextResponse.json(
        { error: 'Hund nicht gefunden' },
        { status: 404 }
      )
    }

    // Check prerequisites for approval
    if (approved && !dog.friendlyWithDogs) {
      return NextResponse.json(
        { error: 'Hund ist nicht als hundefreundlich markiert' },
        { status: 400 }
      )
    }

    // Update dog
    const updatedDog = await prisma.dog.update({
      where: { id: dogId },
      data: {
        isGroupApproved: approved,
        groupApprovedAt: approved ? new Date() : null,
        groupApprovalNotes: notes || null,
      },
    })

    // Create notification for customer
    await prisma.notification.create({
      data: {
        userId: dog.customer.userId,
        type: 'DOG_GROUP_APPROVED',
        title: approved
          ? `${dog.name} ist jetzt für Gruppenspaziergänge freigegeben`
          : `${dog.name} ist nicht für Gruppenspaziergänge freigegeben`,
        message: approved
          ? `Ihr Hund ${dog.name} wurde für Gruppenspaziergänge freigegeben. Sie können jetzt an Gruppenterminen teilnehmen und dabei sparen!`
          : `Die Anfrage für ${dog.name} zur Teilnahme an Gruppenspaziergängen wurde abgelehnt.${notes ? ` Grund: ${notes}` : ''}`,
        link: '/customer/dogs',
      },
    })

    return NextResponse.json({
      success: true,
      dog: {
        id: updatedDog.id,
        name: updatedDog.name,
        isGroupApproved: updatedDog.isGroupApproved,
        groupApprovedAt: updatedDog.groupApprovedAt,
        groupApprovalNotes: updatedDog.groupApprovalNotes,
      },
      message: approved
        ? `${dog.name} wurde für Gruppenspaziergänge freigegeben`
        : `${dog.name} wurde nicht für Gruppenspaziergänge freigegeben`,
    })
  } catch (error) {
    console.error('Error approving dog for group:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Freigabe' },
      { status: 500 }
    )
  }
}
