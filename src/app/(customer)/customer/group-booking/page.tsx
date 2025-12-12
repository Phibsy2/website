'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Clock,
  Dog,
  MapPin,
  Users,
  Loader2,
  Check,
  AlertCircle,
  Navigation,
  Percent,
  Info,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface EligibleDog {
  id: string
  name: string
  size: string
  breed?: string
}

interface IneligibleDog {
  id: string
  name: string
  reason: string
}

interface GroupSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  walker: {
    id: string
    name: string
    maxDogs: number
  }
  currentBookings: {
    id: string
    customerName: string
    dogs: { name: string; size: string }[]
  }[]
  currentDogs: number
  maxDogs: number
  center: {
    latitude: number
    longitude: number
  }
  radius: number
  distanceFromCustomer: number
  estimatedSavings: number
  matchScore: number
}

export default function GroupBookingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Dogs
  const [eligibleDogs, setEligibleDogs] = useState<EligibleDog[]>([])
  const [ineligibleDogs, setIneligibleDogs] = useState<IneligibleDog[]>([])
  const [selectedDogs, setSelectedDogs] = useState<string[]>([])

  // Search params
  const [selectedDate, setSelectedDate] = useState('')
  const [maxRadius, setMaxRadius] = useState(2.0)

  // Results
  const [availableSlots, setAvailableSlots] = useState<GroupSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<GroupSlot | null>(null)

  // Fetch eligible dogs on mount
  useEffect(() => {
    const fetchDogs = async () => {
      try {
        const response = await fetch('/api/customer/dogs/group-eligible')
        const data = await response.json()
        setEligibleDogs(data.eligible || [])
        setIneligibleDogs(data.ineligible || [])
      } catch (err) {
        setError('Hunde konnten nicht geladen werden')
      }
    }
    fetchDogs()
  }, [])

  const searchGroupSlots = async () => {
    if (!selectedDate || selectedDogs.length === 0) return

    setIsSearching(true)
    setError('')

    try {
      const params = new URLSearchParams({
        date: selectedDate,
        dogs: selectedDogs.join(','),
        maxRadius: maxRadius.toString(),
      })

      const response = await fetch(`/api/customer/group-slots?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Suche fehlgeschlagen')
      }

      setAvailableSlots(data.slots || [])
      if (data.slots?.length > 0) {
        setStep(3)
      } else {
        setError('Keine passenden Gruppentermine gefunden. Versuchen Sie einen anderen Tag oder erweitern Sie den Suchradius.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setIsSearching(false)
    }
  }

  const joinGroupSlot = async () => {
    if (!selectedSlot) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/customer/group-slots/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlot.id,
          dogIds: selectedDogs,
          timeStart: selectedSlot.startTime,
          timeEnd: selectedSlot.endTime,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Buchung fehlgeschlagen')
      }

      setSuccess('Erfolgreich dem Gruppenspaziergang beigetreten!')
      setTimeout(() => {
        router.push('/customer?success=group-booking')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleDog = (dogId: string) => {
    setSelectedDogs((prev) =>
      prev.includes(dogId) ? prev.filter((id) => id !== dogId) : [...prev, dogId]
    )
  }

  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
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

  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`
    }
    return `${km.toFixed(1)} km`
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

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-orange-500" />
          Gruppenspaziergang buchen
        </h1>
        <p className="text-gray-500 mt-1">
          Sparen Sie bis zu 15% wenn Ihr Hund mit anderen zusammen spaziert
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Percent className="h-5 w-5 text-green-600 mt-0.5" />
        <div>
          <p className="font-medium text-green-800">15% Gruppenrabatt</p>
          <p className="text-sm text-green-700">
            Bei Gruppenspaziergaengen laeuft Ihr Hund mit anderen freundlichen Hunden zusammen.
            Das ist guenstiger und macht den Hunden oft mehr Spass!
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {['Hunde', 'Datum', 'Termin', 'Bestaetigen'].map((label, index) => (
          <div key={label} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step > index + 1
                  ? 'bg-green-500 text-white'
                  : step === index + 1
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > index + 1 ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span
              className={`ml-2 text-sm hidden sm:block ${
                step === index + 1 ? 'text-orange-500 font-medium' : 'text-gray-500'
              }`}
            >
              {label}
            </span>
            {index < 3 && (
              <div className={`w-8 sm:w-16 h-0.5 mx-2 ${step > index + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6 flex items-center gap-2">
          <Check className="h-5 w-5 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Step 1: Select Dogs */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dog className="h-5 w-5" />
              Welche Hunde sollen teilnehmen?
            </CardTitle>
            <CardDescription>
              Nur fuer Gruppenspaziergaenge freigegebene Hunde koennen teilnehmen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eligibleDogs.length === 0 && ineligibleDogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Dog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sie haben noch keine Hunde registriert</p>
                <Button className="mt-4" onClick={() => router.push('/customer/dogs/new')}>
                  Hund hinzufuegen
                </Button>
              </div>
            ) : eligibleDogs.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                <p className="font-medium">Keine freigegebenen Hunde</p>
                <p className="text-sm text-gray-500 mt-2">
                  Keiner Ihrer Hunde ist aktuell fuer Gruppenspaziergaenge freigegeben.
                  Wenden Sie sich an unser Team, um die Freigabe zu beantragen.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/customer/dogs')}>
                  Hunde verwalten
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {eligibleDogs.map((dog) => (
                    <div
                      key={dog.id}
                      onClick={() => toggleDog(dog.id)}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedDogs.includes(dog.id)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-orange-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            selectedDogs.includes(dog.id) ? 'bg-orange-500 text-white' : 'bg-gray-100'
                          }`}
                        >
                          <Dog className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{dog.name}</p>
                          <p className="text-sm text-gray-500">
                            {getDogSizeLabel(dog.size)}
                            {dog.breed && ` - ${dog.breed}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="success">Freigegeben</Badge>
                    </div>
                  ))}
                </div>

                {ineligibleDogs.length > 0 && (
                  <div className="mt-6">
                    <Label className="flex items-center gap-2 text-gray-500 mb-3">
                      <Info className="h-4 w-4" />
                      Nicht freigegebene Hunde
                    </Label>
                    <div className="space-y-2">
                      {ineligibleDogs.map((dog) => (
                        <div
                          key={dog.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <Dog className="h-4 w-4 text-gray-400" />
                            </div>
                            <span className="text-gray-600">{dog.name}</span>
                          </div>
                          <span className="text-xs text-gray-500">{dog.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-end mt-6">
              <Button onClick={() => setStep(2)} disabled={selectedDogs.length === 0}>
                Weiter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Date */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Wann soll der Spaziergang stattfinden?
            </CardTitle>
            <CardDescription>
              Wir suchen verfuegbare Gruppentermine in Ihrer Naehe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    min={getMinDate()}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximale Entfernung</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={maxRadius}
                    onChange={(e) => setMaxRadius(parseFloat(e.target.value))}
                  >
                    <option value="1">1 km</option>
                    <option value="2">2 km</option>
                    <option value="3">3 km</option>
                    <option value="5">5 km</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Navigation className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Standort-basierte Suche</p>
                    <p className="text-sm text-blue-700">
                      Wir finden Gruppentermine in der Naehe Ihrer registrierten Adresse.
                      Je naeher die anderen Teilnehmer, desto effizienter die Route!
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>
                Zurueck
              </Button>
              <Button onClick={searchGroupSlots} disabled={!selectedDate || isSearching}>
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Suche...
                  </>
                ) : (
                  'Gruppentermine suchen'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Select Slot */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Verfuegbare Gruppentermine
            </CardTitle>
            <CardDescription>
              {formatDate(selectedDate)} - {availableSlots.length} Termine gefunden
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Keine passenden Gruppentermine gefunden</p>
                <Button variant="outline" className="mt-4" onClick={() => setStep(2)}>
                  Anderes Datum waehlen
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {availableSlots.map((slot) => (
                  <div
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedSlot?.id === slot.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-lg flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {slot.startTime} - {slot.endTime} Uhr
                        </p>
                        <p className="text-sm text-gray-500">
                          Walker: {slot.walker.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="success" className="mb-1">
                          {formatDistance(slot.distanceFromCustomer)} entfernt
                        </Badge>
                        <p className="text-sm text-green-600 font-medium">
                          Sie sparen {formatPrice(slot.estimatedSavings)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Dog className="h-4 w-4 text-gray-400" />
                        {slot.currentDogs}/{slot.maxDogs} Hunde
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        Radius: {formatDistance(slot.radius)}
                      </span>
                    </div>

                    {slot.currentBookings.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">Bereits dabei:</p>
                        <div className="flex flex-wrap gap-2">
                          {slot.currentBookings.flatMap((booking) =>
                            booking.dogs.map((dog, idx) => (
                              <Badge key={`${booking.id}-${idx}`} variant="outline" className="text-xs">
                                {dog.name} ({getDogSizeLabel(dog.size)})
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                Zurueck
              </Button>
              <Button onClick={() => setStep(4)} disabled={!selectedSlot}>
                Weiter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && selectedSlot && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              Buchung bestaetigen
            </CardTitle>
            <CardDescription>Ueberpruefen Sie Ihre Buchungsdetails</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Service:</span>
                  <span className="font-medium">Gruppenspaziergang</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ihre Hunde:</span>
                  <span className="font-medium">
                    {eligibleDogs
                      .filter((d) => selectedDogs.includes(d.id))
                      .map((d) => d.name)
                      .join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Datum:</span>
                  <span className="font-medium">{formatDate(selectedDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Uhrzeit:</span>
                  <span className="font-medium">
                    {selectedSlot.startTime} - {selectedSlot.endTime} Uhr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Walker:</span>
                  <span className="font-medium">{selectedSlot.walker.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Entfernung:</span>
                  <span className="font-medium">{formatDistance(selectedSlot.distanceFromCustomer)}</span>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-lg font-medium text-green-800">Gruppenrabatt</span>
                    <p className="text-sm text-green-600">15% Ersparnis gegenueber Einzelspaziergang</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-green-600">
                      -{formatPrice(selectedSlot.estimatedSavings)}
                    </span>
                  </div>
                </div>
              </div>

              {selectedSlot.currentBookings.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 mb-2">
                    <Users className="h-4 w-4 inline mr-1" />
                    Mit dabei in der Gruppe:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSlot.currentBookings.flatMap((booking) =>
                      booking.dogs.map((dog, idx) => (
                        <Badge key={`${booking.id}-${idx}`} variant="outline" className="bg-white">
                          {dog.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(3)}>
                Zurueck
              </Button>
              <Button onClick={joinGroupSlot} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buchen...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Gruppenspaziergang buchen
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
