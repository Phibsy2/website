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

    if (slot.acceptedByWalker) {
      return NextResponse.json(
        { error: 'Termin wurde bereits angenommen' },
        { status: 400 }
      )
    }

    const updatedSlot = await prisma.walkSlot.update({
      where: { id: params.id },
      data: {
        acceptedByWalker: true,
        acceptedAt: new Date(),
      },
    })

    // Update all bookings in this slot to CONFIRMED
    await prisma.booking.updateMany({
      where: { walkSlotId: params.id },
      data: { status: 'CONFIRMED' },
    })

    // TODO: Send confirmation notifications to customers

    return NextResponse.json(updatedSlot)
  } catch (error) {
    console.error('Error accepting walk slot:', error)
    return NextResponse.json(
      { error: 'Termin konnte nicht angenommen werden' },
      { status: 500 }
    )
  }
}
