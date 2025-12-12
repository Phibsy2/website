import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user.walkerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { walkNotes } = body

    const slot = await prisma.walkSlot.findUnique({
      where: {
        id: params.id,
        walkerId: session.user.walkerId,
      },
    })

    if (!slot) {
      return NextResponse.json(
        { error: 'Termin nicht gefunden' },
        { status: 404 }
      )
    }

    if (slot.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Spaziergang muss erst gestartet werden' },
        { status: 400 }
      )
    }

    const updatedSlot = await prisma.walkSlot.update({
      where: { id: params.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        walkNotes: walkNotes || null,
      },
    })

    // Update all bookings to COMPLETED
    await prisma.booking.updateMany({
      where: { walkSlotId: params.id },
      data: { status: 'COMPLETED' },
    })

    // TODO: Send notification to customers that walk is completed
    // TODO: Generate invoice if needed

    return NextResponse.json(updatedSlot)
  } catch (error) {
    console.error('Error completing walk:', error)
    return NextResponse.json(
      { error: 'Spaziergang konnte nicht abgeschlossen werden' },
      { status: 500 }
    )
  }
}
