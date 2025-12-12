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
import { Users, Plus, Mail, Phone, Car, MapPin, Clock } from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminWalkersPage() {
  const walkers = await prisma.walker.findMany({
    include: {
      user: true,
      assignedVehicle: true,
      walkSlots: {
        where: {
          date: { gte: new Date() },
        },
        take: 5,
      },
    },
    orderBy: {
      user: { name: 'asc' },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Walker-Verwaltung</h1>
          <p className="text-gray-500">Verwalten Sie Ihre Mitarbeiter</p>
        </div>
        <Link href="/admin/walkers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neuer Walker
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 rounded-full p-3">
                <Users className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Aktive Walker</p>
                <p className="text-2xl font-bold">
                  {walkers.filter((w) => w.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 rounded-full p-3">
                <Car className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Mit Fahrzeug</p>
                <p className="text-2xl font-bold">
                  {walkers.filter((w) => w.assignedVehicle).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 rounded-full p-3">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Heute im Einsatz</p>
                <p className="text-2xl font-bold">
                  {walkers.filter((w) => w.walkSlots.length > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Walkers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Walker</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Kontakt</TableHead>
                <TableHead>Mitarbeiter-Nr.</TableHead>
                <TableHead>Arbeitszeiten</TableHead>
                <TableHead>Gebiete</TableHead>
                <TableHead>Fahrzeug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {walkers.map((walker) => (
                <TableRow key={walker.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-500 font-semibold">
                          {walker.user.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{walker.user.name}</p>
                        <p className="text-sm text-gray-500">Max {walker.maxDogs} Hunde</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {walker.user.email}
                      </p>
                      {walker.user.phone && (
                        <p className="text-sm flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {walker.user.phone}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{walker.employeeNumber}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{walker.availableFrom} - {walker.availableTo} Uhr</p>
                      <p className="text-gray-500">
                        {walker.workDays.map((d) => ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d]).join(', ')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {walker.workAreas.slice(0, 3).map((area) => (
                        <Badge key={area} variant="secondary" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                      {walker.workAreas.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{walker.workAreas.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {walker.assignedVehicle ? (
                      <Badge variant="info">
                        {walker.assignedVehicle.licensePlate}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Keines</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={walker.isActive ? 'success' : 'secondary'}>
                      {walker.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/walkers/${walker.id}`}>
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                      </Link>
                      <Link href={`/admin/walkers/${walker.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Bearbeiten
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
