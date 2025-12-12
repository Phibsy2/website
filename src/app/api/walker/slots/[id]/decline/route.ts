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
      include: {
        bookings: true,
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
        { error: 'Termin wurde bereits angenommen und kann nicht mehr abgelehnt werden' },
        { status: 400 }
      )
    }

    // Update all bookings back to PENDING so they can be reassigned
    await prisma.booking.updateMany({
      where: { walkSlotId: params.id },
      data: {
        status: 'PENDING',
        walkSlotId: null,
      },
    })

    // Delete the walk slot
    await prisma.walkSlot.delete({
      where: { id: params.id },
    })

    // TODO: Try to reassign bookings to another walker
    // TODO: Notify admin about declined slot

    return NextResponse.json({ message: 'Termin abgelehnt' })
  } catch (error) {
    console.error('Error declining walk slot:', error)
    return NextResponse.json(
      { error: 'Termin konnte nicht abgelehnt werden' },
      { status: 500 }
    )
  }
}
