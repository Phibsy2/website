import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { Dog, Calendar, Home, User, LogOut, Bell, PawPrint } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'CUSTOMER') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/customer" className="flex items-center gap-2">
              <Dog className="h-8 w-8 text-orange-500" />
              <span className="text-xl font-bold text-gray-900">Pawfect Service</span>
            </Link>
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
                <span className="text-sm font-medium hidden sm:block">{session.user.name}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r min-h-[calc(100vh-4rem)] hidden md:block">
          <nav className="p-4 space-y-2">
            <Link
              href="/customer"
              className="flex items-center gap-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-500"
            >
              <Home className="h-5 w-5" />
              Uebersicht
            </Link>
            <Link
              href="/customer/booking"
              className="flex items-center gap-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-500"
            >
              <Calendar className="h-5 w-5" />
              Termin buchen
            </Link>
            <Link
              href="/customer/bookings"
              className="flex items-center gap-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-500"
            >
              <PawPrint className="h-5 w-5" />
              Meine Termine
            </Link>
            <Link
              href="/customer/dogs"
              className="flex items-center gap-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-500"
            >
              <Dog className="h-5 w-5" />
              Meine Hunde
            </Link>
            <Link
              href="/customer/profile"
              className="flex items-center gap-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-orange-50 hover:text-orange-500"
            >
              <User className="h-5 w-5" />
              Profil
            </Link>
            <hr className="my-4" />
            <Link
              href="/api/auth/signout"
              className="flex items-center gap-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-500"
            >
              <LogOut className="h-5 w-5" />
              Abmelden
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="flex justify-around py-2">
          <Link href="/customer" className="flex flex-col items-center p-2 text-gray-600">
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link href="/customer/booking" className="flex flex-col items-center p-2 text-gray-600">
            <Calendar className="h-5 w-5" />
            <span className="text-xs">Buchen</span>
          </Link>
          <Link href="/customer/dogs" className="flex flex-col items-center p-2 text-gray-600">
            <Dog className="h-5 w-5" />
            <span className="text-xs">Hunde</span>
          </Link>
          <Link href="/customer/profile" className="flex flex-col items-center p-2 text-gray-600">
            <User className="h-5 w-5" />
            <span className="text-xs">Profil</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
