'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import { bookingApi, userApi, groupWalkApi } from '@/lib/api';
import {
  CalendarDaysIcon,
  UserGroupIcon,
  ClockIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface Booking {
  id: string;
  scheduledDate: string;
  duration: number;
  status: string;
  totalPrice: string;
  walker?: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  dogs: Array<{ dog: { name: string } }>;
}

interface Dog {
  id: string;
  name: string;
  breed: string;
  age: number;
}

interface GroupWalk {
  id: string;
  title: string;
  scheduledDate: string;
  meetingPoint: string;
  currentParticipants: number;
  maxParticipants: number;
  pricePerDog: string;
}

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [groupWalks, setGroupWalks] = useState<GroupWalk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [bookingsRes, dogsRes, groupWalksRes] = await Promise.all([
        bookingApi.getMyBookings({ limit: 5, sortOrder: 'desc' }),
        userApi.getDogs(),
        groupWalkApi.getGroupWalks({ limit: 5, status: 'OPEN' }),
      ]);

      setBookings(bookingsRes.data.data || []);
      setDogs(dogsRes.data.data || []);
      setGroupWalks(groupWalksRes.data.data || []);
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
        return <span className="badge badge-info">Läuft</span>;
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
      {/* Welcome Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Willkommen zurück, {user?.firstName}!
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Verwalten Sie hier Ihre Buchungen und Hunde
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
          <Link href="/dashboard/bookings/new" className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Neue Buchung
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarDaysIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Aktive Buchungen</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {bookings.filter(b => ['PENDING', 'CONFIRMED'].includes(b.status)).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🐕</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Meine Hunde</p>
                <p className="text-2xl font-semibold text-gray-900">{dogs.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-secondary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Verfügbare Gruppentermine</p>
                <p className="text-2xl font-semibold text-gray-900">{groupWalks.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Abgeschlossene Spaziergänge</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {bookings.filter(b => b.status === 'COMPLETED').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Aktuelle Buchungen</h3>
            <Link href="/dashboard/bookings" className="text-sm text-primary-600 hover:text-primary-500">
              Alle anzeigen
            </Link>
          </div>
          <div className="card-body">
            {bookings.length === 0 ? (
              <div className="text-center py-6">
                <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Noch keine Buchungen</p>
                <Link href="/dashboard/bookings/new" className="mt-4 btn-primary inline-flex">
                  Erste Buchung erstellen
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {bookings.slice(0, 5).map((booking) => (
                  <li key={booking.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(booking.scheduledDate), 'PPP', { locale: de })}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(booking.scheduledDate), 'HH:mm')} Uhr - {booking.duration} Min
                        </p>
                        <p className="text-xs text-gray-400">
                          {booking.dogs.map(d => d.dog.name).join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(booking.status)}
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {parseFloat(booking.totalPrice).toFixed(2)} €
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Available Group Walks */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Verfügbare Gruppentermine</h3>
            <Link href="/dashboard/group-walks" className="text-sm text-primary-600 hover:text-primary-500">
              Alle anzeigen
            </Link>
          </div>
          <div className="card-body">
            {groupWalks.length === 0 ? (
              <div className="text-center py-6">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Keine Gruppentermine verfügbar</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {groupWalks.slice(0, 5).map((walk) => (
                  <li key={walk.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{walk.title}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(walk.scheduledDate), 'PPP', { locale: de })} um{' '}
                          {format(new Date(walk.scheduledDate), 'HH:mm')} Uhr
                        </p>
                        <p className="text-xs text-gray-400">{walk.meetingPoint}</p>
                      </div>
                      <div className="text-right">
                        <span className="badge badge-info">
                          {walk.currentParticipants}/{walk.maxParticipants} Plätze
                        </span>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {parseFloat(walk.pricePerDog).toFixed(2)} €/Hund
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* My Dogs */}
      <div className="card">
        <div className="card-header flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Meine Hunde</h3>
          <Link href="/dashboard/dogs" className="text-sm text-primary-600 hover:text-primary-500">
            Verwalten
          </Link>
        </div>
        <div className="card-body">
          {dogs.length === 0 ? (
            <div className="text-center py-6">
              <span className="text-5xl">🐕</span>
              <p className="mt-2 text-sm text-gray-500">Noch keine Hunde hinzugefügt</p>
              <Link href="/dashboard/dogs/new" className="mt-4 btn-primary inline-flex">
                Hund hinzufügen
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dogs.map((dog) => (
                <div key={dog.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">🐕</span>
                    <div>
                      <p className="font-medium text-gray-900">{dog.name}</p>
                      <p className="text-sm text-gray-500">{dog.breed}</p>
                      <p className="text-xs text-gray-400">{dog.age} Jahre alt</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
