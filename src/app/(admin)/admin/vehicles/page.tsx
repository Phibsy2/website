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
import { Car, Plus, User, Calendar, Wrench, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminVehiclesPage() {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      assignedWalker: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      licensePlate: 'asc',
    },
  })

  // Check for service due
  const today = new Date()
  const serviceDueSoon = vehicles.filter(
    (v) => v.nextServiceDue && new Date(v.nextServiceDue) <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Fahrzeugverwaltung</h1>
          <p className="text-gray-500">Verwalten Sie Ihren Fuhrpark</p>
        </div>
        <Link href="/admin/vehicles/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neues Fahrzeug
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 rounded-full p-3">
                <Car className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Gesamt</p>
                <p className="text-2xl font-bold">{vehicles.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 rounded-full p-3">
                <Car className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Aktiv</p>
                <p className="text-2xl font-bold">
                  {vehicles.filter((v) => v.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 rounded-full p-3">
                <User className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Zugewiesen</p>
                <p className="text-2xl font-bold">
                  {vehicles.filter((v) => v.assignedWalker).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={serviceDueSoon.length > 0 ? 'border-yellow-300' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`rounded-full p-3 ${serviceDueSoon.length > 0 ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                <Wrench className={`h-6 w-6 ${serviceDueSoon.length > 0 ? 'text-yellow-500' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Service faellig</p>
                <p className="text-2xl font-bold">{serviceDueSoon.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Warnings */}
      {serviceDueSoon.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-800">Service faellig</p>
                <p className="text-sm text-yellow-700">
                  {serviceDueSoon.map((v) => v.licensePlate).join(', ')} - Service innerhalb der naechsten 30 Tage faellig
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Fahrzeuge</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kennzeichen</TableHead>
                <TableHead>Fahrzeug</TableHead>
                <TableHead>Kapazitaet</TableHead>
                <TableHead>Zugewiesen an</TableHead>
                <TableHead>Kilometerstand</TableHead>
                <TableHead>Naechster Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((vehicle) => {
                const serviceDue =
                  vehicle.nextServiceDue &&
                  new Date(vehicle.nextServiceDue) <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

                return (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {vehicle.licensePlate}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {vehicle.brand} {vehicle.model}
                        </p>
                        <p className="text-sm text-gray-500">
                          {vehicle.year} - {vehicle.color}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{vehicle.maxDogs} Hunde</Badge>
                    </TableCell>
                    <TableCell>
                      {vehicle.assignedWalker ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {vehicle.assignedWalker.user.name}
                        </div>
                      ) : (
                        <span className="text-gray-400">Nicht zugewiesen</span>
                      )}
                    </TableCell>
                    <TableCell>{vehicle.mileage.toLocaleString()} km</TableCell>
                    <TableCell>
                      {vehicle.nextServiceDue ? (
                        <div className={serviceDue ? 'text-yellow-600' : ''}>
                          <div className="flex items-center gap-1">
                            {serviceDue && <AlertTriangle className="h-4 w-4" />}
                            {formatDate(vehicle.nextServiceDue)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={vehicle.isActive ? 'success' : 'secondary'}>
                        {vehicle.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/vehicles/${vehicle.id}`}>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </Link>
                        <Link href={`/admin/vehicles/${vehicle.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Bearbeiten
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
