import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(price)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function formatTime(time: string): string {
  return time.replace(':', ':') + ' Uhr'
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `INV-${year}-${random}`
}

export function generateEmployeeNumber(): string {
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `EMP-${random}`
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    WALKER_ASSIGNED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-purple-100 text-purple-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
    NO_SHOW: 'bg-orange-100 text-orange-800',
    OPEN: 'bg-green-100 text-green-800',
    FULL: 'bg-yellow-100 text-yellow-800',
    DRAFT: 'bg-gray-100 text-gray-800',
    SENT: 'bg-blue-100 text-blue-800',
    PAID: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Ausstehend',
    CONFIRMED: 'Bestaetigt',
    WALKER_ASSIGNED: 'Walker zugewiesen',
    IN_PROGRESS: 'Laufend',
    COMPLETED: 'Abgeschlossen',
    CANCELLED: 'Storniert',
    NO_SHOW: 'Nicht erschienen',
    OPEN: 'Offen',
    FULL: 'Voll',
    DRAFT: 'Entwurf',
    SENT: 'Gesendet',
    PAID: 'Bezahlt',
    OVERDUE: 'Ueberfaellig',
    SMALL: 'Klein',
    MEDIUM: 'Mittel',
    LARGE: 'Gross',
    EXTRA_LARGE: 'Sehr gross',
    SINGLE_WALK: 'Einzelspaziergang',
    GROUP_WALK: 'Gruppenspaziergang',
    DAYCARE: 'Tagesbetreuung',
    PUPPY_VISIT: 'Welpenbesuch',
    HOME_VISIT: 'Hausbesuch',
  }
  return labels[status] || status
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
