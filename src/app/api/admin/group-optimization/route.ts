import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runGroupOptimization, optimizeGroupsForDate } from '@/lib/group-scheduling'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const optimizationSchema = z.object({
  date: z.string().min(1, 'Datum ist erforderlich'),
  maxRadius: z.number().min(0.5).max(10).optional().default(2.0),
  maxTimeGap: z.number().min(0).max(120).optional().default(30),
  apply: z.boolean().optional().default(false),
})

// GET: Preview optimization or get optimization history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const historyOnly = searchParams.get('history') === 'true'

    if (historyOnly) {
      // Return optimization history
      const history = await prisma.groupOptimizationRun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      return NextResponse.json({ history })
    }

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Datum ist erforderlich' },
        { status: 400 }
      )
    }

    const maxRadius = parseFloat(searchParams.get('maxRadius') || '2.0')
    const maxTimeGap = parseInt(searchParams.get('maxTimeGap') || '30')
    const date = new Date(dateParam)

    // Preview optimization (don't apply)
    const result = await optimizeGroupsForDate(date, maxRadius, maxTimeGap)

    return NextResponse.json({
      preview: true,
      date: dateParam,
      ...result,
      groups: result.groups.map((g) => ({
        bookings: g.bookings.map((b) => ({
          id: b.id,
          customerName: b.customer.user.name,
          dogs: b.bookingDogs.map((bd) => ({
            name: bd.dog.name,
            size: bd.dog.size,
          })),
          timeWindow: {
            start: b.requestedTimeStart,
            end: b.requestedTimeEnd,
          },
        })),
        center: g.center,
        radius: g.radius,
        timeWindow: g.timeWindow,
        totalDogs: g.totalDogs,
        score: g.score,
        totalDistance: g.totalDistance,
        walkerId: g.walkerId,
        walkerName: g.walkerName,
      })),
      ungroupedBookings: result.ungroupedBookings.map((b) => ({
        id: b.id,
        customerName: b.customer.user.name,
        dogs: b.bookingDogs.map((bd) => bd.dog.name),
        timeWindow: {
          start: b.requestedTimeStart,
          end: b.requestedTimeEnd,
        },
        reason: !b.bookingDogs.every((bd) => bd.dog.isGroupApproved)
          ? 'Hunde nicht für Gruppen freigegeben'
          : b.customer.groupPreference === 'SOLO_ONLY'
          ? 'Kunde bevorzugt Einzelspaziergänge'
          : 'Keine passende Gruppe gefunden',
      })),
    })
  } catch (error) {
    console.error('Error previewing group optimization:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Gruppenoptimierung' },
      { status: 500 }
    )
  }
}

// POST: Run and apply optimization
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const validationResult = optimizationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { date, maxRadius, maxTimeGap, apply } = validationResult.data

    const { runId, result, applied } = await runGroupOptimization(
      new Date(date),
      maxRadius,
      maxTimeGap,
      apply
    )

    return NextResponse.json({
      success: true,
      runId,
      applied: apply,
      stats: result.stats,
      errors: result.errors,
      appliedResults: applied,
    })
  } catch (error) {
    console.error('Error running group optimization:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Gruppenoptimierung' },
      { status: 500 }
    )
  }
}
