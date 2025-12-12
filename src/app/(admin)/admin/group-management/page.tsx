'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dog,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  AlertCircle,
  TrendingUp,
  MapPin,
  Clock,
  Settings,
} from 'lucide-react'

interface PendingDog {
  id: string
  name: string
  breed: string | null
  size: string
  weight: number | null
  vaccinated: boolean
  neutered: boolean
  friendlyWithDogs: boolean
  friendlyWithPeople: boolean
  specialNeeds: string | null
  isGroupApproved: boolean
  imageUrl: string | null
  customer: {
    id: string
    name: string
    email: string
  }
}

interface OptimizationPreview {
  preview: boolean
  date: string
  stats: {
    totalBookings: number
    groupedBookings: number
    groupsCreated: number
    totalSavings: number
    averageGroupSize: number
  }
  groups: {
    bookings: {
      id: string
      customerName: string
      dogs: { name: string; size: string }[]
      timeWindow: { start: string; end: string }
    }[]
    center: { latitude: number; longitude: number }
    radius: number
    timeWindow: { start: string; end: string }
    totalDogs: number
    score: number
    totalDistance: number
    walkerId: string | null
    walkerName: string | null
  }[]
  ungroupedBookings: {
    id: string
    customerName: string
    dogs: string[]
    timeWindow: { start: string; end: string }
    reason: string
  }[]
  errors: string[]
}

