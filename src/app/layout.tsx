import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pawfect Service - Professioneller Dogwalking Service',
  description: 'Ihr zuverlaessiger Partner fuer Hundespaziergaenge. Professionelle Walker, flexible Termine, liebevolle Betreuung.',
  keywords: 'Dogwalking, Hundebetreuung, Hundespaziergaenge, Gassi-Service, Hundeservice',
  authors: [{ name: 'Pawfect Service' }],
  openGraph: {
    title: 'Pawfect Service - Professioneller Dogwalking Service',
    description: 'Ihr zuverlaessiger Partner fuer Hundespaziergaenge.',
    url: 'https://pawfect-service.com',
    siteName: 'Pawfect Service',
    locale: 'de_DE',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
