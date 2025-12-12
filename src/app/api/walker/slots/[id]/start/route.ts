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

    if (!slot.acceptedByWalker) {
      return NextResponse.json(
        { error: 'Termin muss erst angenommen werden' },
        { status: 400 }
      )
    }

    if (slot.status === 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Spaziergang laeuft bereits' },
        { status: 400 }
      )
    }

    if (slot.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Spaziergang wurde bereits abgeschlossen' },
        { status: 400 }
      )
    }

    const updatedSlot = await prisma.walkSlot.update({
      where: { id: params.id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    })

    // Update all bookings to IN_PROGRESS
    await prisma.booking.updateMany({
      where: { walkSlotId: params.id },
      data: { status: 'IN_PROGRESS' },
    })

    // TODO: Send notification to customers that walk has started

    return NextResponse.json(updatedSlot)
  } catch (error) {
    console.error('Error starting walk:', error)
    return NextResponse.json(
      { error: 'Spaziergang konnte nicht gestartet werden' },
      { status: 500 }
    )
  }
}
