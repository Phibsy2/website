import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dog, Calendar, Users, Car, Shield, Clock, Heart, MapPin } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Dog className="h-8 w-8 text-orange-500" />
              <span className="text-xl font-bold text-gray-900">Pawfect Service</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <Link href="#services" className="text-gray-600 hover:text-orange-500">
                Services
              </Link>
              <Link href="#about" className="text-gray-600 hover:text-orange-500">
                Ueber uns
              </Link>
              <Link href="#pricing" className="text-gray-600 hover:text-orange-500">
                Preise
              </Link>
              <Link href="/login">
                <Button variant="outline">Anmelden</Button>
              </Link>
              <Link href="/register">
                <Button>Registrieren</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="paw-pattern bg-gradient-to-br from-orange-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Professioneller<br />
                <span className="text-orange-500">Dogwalking Service</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Wir bieten liebevolle Betreuung und ausgedehnte Spaziergaenge fuer Ihren
                Vierbeiner. Professionell, zuverlaessig und mit Herz.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto">
                    Jetzt buchen
                  </Button>
                </Link>
                <Link href="#services">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Mehr erfahren
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="bg-orange-100 rounded-full w-80 h-80 mx-auto flex items-center justify-center">
                <Dog className="h-40 w-40 text-orange-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="font-semibold mb-2">Versichert</h3>
              <p className="text-sm text-gray-600">Vollstaendiger Versicherungsschutz</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="font-semibold mb-2">Puenktlich</h3>
              <p className="text-sm text-gray-600">Zuverlaessige Abholzeiten</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="font-semibold mb-2">Mit Liebe</h3>
              <p className="text-sm text-gray-600">Erfahrene Hundeliebhaber</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="font-semibold mb-2">GPS Tracking</h3>
              <p className="text-sm text-gray-600">Echtzeit-Standort</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Unsere Services</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Waehlen Sie aus unseren verschiedenen Angeboten das passende fuer Ihren Hund
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <Dog className="h-6 w-6 text-orange-500" />
                </div>
                <CardTitle>Einzelspaziergang</CardTitle>
                <CardDescription>60 Minuten individuelle Betreuung</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Ihr Hund erhaelt die volle Aufmerksamkeit unseres Walkers. Ideal fuer
                  Hunde, die eine individuelle Betreuung bevorzugen.
                </p>
                <p className="text-2xl font-bold text-orange-500">25,00 EUR</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 shadow-lg">
              <CardHeader>
                <div className="bg-orange-500 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Gruppenspaziergang</CardTitle>
                <CardDescription>90 Minuten in der Gruppe (2-4 Hunde)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Ihr Hund kann mit anderen Vierbeinern spielen und toben. Perfekt fuer
                  soziale Hunde, die Gesellschaft lieben.
                </p>
                <p className="text-2xl font-bold text-orange-500">18,00 EUR</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-orange-500" />
                </div>
                <CardTitle>Tagesbetreuung</CardTitle>
                <CardDescription>Ganzer Tag liebevolle Betreuung</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Von morgens bis abends bestens versorgt. Inklusive mehrerer Spaziergaenge,
                  Fuetterung und Spielzeit.
                </p>
                <p className="text-2xl font-bold text-orange-500">45,00 EUR</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">So funktioniert es</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              In nur wenigen Schritten zum gluecklichen Hund
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-orange-500 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Registrieren</h3>
              <p className="text-sm text-gray-600">Erstellen Sie Ihr Konto und fuegen Sie Ihren Hund hinzu</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-500 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Termin waehlen</h3>
              <p className="text-sm text-gray-600">Waehlen Sie Service, Datum und Uhrzeit</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-500 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Walker kommt</h3>
              <p className="text-sm text-gray-600">Unser Walker holt Ihren Hund ab</p>
            </div>
            <div className="text-center">
              <div className="bg-orange-500 text-white rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                4
              </div>
              <h3 className="font-semibold mb-2">Gluecklicher Hund</h3>
              <p className="text-sm text-gray-600">Ihr Hund geniesst seinen Spaziergang</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-orange-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Bereit fuer den ersten Spaziergang?
          </h2>
          <p className="text-orange-100 mb-8 max-w-2xl mx-auto">
            Registrieren Sie sich jetzt und buchen Sie Ihren ersten Termin.
            Ihr Hund wird es Ihnen danken!
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary">
              Kostenlos registrieren
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Dog className="h-6 w-6 text-orange-500" />
                <span className="font-bold">Pawfect Service</span>
              </div>
              <p className="text-gray-400 text-sm">
                Ihr zuverlaessiger Partner fuer professionelle Hundebetreuung.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Einzelspaziergang</li>
                <li>Gruppenspaziergang</li>
                <li>Tagesbetreuung</li>
                <li>Hausbesuch</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Kontakt</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>info@pawfect-service.com</li>
                <li>+49 123 456789</li>
                <li>Mo-Fr: 8:00 - 18:00</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Rechtliches</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/impressum" className="hover:text-orange-500">Impressum</Link></li>
                <li><Link href="/datenschutz" className="hover:text-orange-500">Datenschutz</Link></li>
                <li><Link href="/agb" className="hover:text-orange-500">AGB</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 Pawfect Service. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
