'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dog, Loader2 } from 'lucide-react'

export default function NewDogPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    try {
      const response = await fetch('/api/customer/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          breed: formData.get('breed') || null,
          size: formData.get('size'),
          birthDate: formData.get('birthDate') || null,
          weight: formData.get('weight') ? parseFloat(formData.get('weight') as string) : null,
          vaccinated: formData.get('vaccinated') === 'on',
          neutered: formData.get('neutered') === 'on',
          friendlyWithDogs: formData.get('friendlyWithDogs') === 'on',
          friendlyWithPeople: formData.get('friendlyWithPeople') === 'on',
          specialNeeds: formData.get('specialNeeds') || null,
          veterinarian: formData.get('veterinarian') || null,
          vetPhone: formData.get('vetPhone') || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Hund konnte nicht hinzugefuegt werden')
      }

      router.push('/customer/dogs?success=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dog className="h-5 w-5" />
            Neuen Hund hinzufuegen
          </CardTitle>
          <CardDescription>
            Geben Sie die Informationen zu Ihrem Hund ein
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium">Grundinformationen</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Max"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breed">Rasse</Label>
                  <Input
                    id="breed"
                    name="breed"
                    placeholder="Labrador"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="size">Groesse *</Label>
                  <Select name="size" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Waehlen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMALL">Klein (&lt;10kg)</SelectItem>
                      <SelectItem value="MEDIUM">Mittel (10-25kg)</SelectItem>
                      <SelectItem value="LARGE">Gross (25-45kg)</SelectItem>
                      <SelectItem value="EXTRA_LARGE">Sehr gross (&gt;45kg)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Gewicht (kg)</Label>
                  <Input
                    id="weight"
                    name="weight"
                    type="number"
                    step="0.1"
                    placeholder="15"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">Geburtsdatum</Label>
                  <Input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Health */}
            <div className="space-y-4">
              <h3 className="font-medium">Gesundheit</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="vaccinated"
                    name="vaccinated"
                    className="rounded"
                    disabled={isLoading}
                  />
                  <Label htmlFor="vaccinated" className="cursor-pointer">
                    Geimpft
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="neutered"
                    name="neutered"
                    className="rounded"
                    disabled={isLoading}
                  />
                  <Label htmlFor="neutered" className="cursor-pointer">
                    Kastriert/Sterilisiert
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialNeeds">Besondere Beduerfnisse</Label>
                <textarea
                  id="specialNeeds"
                  name="specialNeeds"
                  className="w-full p-3 border rounded-lg resize-none"
                  rows={3}
                  placeholder="Allergien, Medikamente, besondere Pflege..."
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Behavior */}
            <div className="space-y-4">
              <h3 className="font-medium">Verhalten</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="friendlyWithDogs"
                    name="friendlyWithDogs"
                    className="rounded"
                    defaultChecked
                    disabled={isLoading}
                  />
                  <Label htmlFor="friendlyWithDogs" className="cursor-pointer">
                    Vertraeglich mit anderen Hunden
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="friendlyWithPeople"
                    name="friendlyWithPeople"
                    className="rounded"
                    defaultChecked
                    disabled={isLoading}
                  />
                  <Label htmlFor="friendlyWithPeople" className="cursor-pointer">
                    Vertraeglich mit fremden Menschen
                  </Label>
                </div>
              </div>
            </div>

            {/* Veterinarian */}
            <div className="space-y-4">
              <h3 className="font-medium">Tierarzt (optional)</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="veterinarian">Name/Praxis</Label>
                  <Input
                    id="veterinarian"
                    name="veterinarian"
                    placeholder="Dr. Mueller"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vetPhone">Telefon</Label>
                  <Input
                    id="vetPhone"
                    name="vetPhone"
                    type="tel"
                    placeholder="+49 123 456789"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Abbrechen
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  'Hund hinzufuegen'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
