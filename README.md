# 🐕 Pawfect Service - Dogwalking Platform

Eine produktionsreife Dogwalking-Webseite mit Kundenbuchung, Adminpanel und Walker-Management.

## 🌟 Features

### Kundenportal
- Online-Buchung von Dogwalking-Terminen
- Hunde-Profilverwaltung
- Buchungshistorie und Rechnungen
- Echtzeit-Benachrichtigungen

### Adminpanel
- Mitarbeiterverwaltung (Walker)
- Buchungsübersicht und -management
- Fahrzeugverwaltung
- Reporting und Statistiken
- Automatische Terminzusammenlegung

### Walker-Dashboard
- Persönlicher Terminkalender
- Terminannahme/-ablehnung
- Routenplanung
- Gruppenterminübersicht

### Intelligente Features
- **Automatische Terminzusammenlegung**: Basierend auf Adresse und bestehenden Terminen
- **Gruppentermine**: Bis zu 4 Hunde pro Walker
- **Routenoptimierung**: Minimiert Fahrzeiten

## 🛠 Technologie-Stack

- **Framework**: Next.js 14 (App Router)
- **Sprache**: TypeScript
- **Datenbank**: PostgreSQL mit Prisma ORM
- **Authentifizierung**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI-Komponenten**: Shadcn/ui
- **Maps**: Google Maps API
- **E-Mail**: Nodemailer

## 📁 Projektstruktur

```
pawfect-service/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentifizierung
│   │   ├── (customer)/        # Kundenbereich
│   │   ├── (admin)/           # Adminpanel
│   │   ├── (walker)/          # Walker-Dashboard
│   │   └── api/               # API Routes
│   ├── components/            # React-Komponenten
│   │   ├── ui/               # Basis-UI-Komponenten
│   │   ├── booking/          # Buchungskomponenten
│   │   ├── admin/            # Admin-Komponenten
│   │   └── walker/           # Walker-Komponenten
│   ├── lib/                   # Utilities und Helpers
│   │   ├── prisma.ts         # Prisma Client
│   │   ├── auth.ts           # Auth-Konfiguration
│   │   └── scheduling.ts     # Terminlogik
│   └── types/                 # TypeScript-Typen
├── prisma/
│   └── schema.prisma          # Datenbankschema
└── public/                    # Statische Assets
```

## 🚀 Installation

```bash
# Dependencies installieren
npm install

# Datenbank einrichten
npx prisma generate
npx prisma db push

# Entwicklungsserver starten
npm run dev
```

## 🔧 Umgebungsvariablen

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_MAPS_API_KEY="your-key"
```

## 📋 Workflow

### Buchungsprozess
1. Kunde registriert sich und fügt Hund(e) hinzu
2. Kunde wählt Datum/Zeit und Service
3. System prüft Verfügbarkeit und schlägt Gruppentermine vor
4. Buchung wird erstellt und Walker zugewiesen
5. Walker erhält Benachrichtigung und kann annehmen/ablehnen
6. Kunde erhält Bestätigung

### Terminzusammenlegung
1. Bei neuer Buchung: System prüft bestehende Termine
2. Matching nach: PLZ, Zeitfenster, verfügbare Kapazität
3. Automatischer Vorschlag für Gruppentermin
4. Walker kann Gruppen manuell anpassen

## 📞 Support

Website: https://pawfect-service.com/
E-Mail: info@pawfect-service.com
