import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Clock, Dog, MapPin, User, CheckCircle, XCircle } from 'lucide-react'
import { formatDate, formatTime, formatPrice, getStatusLabel, getStatusColor } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const statusFilter = searchParams.status || undefined

  const bookings = await prisma.booking.findMany({
    where: statusFilter ? { status: statusFilter as any } : undefined,
    orderBy: { requestedDate: 'desc' },
    include: {
      customer: {
        include: {
          user: true,
        },
      },
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
    take: 100,
  })

  const pendingCount = await prisma.booking.count({ where: { status: 'PENDING' } })
  const confirmedCount = await prisma.booking.count({ where: { status: 'CONFIRMED' } })
  const completedCount = await prisma.booking.count({ where: { status: 'COMPLETED' } })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Buchungen</h1>
          <p className="text-gray-500">Verwalten Sie alle Buchungen</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Exportieren</Button>
          <Button>Auto-Zuweisen</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Gesamt</p>
              <p className="text-2xl font-bold">{bookings.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-yellow-600">Ausstehend</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-green-600">Bestaetigt</p>
              <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Abgeschlossen</p>
              <p className="text-2xl font-bold text-gray-600">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Buchungen</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Alle</TabsTrigger>
              <TabsTrigger value="pending">Ausstehend</TabsTrigger>
              <TabsTrigger value="confirmed">Bestaetigt</TabsTrigger>
              <TabsTrigger value="completed">Abgeschlossen</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Hunde</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Walker</TableHead>
                    <TableHead>Preis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{booking.customer.user.name}</p>
                            <p className="text-sm text-gray-500">
                              {booking.customer.postalCode} {booking.customer.city}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{booking.service.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dog className="h-4 w-4 text-orange-500" />
                          {booking.bookingDogs.map((bd) => bd.dog.name).join(', ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <p>{formatDate(booking.requestedDate)}</p>
                            <p className="text-sm text-gray-500">
                              {formatTime(booking.requestedTimeStart)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {booking.walkSlot?.walker ? (
                          <span>{booking.walkSlot.walker.user.name}</span>
                        ) : (
                          <Badge variant="warning">Nicht zugewiesen</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatPrice(booking.totalPrice)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(booking.status)}>
                          {getStatusLabel(booking.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/admin/bookings/${booking.id}`}>
                            <Button variant="outline" size="sm">
                              Details
                            </Button>
                          </Link>
                          {booking.status === 'PENDING' && (
                            <Button size="sm" variant="default">
                              Zuweisen
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
