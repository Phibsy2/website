import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import {
  Dog,
  Calendar,
  Users,
  Car,
  Settings,
  LogOut,
  Bell,
  LayoutDashboard,
  CreditCard,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white">
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-2">
            <Dog className="h-8 w-8 text-orange-500" />
            <span className="text-xl font-bold">Pawfect Admin</span>
          </Link>
        </div>

        <nav className="px-4 space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white"
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>
          <Link
            href="/admin/bookings"
            className="flex items-center gap-3 px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white"
          >
            <Calendar className="h-5 w-5" />
            Buchungen
          </Link>
          <Link
            href="/admin/walkers"
            className="flex items-center gap-3 px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white"
          >
            <Users className="h-5 w-5" />
            Walker
          </Link>
          <Link
            href="/admin/customers"
            className="flex items-center gap-3 px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white"
          >
            <Dog className="h-5 w-5" />
            Kunden
          </Link>
          <Link
            href="/admin/vehicles"
            className="flex items-center gap-3 px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white"
          >
            <Car className="h-5 w-5" />
            Fahrzeuge
          </Link>
          <Link
            href="/admin/invoices"
            className="flex items-center gap-3 px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white"
          >
            <CreditCard className="h-5 w-5" />
            Rechnungen
          </Link>
          <Link
            href="/admin/reports"
            className="flex items-center gap-3 px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white"
          >
            <BarChart3 className="h-5 w-5" />
            Berichte
          </Link>

          <div className="pt-8">
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 px-4 py-3 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white"
            >
              <Settings className="h-5 w-5" />
              Einstellungen
            </Link>
            <Link
              href="/api/auth/signout"
              className="flex items-center gap-3 px-4 py-3 text-gray-300 rounded-lg hover:bg-red-900 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              Abmelden
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-6">
          <h2 className="text-lg font-semibold text-gray-800">Administration</h2>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-500 font-semibold text-sm">
                  {session.user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium">{session.user.name}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
