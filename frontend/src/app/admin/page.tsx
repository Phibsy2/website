'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import {
  UsersIcon,
  CalendarDaysIcon,
  CurrencyEuroIcon,
  StarIcon,
  UserGroupIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalRevenue: number;
  averageRating: number;
  activeWalkers: number;
  totalCustomers: number;
}

interface RecentBooking {
  id: string;
  scheduledDate: string;
  status: string;
  totalPrice: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  walker?: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, bookingsRes] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getAllBookings({ limit: 10 }),
      ]);

      setStats(statsRes.data.data);
      setRecentBookings(bookingsRes.data.data || []);
    } catch (error) {
      toast.error('Fehler beim Laden der Dashboard-Daten');
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
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Admin Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Übersicht über alle Plattform-Aktivitäten
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                <CalendarDaysIcon className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Buchungen gesamt</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalBookings || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ausstehende Buchungen</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.pendingBookings || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <CurrencyEuroIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Gesamtumsatz</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {(stats?.totalRevenue || 0).toFixed(2)} €
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <StarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Durchschnittl. Bewertung</p>
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
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <UserGroupIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Aktive Walker</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.activeWalkers || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <UsersIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Registrierte Kunden</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.totalCustomers || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-teal-100 rounded-md p-3">
                <CalendarDaysIcon className="h-6 w-6 text-teal-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Abgeschlossene Buchungen</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.completedBookings || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Link href="/admin/users" className="card hover:shadow-lg transition-shadow">
          <div className="card-body flex items-center">
            <UsersIcon className="h-8 w-8 text-primary-600 mr-4" />
            <div>
              <h3 className="font-medium text-gray-900">Benutzer verwalten</h3>
              <p className="text-sm text-gray-500">Kunden und Walker anzeigen/bearbeiten</p>
            </div>
          </div>
        </Link>

        <Link href="/admin/bookings" className="card hover:shadow-lg transition-shadow">
          <div className="card-body flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-secondary-600 mr-4" />
            <div>
              <h3 className="font-medium text-gray-900">Buchungen verwalten</h3>
              <p className="text-sm text-gray-500">Alle Buchungen einsehen und zuweisen</p>
            </div>
          </div>
        </Link>

        <Link href="/admin/reports" className="card hover:shadow-lg transition-shadow">
          <div className="card-body flex items-center">
            <CurrencyEuroIcon className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <h3 className="font-medium text-gray-900">Berichte</h3>
              <p className="text-sm text-gray-500">Umsatz und Statistiken</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Bookings Table */}
      <div className="card">
        <div className="card-header flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Aktuelle Buchungen</h3>
          <Link href="/admin/bookings" className="text-sm text-primary-600 hover:text-primary-500">
            Alle anzeigen
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kunde
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Walker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentBookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {booking.customer.firstName} {booking.customer.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{booking.customer.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(new Date(booking.scheduledDate), 'PPP', { locale: de })}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(booking.scheduledDate), 'HH:mm')} Uhr
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {booking.walker ? (
                      <div className="text-sm text-gray-900">
                        {booking.walker.user.firstName} {booking.walker.user.lastName}
                      </div>
                    ) : (
                      <span className="badge badge-warning">Nicht zugewiesen</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {parseFloat(booking.totalPrice).toFixed(2)} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
