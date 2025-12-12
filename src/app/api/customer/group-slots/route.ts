import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { findAvailableGroupSlots } from '@/lib/group-scheduling'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const customerId = session.user.customerId
    if (!customerId) {
      return NextResponse.json(
        { error: 'Kundenprofil nicht gefunden' },
        { status: 404 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const dogIds = searchParams.get('dogs')?.split(',').filter(Boolean) || []
    const maxRadius = parseFloat(searchParams.get('maxRadius') || '2.0')

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Datum ist erforderlich' },
        { status: 400 }
      )
    }

    if (dogIds.length === 0) {
      return NextResponse.json(
        { error: 'Mindestens ein Hund muss ausgewählt werden' },
        { status: 400 }
      )
    }

    const date = new Date(dateParam)

    // Find available group slots
    const availableSlots = await findAvailableGroupSlots(
      customerId,
      date,
      dogIds,
      maxRadius
    )

    return NextResponse.json({
      slots: availableSlots,
      count: availableSlots.length,
    })
  } catch (error) {
    console.error('Error fetching group slots:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Gruppentermine' },
      { status: 500 }
    )
  }
}
