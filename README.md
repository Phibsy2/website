# Dog Walking Platform

Eine professionelle Dog-Walking-Plattform mit intelligentem Terminzusammenlegungs-Algorithmus, Walker-Management und Kundenbuchungssystem.

## Features

### Kundenfunktionen
- **Buchungssystem**: Einfache Buchung von Einzelterminen
- **Gruppenspaziergänge**: Teilnahme an kostengünstigeren Gruppenterminen
- **Hundeverwaltung**: Profile für mehrere Hunde
- **Adressverwaltung**: Mehrere Abholadressen
- **Bewertungssystem**: Walker bewerten und Feedback geben

### Walker-Funktionen
- **Dashboard**: Übersicht über anstehende Termine und Statistiken
- **Gruppentermine**: Eigene Gruppenspaziergänge erstellen
- **Service-Gebiete**: Einzugsgebiete definieren
- **Verfügbarkeit**: Arbeitszeiten verwalten
- **Intelligente Gruppierung**: Automatische Vorschläge zur Terminzusammenlegung

### Admin-Funktionen
- **Dashboard**: Plattform-Statistiken und KPIs
- **Benutzerverwaltung**: Kunden und Walker verwalten
- **Buchungsverwaltung**: Alle Buchungen einsehen und zuweisen
- **Berichte**: Umsatzanalysen und Reports

### Intelligenter Algorithmus
Der Terminzusammenlegungs-Algorithmus optimiert Buchungen basierend auf:
- **Geografische Nähe**: Clustering von Adressen im gleichen Radius
- **Zeitliche Kompatibilität**: Überlappende Zeitfenster
- **Kapazitätsoptimierung**: Maximale Hundeanzahl pro Walker
- **Routenoptimierung**: Minimierung der Gesamtdistanz

## Technologie-Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js mit TypeScript
- **Datenbank**: PostgreSQL mit Prisma ORM
- **Authentifizierung**: JWT (Access + Refresh Tokens)
- **Validierung**: Zod
- **Logging**: Winston

### Frontend
- **Framework**: Next.js 14 mit TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **API Client**: Axios
- **Forms**: React Hook Form

### Deployment
- **Container**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **Datenbank**: PostgreSQL 15

## Installation

### Voraussetzungen
- Node.js 20+
- npm oder yarn
- Docker & Docker Compose (für Produktion)
- PostgreSQL (für lokale Entwicklung)

### Lokale Entwicklung

1. **Repository klonen**
```bash
git clone <repository-url>
cd dog-walking-platform
```

2. **Abhängigkeiten installieren**
```bash
npm install
```

3. **Umgebungsvariablen konfigurieren**
```bash
cp .env.example .env
# .env Datei bearbeiten und Werte anpassen
```

4. **Datenbank einrichten**
```bash
# PostgreSQL starten (lokal oder via Docker)
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15

# Migrationen ausführen
cd backend
npx prisma migrate dev

# Testdaten laden
npm run db:seed
```

5. **Entwicklungsserver starten**
```bash
# Im Root-Verzeichnis
npm run dev
```

Die Anwendung ist verfügbar unter:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

### Docker Deployment

1. **Umgebungsvariablen konfigurieren**
```bash
cp .env.example .env
# Sichere Passwörter und JWT-Secrets setzen!
```

2. **Container starten**
```bash
docker-compose up -d
```

3. **Datenbank migrieren und seeden**
```bash
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npm run db:seed
```

### Produktion mit Nginx

```bash
docker-compose --profile production up -d
```

## API-Dokumentation

### Authentifizierung

#### Registrierung
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.de",
  "password": "SecurePass123",
  "firstName": "Max",
  "lastName": "Mustermann",
  "role": "CUSTOMER"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.de",
  "password": "SecurePass123"
}
```

### Buchungen

#### Buchung erstellen
```http
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "addressId": "clm123...",
  "dogIds": ["clm456..."],
  "scheduledDate": "2024-01-20T10:00:00Z",
  "duration": 60,
  "notes": "Bitte hinten am Gartentor"
}
```

### Gruppentermine

#### Gruppentermine auflisten
```http
GET /api/group-walks?status=OPEN&latitude=52.52&longitude=13.40&radius=5
```

#### Gruppentermin beitreten
```http
POST /api/group-walks/:id/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "addressId": "clm123...",
  "dogIds": ["clm456..."]
}
```

## Test-Zugangsdaten

Nach dem Seeding sind folgende Testaccounts verfügbar:

| Rolle | E-Mail | Passwort |
|-------|--------|----------|
| Admin | admin@dogwalking.de | Admin123! |
| Walker | walker@dogwalking.de | Walker123! |
| Kunde | kunde@example.de | Kunde123! |
| Kunde 2 | kunde2@example.de | Kunde123! |

## Sicherheit

### Implementierte Maßnahmen
- **JWT-basierte Authentifizierung** mit Access- und Refresh-Tokens
- **Passwort-Hashing** mit bcrypt (12 Rounds)
- **Rate Limiting** für API-Endpunkte und Login
- **Input-Validierung** mit Zod
- **SQL-Injection-Schutz** durch Prisma ORM
- **XSS-Schutz** durch Helmet-Middleware
- **CORS-Konfiguration** für erlaubte Origins
- **Security Headers** (HSTS, X-Frame-Options, etc.)

### Best Practices
- Sichere JWT-Secrets (min. 32 Zeichen) verwenden
- Regelmäßige Passwort-Rotation
- HTTPS in Produktion aktivieren
- Regelmäßige Sicherheitsupdates

## Tests ausführen

```bash
# Backend-Tests
cd backend
npm run test

# Mit Coverage
npm run test -- --coverage
```

## Projektstruktur

```
dog-walking-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Datenbank-Schema
│   │   └── seed.ts            # Testdaten
│   ├── src/
│   │   ├── config/            # Konfiguration
│   │   ├── controllers/       # Request Handler
│   │   ├── middleware/        # Auth, Validation, etc.
│   │   ├── routes/            # API Routes
│   │   ├── services/          # Business Logic
│   │   │   └── groupingAlgorithm.ts  # Terminzusammenlegung
│   │   ├── types/             # TypeScript Types
│   │   └── utils/             # Utilities
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   ├── components/        # React Components
│   │   ├── lib/               # API Client, Auth Store
│   │   └── hooks/             # Custom Hooks
│   └── Dockerfile
├── docker/
│   └── nginx/                 # Nginx Konfiguration
├── docker-compose.yml
└── README.md
```

## Lizenz

Proprietary - Alle Rechte vorbehalten.

## Support

Bei Fragen oder Problemen erstellen Sie ein Issue im Repository.
