import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Users,
  Dog,
  Car,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { formatDate, formatTime, formatPrice, getStatusLabel, getStatusColor } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function AdminDashboard() {
  // Get statistics
  const [
    totalBookings,
    pendingBookings,
    todayBookings,
    totalWalkers,
    activeWalkers,
    totalCustomers,
    totalDogs,
    totalVehicles,
    recentBookings,
    upcomingWalkSlots,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: 'PENDING' } }),
    prisma.booking.count({
      where: {
        requestedDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
    prisma.walker.count(),
    prisma.walker.count({ where: { isActive: true } }),
    prisma.customer.count(),
    prisma.dog.count({ where: { isActive: true } }),
    prisma.vehicle.count({ where: { isActive: true } }),
    prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { include: { user: true } },
        service: true,
        bookingDogs: { include: { dog: true } },
      },
    }),
    prisma.walkSlot.findMany({
      where: {
        date: { gte: new Date() },
        status: { in: ['OPEN', 'FULL'] },
      },
      take: 5,
      orderBy: { date: 'asc' },
      include: {
        walker: { include: { user: true } },
        bookings: {
          include: {
            bookingDogs: { include: { dog: true } },
          },
        },
      },
    }),
  ])

  // Calculate revenue (simplified)
  const monthlyRevenue = await prisma.booking.aggregate({
    _sum: { totalPrice: true },
    where: {
      status: 'COMPLETED',
      requestedDate: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
  })

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Heute Buchungen</p>
                <p className="text-3xl font-bold">{todayBookings}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <Badge variant="warning">{pendingBookings} ausstehend</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Aktive Walker</p>
                <p className="text-3xl font-bold">{activeWalkers}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <Users className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              von {totalWalkers} gesamt
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Registrierte Hunde</p>
                <p className="text-3xl font-bold">{totalDogs}</p>
              </div>
              <div className="bg-orange-100 rounded-full p-3">
                <Dog className="h-6 w-6 text-orange-500" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              {totalCustomers} Kunden
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Monatsumsatz</p>
                <p className="text-3xl font-bold">
                  {formatPrice(monthlyRevenue._sum.totalPrice || 0)}
                </p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              {totalBookings} Buchungen gesamt
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Neueste Buchungen</CardTitle>
              <CardDescription>Die letzten eingegangenen Buchungen</CardDescription>
            </div>
            <Link href="/admin/bookings">
              <Button variant="outline" size="sm">Alle anzeigen</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBookings.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Keine Buchungen vorhanden</p>
              ) : (
                recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg">
                        <Dog className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium">{booking.customer.user.name}</p>
                        <p className="text-sm text-gray-500">
                          {booking.service.name} - {formatDate(booking.requestedDate)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.bookingDogs.map((bd) => bd.dog.name).join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                      <p className="text-sm font-medium mt-1">
                        {formatPrice(booking.totalPrice)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Walk Slots */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Naechste Gruppentermine</CardTitle>
              <CardDescription>Anstehende Spaziergaenge</CardDescription>
            </div>
            <Link href="/admin/bookings">
              <Button variant="outline" size="sm">Alle anzeigen</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingWalkSlots.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Keine Termine geplant</p>
              ) : (
                upcomingWalkSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg">
                        <Clock className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {formatDate(slot.date)} - {slot.startTime} Uhr
                        </p>
                        <p className="text-sm text-gray-500">
                          Walker: {slot.walker.user.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {slot.currentDogs}/{slot.maxDogs} Hunde | PLZ {slot.areaPostalCode}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(slot.status)}>
                      {getStatusLabel(slot.status)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Schnellaktionen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/admin/walkers/new">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Neuer Walker
              </Button>
            </Link>
            <Link href="/admin/vehicles/new">
              <Button variant="outline" className="w-full justify-start">
                <Car className="mr-2 h-4 w-4" />
                Neues Fahrzeug
              </Button>
            </Link>
            <Link href="/admin/bookings?status=PENDING">
              <Button variant="outline" className="w-full justify-start">
                <AlertCircle className="mr-2 h-4 w-4" />
                Offene Buchungen
              </Button>
            </Link>
            <Link href="/admin/reports">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                Berichte
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
