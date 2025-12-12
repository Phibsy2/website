import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Clock,
  Dog,
  MapPin,
  Users,
  CheckCircle,
  AlertCircle,
  Navigation,
} from 'lucide-react'
import { formatDate, formatTime, getStatusLabel, getStatusColor } from '@/lib/utils'
import Link from 'next/link'

export default async function WalkerDashboard() {
  const session = await getServerSession(authOptions)

  if (!session?.user.walkerId) {
    return <div>Walker-Daten nicht gefunden</div>
  }

  const walker = await prisma.walker.findUnique({
    where: { id: session.user.walkerId },
    include: {
      user: true,
      assignedVehicle: true,
    },
  })

  if (!walker) {
    return <div>Walker nicht gefunden</div>
  }

  // Get today's walk slots
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todaySlots = await prisma.walkSlot.findMany({
    where: {
      walkerId: walker.id,
      date: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      bookings: {
        include: {
          customer: {
            include: {
              user: true,
            },
          },
          bookingDogs: {
            include: {
              dog: true,
            },
          },
        },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  })

  // Get pending slots (not yet accepted)
  const pendingSlots = await prisma.walkSlot.findMany({
    where: {
      walkerId: walker.id,
      acceptedByWalker: false,
      date: { gte: today },
    },
    include: {
      bookings: {
        include: {
          bookingDogs: true,
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
    take: 5,
  })

  // Calculate stats
  const totalDogsToday = todaySlots.reduce(
    (sum, slot) => sum + slot.bookings.reduce((s, b) => s + b.bookingDogs.length, 0),
    0
  )

  const completedToday = todaySlots.filter((s) => s.status === 'COMPLETED').length
  const remainingToday = todaySlots.filter((s) => s.status !== 'COMPLETED').length

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-500 to-green-400 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Hallo, {session.user.name}!
        </h1>
        <p className="opacity-90">
          {todaySlots.length > 0
            ? `Du hast heute ${todaySlots.length} Spaziergaenge mit ${totalDogsToday} Hunden`
            : 'Heute keine Spaziergaenge geplant'}
        </p>
        {walker.assignedVehicle && (
          <div className="mt-2 flex items-center gap-2 opacity-90">
            <Navigation className="h-4 w-4" />
            Fahrzeug: {walker.assignedVehicle.brand} {walker.assignedVehicle.model} ({walker.assignedVehicle.licensePlate})
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 rounded-full p-3">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todaySlots.length}</p>
                <p className="text-sm text-gray-500">Termine heute</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 rounded-full p-3">
                <Dog className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDogsToday}</p>
                <p className="text-sm text-gray-500">Hunde heute</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedToday}</p>
                <p className="text-sm text-gray-500">Abgeschlossen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-100 rounded-full p-3">
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingSlots.length}</p>
                <p className="text-sm text-gray-500">Offene Anfragen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Heutiger Zeitplan
            </CardTitle>
            <CardDescription>{formatDate(today)}</CardDescription>
          </CardHeader>
          <CardContent>
            {todaySlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine Termine fuer heute</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todaySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      slot.status === 'COMPLETED'
                        ? 'bg-gray-50 border-gray-300'
                        : slot.status === 'IN_PROGRESS'
                          ? 'bg-green-50 border-green-500'
                          : 'bg-white border-orange-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {slot.startTime} - {slot.endTime} Uhr
                        </span>
                      </div>
                      <Badge className={getStatusColor(slot.status)}>
                        {getStatusLabel(slot.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <MapPin className="h-4 w-4" />
                      PLZ {slot.areaPostalCode}
                    </div>
                    <div className="space-y-2">
                      {slot.bookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Dog className="h-4 w-4 text-orange-500" />
                          <span>
                            {booking.bookingDogs.map((bd) => bd.dog.name).join(', ')}
                          </span>
                          <span className="text-gray-400">-</span>
                          <span className="text-gray-500">
                            {booking.customer.user.name}
                          </span>
                        </div>
                      ))}
                    </div>
                    {slot.status !== 'COMPLETED' && (
                      <div className="mt-3 flex gap-2">
                        {slot.status === 'OPEN' || slot.status === 'FULL' ? (
                          <Button size="sm" className="w-full">
                            Spaziergang starten
                          </Button>
                        ) : (
                          <Button size="sm" variant="success" className="w-full">
                            Abschliessen
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Offene Anfragen
            </CardTitle>
            <CardDescription>Neue Termine zur Annahme</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine offenen Anfragen</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSlots.map((slot) => (
                  <div key={slot.id} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{formatDate(slot.date)}</p>
                        <p className="text-sm text-gray-500">
                          {slot.startTime} - {slot.endTime} Uhr
                        </p>
                      </div>
                      <Badge variant="warning">Neu</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        PLZ {slot.areaPostalCode}
                      </span>
                      <span className="flex items-center gap-1">
                        <Dog className="h-4 w-4" />
                        {slot.bookings.reduce((s, b) => s + b.bookingDogs.length, 0)} Hunde
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" className="flex-1">
                        Annehmen
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        Ablehnen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Link href="/walker/pending">
                <Button variant="outline" className="w-full">
                  Alle Anfragen anzeigen
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
