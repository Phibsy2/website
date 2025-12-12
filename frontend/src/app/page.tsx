'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/auth';
import {
  CalendarDaysIcon,
  MapPinIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  StarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'Einfache Buchung',
    description: 'Buchen Sie in wenigen Klicks einen professionellen Dog Walker für Ihren Hund.',
    icon: CalendarDaysIcon,
  },
  {
    name: 'Walker in Ihrer Nähe',
    description: 'Finden Sie zertifizierte Walker in Ihrer Umgebung mit unserem intelligenten Matching.',
    icon: MapPinIcon,
  },
  {
    name: 'Gruppenspaziergänge',
    description: 'Sparen Sie Geld mit Gruppenterminen - ideal für soziale Hunde.',
    icon: UserGroupIcon,
  },
  {
    name: 'Verifizierte Walker',
    description: 'Alle unsere Walker sind überprüft und erfahren im Umgang mit Hunden.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Bewertungen & Feedback',
    description: 'Lesen Sie Bewertungen anderer Hundebesitzer und teilen Sie Ihre Erfahrungen.',
    icon: StarIcon,
  },
  {
    name: 'Flexible Zeiten',
    description: 'Termine von früh bis spät - wir passen uns Ihrem Zeitplan an.',
    icon: ClockIcon,
  },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-primary-600">DogWalk</span>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link
                    href={user?.role === 'ADMIN' ? '/admin' : user?.role === 'WALKER' ? '/walker' : '/dashboard'}
                    className="btn-primary"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-outline">
                    Anmelden
                  </Link>
                  <Link href="/register" className="btn-primary">
                    Registrieren
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-primary-600 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-primary-600 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
                  <span className="block">Professionelle</span>
                  <span className="block text-primary-200">Hundebetreuung</span>
                </h1>
                <p className="mt-3 text-base text-primary-100 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Finden Sie den perfekten Dog Walker für Ihren Vierbeiner. Zuverlässig, erfahren und in Ihrer Nähe.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link
                      href="/register"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                    >
                      Jetzt starten
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link
                      href="/walker"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-700 hover:bg-primary-800 md:py-4 md:text-lg md:px-10"
                    >
                      Walker finden
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full bg-primary-500 sm:h-72 md:h-96 lg:w-full lg:h-full flex items-center justify-center">
            <span className="text-9xl">🐕</span>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">
              Warum DogWalk?
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Alles für glückliche Hunde
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Unsere Plattform verbindet Hundebesitzer mit professionellen Walkern - einfach, sicher und zuverlässig.
            </p>
          </div>

          <div className="mt-10">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.name} className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                      <feature.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">{feature.name}</p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            <span className="block">Bereit loszulegen?</span>
            <span className="block text-primary-600">Registrieren Sie sich noch heute.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link href="/register" className="btn-primary px-6 py-3">
                Kostenlos registrieren
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link href="/register?role=WALKER" className="btn-outline px-6 py-3">
                Als Walker registrieren
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Plattform</h3>
              <ul className="mt-4 space-y-4">
                <li><Link href="/walker" className="text-base text-gray-300 hover:text-white">Walker finden</Link></li>
                <li><Link href="/group-walks" className="text-base text-gray-300 hover:text-white">Gruppentermine</Link></li>
                <li><Link href="/pricing" className="text-base text-gray-300 hover:text-white">Preise</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Walker</h3>
              <ul className="mt-4 space-y-4">
                <li><Link href="/register?role=WALKER" className="text-base text-gray-300 hover:text-white">Walker werden</Link></li>
                <li><Link href="/walker/info" className="text-base text-gray-300 hover:text-white">Informationen</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Support</h3>
              <ul className="mt-4 space-y-4">
                <li><Link href="/help" className="text-base text-gray-300 hover:text-white">Hilfe</Link></li>
                <li><Link href="/contact" className="text-base text-gray-300 hover:text-white">Kontakt</Link></li>
                <li><Link href="/faq" className="text-base text-gray-300 hover:text-white">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-400 tracking-wider uppercase">Rechtliches</h3>
              <ul className="mt-4 space-y-4">
                <li><Link href="/privacy" className="text-base text-gray-300 hover:text-white">Datenschutz</Link></li>
                <li><Link href="/terms" className="text-base text-gray-300 hover:text-white">AGB</Link></li>
                <li><Link href="/imprint" className="text-base text-gray-300 hover:text-white">Impressum</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-700 pt-8">
            <p className="text-base text-gray-400 text-center">
              © {new Date().getFullYear()} DogWalk Platform. Alle Rechte vorbehalten.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
