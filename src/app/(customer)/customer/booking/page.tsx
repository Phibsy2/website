'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, Dog, MapPin, Users, Loader2, Check, AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface DogOption {
  id: string
  name: string
  size: string
  friendlyWithDogs: boolean
}

interface ServiceOption {
  id: string
  type: string
  name: string
  description: string
  durationMinutes: number
  basePrice: number
  groupDiscount: number
}

interface SuggestedSlot {
  id: string
  date: string
  startTime: string
  endTime: string
  walkerName: string
  currentDogs: number
  maxDogs: number
  matchScore: number
}

export default function BookingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Form data
  const [dogs, setDogs] = useState<DogOption[]>([])
  const [services, setServices] = useState<ServiceOption[]>([])
  const [selectedDogs, setSelectedDogs] = useState<string[]>([])
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTimeStart, setSelectedTimeStart] = useState('09:00')
  const [selectedTimeEnd, setSelectedTimeEnd] = useState('11:00')
  const [useCustomAddress, setUseCustomAddress] = useState(false)
  const [customAddress, setCustomAddress] = useState({
    street: '',
    houseNumber: '',
    postalCode: '',
    city: '',
  })
  const [notes, setNotes] = useState('')
  const [suggestedSlots, setSuggestedSlots] = useState<SuggestedSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>('')

  // Calculate price
  const calculatePrice = () => {
    const service = services.find((s) => s.id === selectedService)
    if (!service) return 0

    let price = service.basePrice * selectedDogs.length
    // Apply group discount if it's a group walk service
    if (service.type === 'GROUP_WALK') {
      price = price * (1 - service.groupDiscount)
    }
    return price
  }

  // Fetch dogs and services on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dogsRes, servicesRes] = await Promise.all([
          fetch('/api/customer/dogs'),
          fetch('/api/services'),
        ])
        const dogsData = await dogsRes.json()
        const servicesData = await servicesRes.json()
        setDogs(dogsData)
        setServices(servicesData)
      } catch (err) {
        setError('Daten konnten nicht geladen werden')
      }
    }
    fetchData()
  }, [])

  // Check availability when date/time changes
  useEffect(() => {
    if (selectedDate && selectedService && selectedDogs.length > 0) {
      checkAvailability()
    }
  }, [selectedDate, selectedTimeStart, selectedTimeEnd, selectedService, selectedDogs])

  const checkAvailability = async () => {
    try {
      const response = await fetch('/api/bookings/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          timeStart: selectedTimeStart,
          timeEnd: selectedTimeEnd,
          dogsCount: selectedDogs.length,
          postalCode: useCustomAddress ? customAddress.postalCode : undefined,
        }),
      })
      const data = await response.json()
      setSuggestedSlots(data.suggestedSlots || [])
    } catch (err) {
      console.error('Availability check failed:', err)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService,
          dogIds: selectedDogs,
          requestedDate: selectedDate,
          requestedTimeStart: selectedTimeStart,
          requestedTimeEnd: selectedTimeEnd,
          useCustomerAddress: !useCustomAddress,
          ...(useCustomAddress && {
            pickupStreet: customAddress.street,
            pickupHouseNumber: customAddress.houseNumber,
            pickupPostalCode: customAddress.postalCode,
            pickupCity: customAddress.city,
          }),
          customerNotes: notes,
          selectedSlotId: selectedSlot || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Buchung fehlgeschlagen')
      }

      router.push('/customer/bookings?success=true')
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

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Termin buchen</h1>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {['Hunde', 'Service', 'Termin', 'Bestaetigen'].map((label, index) => (
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
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Step 1: Select Dogs */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dog className="h-5 w-5" />
              Welche Hunde sollen laufen?
            </CardTitle>
            <CardDescription>Waehlen Sie einen oder mehrere Hunde aus</CardDescription>
          </CardHeader>
          <CardContent>
            {dogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Dog className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Sie haben noch keine Hunde registriert</p>
                <Button className="mt-4" onClick={() => router.push('/customer/dogs/new')}>
                  Hund hinzufuegen
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {dogs.map((dog) => (
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
                        <p className="text-sm text-gray-500">{dog.size}</p>
                      </div>
                    </div>
                    {dog.friendlyWithDogs && (
                      <Badge variant="success">Gruppentauglich</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-6">
              <Button onClick={() => setStep(2)} disabled={selectedDogs.length === 0}>
                Weiter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Service */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Welchen Service moechten Sie?
            </CardTitle>
            <CardDescription>Waehlen Sie den passenden Service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedService === service.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{service.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {service.durationMinutes} Min.
                        </span>
                        {service.type === 'GROUP_WALK' && (
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            Gruppenspaziergang
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-500">
                        {formatPrice(service.basePrice)}
                      </p>
                      <p className="text-xs text-gray-500">pro Hund</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>
                Zurueck
              </Button>
              <Button onClick={() => setStep(3)} disabled={!selectedService}>
                Weiter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Select Date/Time */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Wann soll der Spaziergang stattfinden?
            </CardTitle>
            <CardDescription>Waehlen Sie Datum und Uhrzeit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
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
                  <Label>Von</Label>
                  <Select value={selectedTimeStart} onValueChange={setSelectedTimeStart}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'].map(
                        (time) => (
                          <SelectItem key={time} value={time}>
                            {time} Uhr
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bis</Label>
                  <Select value={selectedTimeEnd} onValueChange={setSelectedTimeEnd}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(
                        (time) => (
                          <SelectItem key={time} value={time}>
                            {time} Uhr
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Suggested Group Slots */}
              {suggestedSlots.length > 0 && (
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Verfuegbare Gruppentermine (guenstigerer Preis!)
                  </Label>
                  {suggestedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedSlot === slot.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">
                            {slot.startTime} - {slot.endTime} Uhr
                          </p>
                          <p className="text-sm text-gray-500">
                            Walker: {slot.walkerName} | {slot.currentDogs}/{slot.maxDogs} Hunde
                          </p>
                        </div>
                        <Badge variant="success">Gruppenrabatt</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Address */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="customAddress"
                    checked={useCustomAddress}
                    onChange={(e) => setUseCustomAddress(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="customAddress" className="flex items-center gap-2 cursor-pointer">
                    <MapPin className="h-4 w-4" />
                    Andere Abholadresse verwenden
                  </Label>
                </div>
                {useCustomAddress && (
                  <div className="grid sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <Label>Strasse</Label>
                      <Input
                        value={customAddress.street}
                        onChange={(e) =>
                          setCustomAddress((prev) => ({ ...prev, street: e.target.value }))
                        }
                        placeholder="Musterstrasse"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hausnummer</Label>
                      <Input
                        value={customAddress.houseNumber}
                        onChange={(e) =>
                          setCustomAddress((prev) => ({ ...prev, houseNumber: e.target.value }))
                        }
                        placeholder="12a"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>PLZ</Label>
                      <Input
                        value={customAddress.postalCode}
                        onChange={(e) =>
                          setCustomAddress((prev) => ({ ...prev, postalCode: e.target.value }))
                        }
                        placeholder="12345"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stadt</Label>
                      <Input
                        value={customAddress.city}
                        onChange={(e) =>
                          setCustomAddress((prev) => ({ ...prev, city: e.target.value }))
                        }
                        placeholder="Musterstadt"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Anmerkungen (optional)</Label>
                <textarea
                  className="w-full p-3 border rounded-lg resize-none"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Besondere Hinweise fuer den Walker..."
                />
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                Zurueck
              </Button>
              <Button onClick={() => setStep(4)} disabled={!selectedDate}>
                Weiter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
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
                  <span className="font-medium">
                    {services.find((s) => s.id === selectedService)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hunde:</span>
                  <span className="font-medium">
                    {dogs
                      .filter((d) => selectedDogs.includes(d.id))
                      .map((d) => d.name)
                      .join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Datum:</span>
                  <span className="font-medium">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Uhrzeit:</span>
                  <span className="font-medium">
                    {selectedTimeStart} - {selectedTimeEnd} Uhr
                  </span>
                </div>
                {selectedSlot && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Terminart:</span>
                    <Badge variant="success">Gruppentermin</Badge>
                  </div>
                )}
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Gesamtpreis:</span>
                  <span className="text-2xl font-bold text-orange-500">
                    {formatPrice(calculatePrice())}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(3)}>
                Zurueck
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buchen...
                  </>
                ) : (
                  'Jetzt buchen'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