export default function GroupManagementPage() {
  const [activeTab, setActiveTab] = useState('dogs')

  // Dogs approval state
  const [pendingDogs, setPendingDogs] = useState<PendingDog[]>([])
  const [isLoadingDogs, setIsLoadingDogs] = useState(true)
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null)
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({})

  // Optimization state
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [maxRadius, setMaxRadius] = useState(2.0)
  const [maxTimeGap, setMaxTimeGap] = useState(30)
  const [optimizationPreview, setOptimizationPreview] = useState<OptimizationPreview | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch pending dogs
  const fetchPendingDogs = async () => {
    setIsLoadingDogs(true)
    try {
      const response = await fetch('/api/admin/dogs?pendingApproval=true')
      const data = await response.json()
      setPendingDogs(data.dogs || [])
    } catch (err) {
      setError('Fehler beim Laden der Hunde')
    } finally {
      setIsLoadingDogs(false)
    }
  }

  useEffect(() => {
    fetchPendingDogs()
  }, [])

  // Approve/Reject dog
  const handleDogApproval = async (dogId: string, approved: boolean) => {
    setApprovalLoading(dogId)
    setError('')

    try {
      const response = await fetch(`/api/admin/dogs/${dogId}/approve-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved,
          notes: approvalNotes[dogId] || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler bei der Freigabe')
      }

      setSuccess(data.message)
      fetchPendingDogs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setApprovalLoading(null)
    }
  }

  // Preview optimization
  const previewOptimization = async () => {
    setIsOptimizing(true)
    setError('')
    setOptimizationPreview(null)

    try {
      const params = new URLSearchParams({
        date: selectedDate,
        maxRadius: maxRadius.toString(),
        maxTimeGap: maxTimeGap.toString(),
      })

      const response = await fetch(`/api/admin/group-optimization?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler bei der Optimierung')
      }

      setOptimizationPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setIsOptimizing(false)
    }
  }

  // Apply optimization
  const applyOptimization = async () => {
    setIsApplying(true)
    setError('')

    try {
      const response = await fetch('/api/admin/group-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          maxRadius,
          maxTimeGap,
          apply: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Anwenden')
      }

      setSuccess(
        `Optimierung angewendet: ${data.appliedResults?.slotsCreated || 0} Gruppen erstellt, ` +
        `${data.appliedResults?.bookingsUpdated || 0} Buchungen aktualisiert`
      )
      setOptimizationPreview(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setIsApplying(false)
    }
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

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-green-500" />
          Gruppenspaziergang-Verwaltung
        </h1>
        <p className="text-gray-500">Hundefreigaben und Terminoptimierung</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">×</button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto">×</button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dogs" className="flex items-center gap-2">
            <Dog className="h-4 w-4" />
            Hundefreigaben
            {pendingDogs.length > 0 && (
              <Badge className="ml-1 bg-orange-500">{pendingDogs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Terminoptimierung
          </TabsTrigger>
        </TabsList>

        {/* Dog Approvals Tab */}
        <TabsContent value="dogs" className="space-y-4">
          {isLoadingDogs ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-gray-400" />
                <p className="mt-4 text-gray-500">Lade Hunde...</p>
              </CardContent>
            </Card>
          ) : pendingDogs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-300" />
                <h3 className="text-lg font-medium mb-2">Keine offenen Freigaben</h3>
                <p className="text-gray-500">
                  Alle hundefreundlichen Hunde wurden bereits geprueft
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingDogs.map((dog) => (
                <Card key={dog.id}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {dog.imageUrl ? (
                          <img
                            src={dog.imageUrl}
                            alt={dog.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Dog className="h-10 w-10 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-lg font-medium">{dog.name}</h3>
                            <p className="text-sm text-gray-500">
                              {dog.breed || 'Mischling'} - {getDogSizeLabel(dog.size)}
                              {dog.weight && ` - ${dog.weight} kg`}
                            </p>
                            <p className="text-sm text-gray-500">
                              Besitzer: {dog.customer.name} ({dog.customer.email})
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {dog.vaccinated && <Badge variant="success">Geimpft</Badge>}
                            {dog.neutered && <Badge variant="outline">Kastriert</Badge>}
                            {dog.friendlyWithDogs && (
                              <Badge className="bg-green-100 text-green-700">Hundefreundlich</Badge>
                            )}
                          </div>
                        </div>

                        {dog.specialNeeds && (
                          <div className="p-2 bg-yellow-50 rounded text-sm text-yellow-800 mb-3">
                            <strong>Besondere Beduerfnisse:</strong> {dog.specialNeeds}
                          </div>
                        )}

                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500">Notizen (optional)</Label>
                            <Input
                              placeholder="Grund fuer Entscheidung..."
                              value={approvalNotes[dog.id] || ''}
                              onChange={(e) =>
                                setApprovalNotes((prev) => ({ ...prev, [dog.id]: e.target.value }))
                              }
                            />
                          </div>
                          <Button
                            onClick={() => handleDogApproval(dog.id, true)}
                            disabled={approvalLoading === dog.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {approvalLoading === dog.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Freigeben
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleDogApproval(dog.id, false)}
                            disabled={approvalLoading === dog.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Ablehnen
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Optimierungsparameter
              </CardTitle>
              <CardDescription>
                Konfigurieren Sie die Parameter fuer die automatische Gruppierung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max. Radius (km)</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={maxRadius}
                    onChange={(e) => setMaxRadius(parseFloat(e.target.value))}
                  >
                    <option value="1">1 km</option>
                    <option value="1.5">1,5 km</option>
                    <option value="2">2 km</option>
                    <option value="3">3 km</option>
                    <option value="5">5 km</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Max. Zeitdifferenz (Min.)</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={maxTimeGap}
                    onChange={(e) => setMaxTimeGap(parseInt(e.target.value))}
                  >
                    <option value="15">15 Minuten</option>
                    <option value="30">30 Minuten</option>
                    <option value="45">45 Minuten</option>
                    <option value="60">60 Minuten</option>
                  </select>
                </div>
              </div>
              <Button
                onClick={previewOptimization}
                disabled={isOptimizing}
                className="mt-4"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analysiere...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Vorschau generieren
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Optimization Preview Results */}
          {optimizationPreview && (
            <>
              {/* Stats Overview */}
              <div className="grid sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600">
                        {optimizationPreview.stats.totalBookings}
                      </p>
                      <p className="text-sm text-gray-500">Buchungen analysiert</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {optimizationPreview.stats.groupsCreated}
                      </p>
                      <p className="text-sm text-gray-500">Gruppen moeglich</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-600">
                        {optimizationPreview.stats.groupedBookings}
                      </p>
                      <p className="text-sm text-gray-500">Buchungen gruppiert</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-orange-600">
                        {formatPrice(optimizationPreview.stats.totalSavings)}
                      </p>
                      <p className="text-sm text-gray-500">Kundenersparnis</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Group Details */}
              {optimizationPreview.groups.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Vorgeschlagene Gruppen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {optimizationPreview.groups.map((group, index) => (
                        <div
                          key={index}
                          className="p-4 bg-green-50 rounded-lg border border-green-200"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-medium">Gruppe {index + 1}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {group.timeWindow.start} - {group.timeWindow.end} Uhr
                                </span>
                                <span className="flex items-center gap-1">
                                  <Dog className="h-4 w-4" />
                                  {group.totalDogs} Hunde
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  Radius: {group.radius.toFixed(1)} km
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-green-600">Score: {group.score}</Badge>
                              {group.walkerName && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Walker: {group.walkerName}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {group.bookings.map((booking) => (
                              <div
                                key={booking.id}
                                className="flex items-center justify-between p-2 bg-white rounded border"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{booking.customerName}</span>
                                  <span className="text-gray-400">|</span>
                                  {booking.dogs.map((dog, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {dog.name} ({getDogSizeLabel(dog.size)})
                                    </Badge>
                                  ))}
                                </div>
                                <span className="text-sm text-gray-500">
                                  {booking.timeWindow.start} - {booking.timeWindow.end}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ungrouped Bookings */}
              {optimizationPreview.ungroupedBookings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600">
                      <AlertCircle className="h-5 w-5" />
                      Nicht gruppierbar ({optimizationPreview.ungroupedBookings.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {optimizationPreview.ungroupedBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                        >
                          <div>
                            <span className="font-medium">{booking.customerName}</span>
                            <span className="text-gray-500 mx-2">|</span>
                            <span className="text-sm">{booking.dogs.join(', ')}</span>
                          </div>
                          <span className="text-sm text-orange-600">{booking.reason}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Apply Button */}
              {optimizationPreview.groups.length > 0 && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setOptimizationPreview(null)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={applyOptimization}
                    disabled={isApplying}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isApplying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Anwenden...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Gruppierung anwenden
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
