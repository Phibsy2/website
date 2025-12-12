import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Dog, Clock, Plus, ArrowRight } from 'lucide-react'
import { formatDate, formatTime, getStatusLabel, getStatusColor } from '@/lib/utils'

export default async function CustomerDashboard() {
  const session = await getServerSession(authOptions)

  if (!session?.user.customerId) {
    return <div>Kundendaten nicht gefunden</div>
  }

  // Fetch customer data with upcoming bookings and dogs
  const customer = await prisma.customer.findUnique({
    where: { id: session.user.customerId },
    include: {
      dogs: {
        where: { isActive: true },
      },
      bookings: {
        where: {
          requestedDate: {
            gte: new Date(),
          },
          status: {
            not: 'CANCELLED',
          },
        },
        include: {
          service: true,
          bookingDogs: {
            include: {
              dog: true,
            },
          },
          walkSlot: {
            include: {
              walker: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
        orderBy: {
          requestedDate: 'asc',
        },
        take: 5,
      },
    },
  })

  if (!customer) {
    return <div>Kundendaten nicht gefunden</div>
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Willkommen, {session.user.name}!
        </h1>
        <p className="opacity-90">
          Verwalten Sie hier Ihre Termine und Hunde
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/customer/booking">
          <Card className="hover:border-orange-200 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-orange-100 rounded-full p-3">
                  <Calendar className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold">Termin buchen</p>
                  <p className="text-sm text-gray-500">Neuen Spaziergang</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/customer/dogs/new">
          <Card className="hover:border-orange-200 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 rounded-full p-3">
                  <Plus className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="font-semibold">Hund hinzufuegen</p>
                  <p className="text-sm text-gray-500">Neuer Vierbeiner</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 rounded-full p-3">
                <Dog className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="font-semibold">{customer.dogs.length}</p>
                <p className="text-sm text-gray-500">Registrierte Hunde</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 rounded-full p-3">
                <Clock className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="font-semibold">{customer.bookings.length}</p>
                <p className="text-sm text-gray-500">Anstehende Termine</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Naechste Termine</CardTitle>
              <CardDescription>Ihre anstehenden Spaziergaenge</CardDescription>
            </div>
            <Link href="/customer/bookings">
              <Button variant="ghost" size="sm">
                Alle anzeigen <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {customer.bookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine anstehenden Termine</p>
                <Link href="/customer/booking">
                  <Button className="mt-4" size="sm">
                    Jetzt buchen
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {customer.bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded-lg">
                        <Calendar className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="font-medium">{booking.service.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(booking.requestedDate)} um{' '}
                          {formatTime(booking.requestedTimeStart)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {booking.bookingDogs.map((bd) => bd.dog.name).join(', ')}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dogs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Meine Hunde</CardTitle>
              <CardDescription>Ihre registrierten Vierbeiner</CardDescription>
            </div>
            <Link href="/customer/dogs">
              <Button variant="ghost" size="sm">
                Alle anzeigen <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {customer.dogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Dog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Noch keine Hunde registriert</p>
                <Link href="/customer/dogs/new">
                  <Button className="mt-4" size="sm">
                    Hund hinzufuegen
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {customer.dogs.map((dog) => (
                  <div
                    key={dog.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="bg-white p-2 rounded-full">
                      <Dog className="h-8 w-8 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{dog.name}</p>
                      <p className="text-sm text-gray-500">
                        {dog.breed || 'Mischling'} - {getStatusLabel(dog.size)}
                      </p>
                    </div>
                    <Badge variant={dog.friendlyWithDogs ? 'success' : 'warning'}>
                      {dog.friendlyWithDogs ? 'Sozial' : 'Einzelgaenger'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
