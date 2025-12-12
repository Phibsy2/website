import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGroupEligibleDogs } from '@/lib/group-scheduling'

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

    const { eligible, ineligible } = await getGroupEligibleDogs(customerId)

    return NextResponse.json({
      eligible,
      ineligible,
      hasEligibleDogs: eligible.length > 0,
    })
  } catch (error) {
    console.error('Error fetching group eligible dogs:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Hunde' },
      { status: 500 }
    )
  }
}
