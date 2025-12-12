'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { walkerApi, bookingApi, groupWalkApi } from '@/lib/api';
import {
  CalendarDaysIcon,
  CurrencyEuroIcon,
  StarIcon,
  UserGroupIcon,
  ClockIcon,
  MapPinIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface WalkerStats {
  totalWalks: number;
  upcomingWalks: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
}

interface Booking {
  id: string;
  scheduledDate: string;
  duration: number;
  status: string;
  totalPrice: string;
  customer: {
    firstName: string;
    lastName: string;
  };
  address: {
    street: string;
    houseNumber: string;
    city: string;
  };
  dogs: Array<{ dog: { name: string; breed: string } }>;
}

interface GroupingSuggestion {
  bookings: Array<{ id: string }>;
  totalDogs: number;
  estimatedSavings: number;
  score: number;
  timeWindow: { start: string; end: string };
}

export default function WalkerDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<WalkerStats | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [groupingSuggestions, setGroupingSuggestions] = useState<GroupingSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, bookingsRes, suggestionsRes] = await Promise.all([
        walkerApi.getStats(),
        bookingApi.getWalkerBookings({ limit: 10, status: 'CONFIRMED' }),
        bookingApi.getGroupingSuggestions(),
      ]);

      setStats(statsRes.data.data);
      setUpcomingBookings(bookingsRes.data.data || []);
      setGroupingSuggestions(suggestionsRes.data.data || []);
    } catch (error) {
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-warning">Ausstehend</span>;
      case 'CONFIRMED':
        return <span className="badge badge-info">Bestätigt</span>;
      case 'IN_PROGRESS':
        return <span className="badge badge-success">Läuft</span>;
      case 'COMPLETED':
        return <span className="badge badge-success">Abgeschlossen</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger">Storniert</span>;
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Willkommen, {user?.firstName}!
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Hier ist Ihre Übersicht für heute
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
          <Link href="/walker/group-walks/new" className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Gruppentermin erstellen
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Anstehende Termine</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.upcomingWalks || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <CalendarDaysIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Abgeschlossene Walks</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalWalks || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                <CurrencyEuroIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Verdienst gesamt</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {(stats?.totalEarnings || 0).toFixed(2)} €
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <StarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Bewertung</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {(stats?.averageRating || 0).toFixed(1)} / 5
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <UserGroupIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Bewertungen</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalReviews || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Bookings */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Anstehende Termine</h3>
            <Link href="/walker/bookings" className="text-sm text-primary-600 hover:text-primary-500">
              Alle anzeigen
            </Link>
          </div>
          <div className="card-body">
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-6">
                <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Keine anstehenden Termine</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {upcomingBookings.slice(0, 5).map((booking) => (
                  <li key={booking.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {booking.customer.firstName} {booking.customer.lastName}
                          </p>
                          {getStatusBadge(booking.status)}
                        </div>
                        <p className="text-sm text-gray-500">
                          {format(new Date(booking.scheduledDate), 'PPP', { locale: de })} um{' '}
                          {format(new Date(booking.scheduledDate), 'HH:mm')} Uhr
                        </p>
                        <p className="text-xs text-gray-400 flex items-center mt-1">
                          <MapPinIcon className="h-3 w-3 mr-1" />
                          {booking.address.street} {booking.address.houseNumber}, {booking.address.city}
                        </p>
                        <p className="text-xs text-gray-400">
                          🐕 {booking.dogs.map(d => d.dog.name).join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {parseFloat(booking.totalPrice).toFixed(2)} €
                        </p>
                        <p className="text-xs text-gray-500">{booking.duration} Min</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Grouping Suggestions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Gruppierungsvorschläge</h3>
            <p className="text-sm text-gray-500">
              Intelligente Terminzusammenlegung basierend auf Adressen und Zeitfenstern
            </p>
          </div>
          <div className="card-body">
            {groupingSuggestions.length === 0 ? (
              <div className="text-center py-6">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Keine Gruppierungsvorschläge verfügbar</p>
                <p className="text-xs text-gray-400 mt-1">
                  Vorschläge werden basierend auf ähnlichen Adressen und Zeitfenstern generiert
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {groupingSuggestions.slice(0, 3).map((suggestion, index) => (
                  <li key={index} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {suggestion.bookings.length} Buchungen kombinierbar
                        </p>
                        <p className="text-sm text-gray-500">
                          {suggestion.totalDogs} Hunde | Score: {suggestion.score.toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Zeitfenster: {format(new Date(suggestion.timeWindow.start), 'HH:mm')} -{' '}
                          {format(new Date(suggestion.timeWindow.end), 'HH:mm')} Uhr
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="badge badge-success">
                          ~{suggestion.estimatedSavings.toFixed(0)} € Ersparnis
                        </span>
                        <button className="mt-2 text-xs text-primary-600 hover:text-primary-500 block">
                          Gruppentermin erstellen
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/walker/availability" className="card hover:shadow-lg transition-shadow">
          <div className="card-body flex items-center">
            <ClockIcon className="h-8 w-8 text-primary-600 mr-4" />
            <div>
              <h3 className="font-medium text-gray-900">Verfügbarkeit</h3>
              <p className="text-sm text-gray-500">Arbeitszeiten verwalten</p>
            </div>
          </div>
        </Link>

        <Link href="/walker/service-areas" className="card hover:shadow-lg transition-shadow">
          <div className="card-body flex items-center">
            <MapPinIcon className="h-8 w-8 text-secondary-600 mr-4" />
            <div>
              <h3 className="font-medium text-gray-900">Service-Gebiete</h3>
              <p className="text-sm text-gray-500">Einzugsgebiete festlegen</p>
            </div>
          </div>
        </Link>

        <Link href="/walker/settings" className="card hover:shadow-lg transition-shadow">
          <div className="card-body flex items-center">
            <StarIcon className="h-8 w-8 text-yellow-600 mr-4" />
            <div>
              <h3 className="font-medium text-gray-900">Profil bearbeiten</h3>
              <p className="text-sm text-gray-500">Stundensatz & Bio anpassen</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
