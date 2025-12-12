import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { joinGroupSlot } from '@/lib/group-scheduling'
import { z } from 'zod'

const joinSchema = z.object({
  slotId: z.string().min(1, 'Slot-ID ist erforderlich'),
  dogIds: z.array(z.string()).min(1, 'Mindestens ein Hund muss ausgewählt werden'),
  timeStart: z.string().regex(/^\d{2}:\d{2}$/, 'Ungültiges Zeitformat'),
  timeEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Ungültiges Zeitformat'),
})

export async function POST(request: NextRequest) {
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

    const body = await request.json()

    // Validate input
    const validationResult = joinSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { slotId, dogIds, timeStart, timeEnd } = validationResult.data

    // Join the group slot
    const result = await joinGroupSlot(
      slotId,
      customerId,
      dogIds,
      timeStart,
      timeEnd
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      bookingId: result.bookingId,
      message: 'Erfolgreich dem Gruppenspaziergang beigetreten',
    })
  } catch (error) {
    console.error('Error joining group slot:', error)
    return NextResponse.json(
      { error: 'Fehler beim Beitreten zum Gruppenspaziergang' },
      { status: 500 }
    )
  }
}
