import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user.walkerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const pending = searchParams.get('pending') === 'true'

    let where: any = {
      walkerId: session.user.walkerId,
    }

    if (date) {
      const selectedDate = new Date(date)
      selectedDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(selectedDate)
      nextDay.setDate(nextDay.getDate() + 1)

      where.date = {
        gte: selectedDate,
        lt: nextDay,
      }
    } else {
      where.date = {
        gte: new Date(),
      }
    }

    if (pending) {
      where.acceptedByWalker = false
    }

    const slots = await prisma.walkSlot.findMany({
      where,
      include: {
        bookings: {
          include: {
            customer: {
              include: { user: true },
            },
            bookingDogs: {
              include: { dog: true },
            },
            service: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })

    return NextResponse.json(slots)
  } catch (error) {
    console.error('Error fetching walk slots:', error)
    return NextResponse.json(
      { error: 'Termine konnten nicht geladen werden' },
      { status: 500 }
    )
  }
}
