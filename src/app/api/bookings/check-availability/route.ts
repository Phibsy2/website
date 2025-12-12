import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { findAvailableSlots } from '@/lib/scheduling'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user.customerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const body = await request.json()
    const { date, timeStart, timeEnd, dogsCount, postalCode } = body

    if (!date || !timeStart || !timeEnd || !dogsCount) {
      return NextResponse.json(
        { error: 'Fehlende Parameter' },
        { status: 400 }
      )
    }

    // Get customer's postal code if not provided
    let checkPostalCode = postalCode
    if (!checkPostalCode) {
      const customer = await prisma.customer.findUnique({
        where: { id: session.user.customerId },
        select: { postalCode: true },
      })
      checkPostalCode = customer?.postalCode
    }

    if (!checkPostalCode) {
      return NextResponse.json(
        { error: 'Postleitzahl nicht gefunden' },
        { status: 400 }
      )
    }

    const result = await findAvailableSlots(
      new Date(date),
      timeStart,
      timeEnd,
      checkPostalCode,
      undefined,
      undefined,
      dogsCount
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json(
      { error: 'Verfuegbarkeit konnte nicht geprueft werden' },
      { status: 500 }
    )
  }
}
