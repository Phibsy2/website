import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dog, Plus, Edit, Heart, Syringe, Scale } from 'lucide-react'
import { getStatusLabel } from '@/lib/utils'

export default async function DogsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user.customerId) {
    return <div>Kundendaten nicht gefunden</div>
  }

  const dogs = await prisma.dog.findMany({
    where: {
      customerId: session.user.customerId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Meine Hunde</h1>
          <p className="text-gray-500">Verwalten Sie Ihre registrierten Vierbeiner</p>
        </div>
        <Link href="/customer/dogs/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Hund hinzufuegen
          </Button>
        </Link>
      </div>

      {dogs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Dog className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Noch keine Hunde registriert</h3>
            <p className="text-gray-500 mb-4">
              Fuegen Sie Ihren ersten Hund hinzu, um Termine zu buchen
            </p>
            <Link href="/customer/dogs/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Hund hinzufuegen
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dogs.map((dog) => (
            <Card key={dog.id} className="overflow-hidden">
              <div className="bg-gradient-to-r from-orange-400 to-orange-500 p-6">
                <div className="flex items-center gap-4">
                  <div className="bg-white rounded-full p-3">
                    <Dog className="h-8 w-8 text-orange-500" />
                  </div>
                  <div className="text-white">
                    <h3 className="text-xl font-bold">{dog.name}</h3>
                    <p className="opacity-90">{dog.breed || 'Mischling'}</p>
                  </div>
                </div>
              </div>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      Groesse
                    </span>
                    <Badge>{getStatusLabel(dog.size)}</Badge>
                  </div>
                  {dog.weight && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Gewicht</span>
                      <span>{dog.weight} kg</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Syringe className="h-4 w-4" />
                      Geimpft
                    </span>
                    <Badge variant={dog.vaccinated ? 'success' : 'warning'}>
                      {dog.vaccinated ? 'Ja' : 'Nein'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Kastriert
                    </span>
                    <Badge variant={dog.neutered ? 'success' : 'secondary'}>
                      {dog.neutered ? 'Ja' : 'Nein'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Vertraeglich</span>
                    <div className="flex gap-2">
                      <Badge variant={dog.friendlyWithDogs ? 'success' : 'warning'}>
                        {dog.friendlyWithDogs ? 'Hunde' : ''}
                      </Badge>
                      <Badge variant={dog.friendlyWithPeople ? 'success' : 'warning'}>
                        {dog.friendlyWithPeople ? 'Menschen' : ''}
                      </Badge>
                    </div>
                  </div>
                  {dog.specialNeeds && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-gray-500">Besonderheiten:</p>
                      <p className="text-sm">{dog.specialNeeds}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Link href={`/customer/dogs/${dog.id}/edit`}>
                    <Button variant="outline" className="w-full">
                      <Edit className="mr-2 h-4 w-4" />
                      Bearbeiten
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
