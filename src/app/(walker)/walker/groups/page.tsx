'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Calendar,
  Clock,
  Dog,
  MapPin,
  Phone,
  User,
  Users,
  Navigation,
  Route,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Play,
  AlertCircle,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface GroupSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  isGroupSlot: boolean
  currentDogs: number
  maxDogs: number
  acceptedByWalker: boolean
  groupRadius: number | null
  groupRadiusFormatted: string | null
  centerLatitude: number | null
  centerLongitude: number | null
  totalDistance: number | null
  totalDistanceFormatted: string | null
  optimizationScore: number | null
  areaPostalCode: string
  routeWaypoints: Array<{ latitude: number; longitude: number }> | null
  bookings: {
    id: string
    status: string
    isGroupBooking: boolean
    totalPrice: number
    groupDiscount: number
    customerNotes: string | null
    customer: {
      id: string
      name: string
      phone: string | null
      street: string
      houseNumber: string
      postalCode: string
      city: string
      latitude: number | null
      longitude: number | null
    }
    dogs: {
      id: string
      name: string
      breed: string | null
      size: string
      imageUrl: string | null
      specialNeeds: string | null
      notes: string | null
    }[]
  }[]
}

export default function WalkerGroupsPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [isLoading, setIsLoading] = useState(true)
  const [groupSlots, setGroupSlots] = useState<GroupSlot[]>([])
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchGroupSlots = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/walker/group-slots?date=${selectedDate}&groupOnly=true`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Laden')
      }

      setGroupSlots(data.slots || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGroupSlots()
  }, [selectedDate])

  const handleAcceptSlot = async (slotId: string) => {
    setActionLoading(slotId)
    try {
      const response = await fetch(`/api/walker/slots/${slotId}/accept`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Akzeptieren')
      }

      fetchGroupSlots()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setActionLoading(null)
    }
  }

  const handleStartWalk = async (slotId: string) => {
    setActionLoading(slotId)
    try {
      const response = await fetch(`/api/walker/slots/${slotId}/start`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Starten')
      }

      fetchGroupSlots()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCompleteWalk = async (slotId: string) => {
    setActionLoading(slotId)
    try {
      const response = await fetch(`/api/walker/slots/${slotId}/complete`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler beim Abschliessen')
      }

      fetchGroupSlots()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getDogSizeLabel = (size: string) => {
    const sizes: Record<string, string> = {
      SMALL: 'Klein',
      MEDIUM: 'Mittel',
      LARGE: 'Gross',
      EXTRA_LARGE: 'Sehr gross',
    }
    return sizes[size] || size
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-800',
      FULL: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      OPEN: 'Offen',
      FULL: 'Voll',
      IN_PROGRESS: 'Laeuft',
      COMPLETED: 'Abgeschlossen',
      CANCELLED: 'Abgesagt',
    }
    return labels[status] || status
  }

  const openGoogleMaps = (slot: GroupSlot) => {
    // Create waypoints URL for Google Maps
    if (!slot.bookings.length) return

    const waypoints = slot.bookings
      .filter((b) => b.customer.latitude && b.customer.longitude)
      .map((b) => `${b.customer.latitude},${b.customer.longitude}`)

    if (waypoints.length === 0) return

    const origin = waypoints[0]
    const destination = waypoints[waypoints.length - 1]
    const waypointsParam = waypoints.length > 2 ? waypoints.slice(1, -1).join('|') : ''

    let url = `https://www.google.com/maps/dir/${origin}`
    if (waypointsParam) {
      url += `/${waypointsParam}`
    }
    url += `/${destination}`

    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-green-500" />
            Gruppenspaziergaenge
          </h1>
          <p className="text-gray-500">Verwalten Sie Ihre Gruppentouren</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Route className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Optimierte Routen</p>
              <p className="text-sm text-green-700">
                Gruppenspaziergaenge sind nach Standort optimiert.
                Die Kunden sind geografisch nahe beieinander, um effiziente Abholrouten zu ermoeglichen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-gray-400" />
            <p className="mt-4 text-gray-500">Lade Gruppentermine...</p>
          </CardContent>
        </Card>
      ) : groupSlots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">Keine Gruppenspaziergaenge</h3>
            <p className="text-gray-500">
              Fuer {formatDate(selectedDate)} sind keine Gruppenspaziergaenge geplant
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupSlots.map((slot) => (
            <Card key={slot.id} className="overflow-hidden">
              <div
                className={`h-2 ${
                  slot.status === 'COMPLETED'
                    ? 'bg-gray-400'
                    : slot.status === 'IN_PROGRESS'
                      ? 'bg-green-500 animate-pulse'
                      : slot.status === 'FULL'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                }`}
              />
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpandedSlot(expandedSlot === slot.id ? null : slot.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 rounded-lg p-3">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {slot.startTime} - {slot.endTime} Uhr
                        <Badge variant="outline" className="ml-2">
                          Gruppenspaziergang
                        </Badge>
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Dog className="h-4 w-4" />
                          {slot.currentDogs}/{slot.maxDogs} Hunde
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          PLZ {slot.areaPostalCode}
                        </span>
                        {slot.groupRadiusFormatted && (
                          <span className="flex items-center gap-1">
                            <Navigation className="h-4 w-4" />
                            Radius: {slot.groupRadiusFormatted}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {slot.bookings.length} Kunden
                        </span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(slot.status)}>
                      {getStatusLabel(slot.status)}
                    </Badge>
                    {expandedSlot === slot.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {expandedSlot === slot.id && (
                <CardContent>
                  {/* Optimization Info */}
                  {(slot.totalDistanceFormatted || slot.optimizationScore) && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-4 text-sm">
                      <Route className="h-5 w-5 text-blue-600" />
                      <div className="flex gap-6">
                        {slot.totalDistanceFormatted && (
                          <span>
                            <strong>Gesamtstrecke:</strong> {slot.totalDistanceFormatted}
                          </span>
                        )}
                        {slot.optimizationScore && (
                          <span>
                            <strong>Optimierungsscore:</strong> {slot.optimizationScore.toFixed(0)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Customer List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Kunden & Hunde
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openGoogleMaps(slot)}
                        className="flex items-center gap-1"
                      >
                        <Navigation className="h-4 w-4" />
                        Route in Maps
                      </Button>
                    </div>

                    {slot.bookings.map((booking, index) => (
                      <div
                        key={booking.id}
                        className="p-4 bg-gray-50 rounded-lg border-l-4 border-green-500"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </span>
                              <span className="font-medium">{booking.customer.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              <MapPin className="h-4 w-4" />
                              {booking.customer.street} {booking.customer.houseNumber}, {booking.customer.postalCode} {booking.customer.city}
                            </div>
                            {booking.customer.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Phone className="h-4 w-4" />
                                <a href={`tel:${booking.customer.phone}`} className="hover:underline">
                                  {booking.customer.phone}
                                </a>
                              </div>
                            )}
                          </div>
                          {booking.isGroupBooking && booking.groupDiscount > 0 && (
                            <Badge className="bg-green-100 text-green-700">
                              -{(booking.groupDiscount * 100).toFixed(0)}% Rabatt
                            </Badge>
                          )}
                        </div>

                        {/* Dogs */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {booking.dogs.map((dog) => (
                            <div
                              key={dog.id}
                              className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border"
                            >
                              <Dog className="h-4 w-4 text-orange-500" />
                              <span className="font-medium">{dog.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {getDogSizeLabel(dog.size)}
                              </Badge>
                            </div>
                          ))}
                        </div>

                        {/* Notes */}
                        {(booking.customerNotes || booking.dogs.some((d) => d.specialNeeds)) && (
                          <div className="mt-3 space-y-2">
                            {booking.customerNotes && (
                              <div className="p-2 bg-yellow-50 rounded text-sm text-yellow-800">
                                <strong>Hinweis:</strong> {booking.customerNotes}
                              </div>
                            )}
                            {booking.dogs
                              .filter((d) => d.specialNeeds)
                              .map((dog) => (
                                <div key={dog.id} className="p-2 bg-orange-50 rounded text-sm text-orange-800">
                                  <strong>{dog.name}:</strong> {dog.specialNeeds}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  {slot.status !== 'COMPLETED' && slot.status !== 'CANCELLED' && (
                    <div className="mt-4 pt-4 border-t flex gap-2">
                      {!slot.acceptedByWalker ? (
                        <Button
                          onClick={() => handleAcceptSlot(slot.id)}
                          disabled={actionLoading === slot.id}
                          className="flex-1"
                        >
                          {actionLoading === slot.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Akzeptieren
                        </Button>
                      ) : slot.status === 'OPEN' || slot.status === 'FULL' ? (
                        <>
                          <Button
                            onClick={() => handleStartWalk(slot.id)}
                            disabled={actionLoading === slot.id}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {actionLoading === slot.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 mr-2" />
                            )}
                            Spaziergang starten
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openGoogleMaps(slot)}
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            Navigation
                          </Button>
                        </>
                      ) : slot.status === 'IN_PROGRESS' ? (
                        <>
                          <Button
                            onClick={() => handleCompleteWalk(slot.id)}
                            disabled={actionLoading === slot.id}
                            className="flex-1"
                          >
                            {actionLoading === slot.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Abschliessen
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openGoogleMaps(slot)}
                          >
                            <Navigation className="h-4 w-4 mr-2" />
                            Navigation
                          </Button>
                        </>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
