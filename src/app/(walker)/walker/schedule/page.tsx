import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Dog, MapPin, Phone, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate, formatTime, getStatusLabel, getStatusColor } from '@/lib/utils'
import Link from 'next/link'

export default async function WalkerSchedulePage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user.walkerId) {
    return <div>Walker-Daten nicht gefunden</div>
  }

  // Parse date from query or use today
  const selectedDate = searchParams.date ? new Date(searchParams.date) : new Date()
  selectedDate.setHours(0, 0, 0, 0)

  const nextDay = new Date(selectedDate)
  nextDay.setDate(nextDay.getDate() + 1)

  const prevDay = new Date(selectedDate)
  prevDay.setDate(prevDay.getDate() - 1)

  // Get walk slots for the selected day
  const walkSlots = await prisma.walkSlot.findMany({
    where: {
      walkerId: session.user.walkerId,
      date: {
        gte: selectedDate,
        lt: nextDay,
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
          service: true,
        },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  })

  // Get week days for navigation
  const weekDays = []
  const startOfWeek = new Date(selectedDate)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1) // Monday
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek)
    day.setDate(day.getDate() + i)
    weekDays.push(day)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mein Zeitplan</h1>
          <p className="text-gray-500">Ihre geplanten Spaziergaenge</p>
        </div>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <Link href={`/walker/schedule?date=${prevDay.toISOString().split('T')[0]}`}>
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h2 className="text-lg font-semibold">{formatDate(selectedDate)}</h2>
            <Link href={`/walker/schedule?date=${nextDay.toISOString().split('T')[0]}`}>
              <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Week View */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const isSelected = day.toDateString() === selectedDate.toDateString()
              const isToday = day.toDateString() === new Date().toDateString()
              return (
                <Link
                  key={day.toISOString()}
                  href={`/walker/schedule?date=${day.toISOString().split('T')[0]}`}
                >
                  <div
                    className={`text-center p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-green-500 text-white'
                        : isToday
                          ? 'bg-green-100 text-green-700'
                          : 'hover:bg-gray-100'
                    }`}
                  >
                    <p className="text-xs">
                      {['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][day.getDay()]}
                    </p>
                    <p className="font-semibold">{day.getDate()}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      {walkSlots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Keine Termine</h3>
            <p className="text-gray-500">
              Fuer diesen Tag sind keine Spaziergaenge geplant
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {walkSlots.map((slot) => (
            <Card key={slot.id} className="overflow-hidden">
              <div
                className={`h-2 ${
                  slot.status === 'COMPLETED'
                    ? 'bg-gray-400'
                    : slot.status === 'IN_PROGRESS'
                      ? 'bg-green-500'
                      : 'bg-orange-500'
                }`}
              />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <Clock className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {slot.startTime} - {slot.endTime} Uhr
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="h-4 w-4" />
                        PLZ {slot.areaPostalCode}
                        <span className="mx-2">|</span>
                        <Dog className="h-4 w-4" />
                        {slot.currentDogs}/{slot.maxDogs} Hunde
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(slot.status)}>
                    {getStatusLabel(slot.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {slot.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {booking.customer.user.name}
                          </span>
                        </div>
                        <Badge variant="outline">{booking.service.name}</Badge>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-500">
                          <MapPin className="h-4 w-4" />
                          {booking.useCustomerAddress
                            ? `${booking.customer.street} ${booking.customer.houseNumber}, ${booking.customer.city}`
                            : `${booking.pickupStreet} ${booking.pickupHouseNumber}, ${booking.pickupCity}`}
                        </div>
                        {booking.customer.user.phone && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Phone className="h-4 w-4" />
                            {booking.customer.user.phone}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Dog className="h-4 w-4 text-orange-500" />
                        {booking.bookingDogs.map((bd) => (
                          <Badge key={bd.dog.id} variant="secondary">
                            {bd.dog.name} ({getStatusLabel(bd.dog.size)})
                          </Badge>
                        ))}
                      </div>
                      {booking.customerNotes && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-800">
                          Hinweis: {booking.customerNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                {slot.status !== 'COMPLETED' && (
                  <div className="mt-4 flex gap-2">
                    {slot.status === 'OPEN' || slot.status === 'FULL' ? (
                      <>
                        <Button className="flex-1">Spaziergang starten</Button>
                        <Button variant="outline">Navigation</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="success" className="flex-1">
                          Abschliessen
                        </Button>
                        <Button variant="outline">Notizen hinzufuegen</Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
