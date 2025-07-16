# Feuerwehrförderverein Oberstaufenbach - Website

## Projektübersicht
Moderne, benutzerfreundliche Website für den Feuerwehrförderverein Oberstaufenbach mit integriertem CMS für einfache Inhaltsverwaltung durch Vorstandsmitglieder.

## Technologie-Stack
- **Frontend**: Next.js 14 mit TypeScript
- **Backend/CMS**: Strapi v4
- **Styling**: Tailwind CSS
- **Datenbank**: SQLite (Entwicklung) / PostgreSQL (Produktion)
- **Hosting**: Vercel (Frontend) + Railway/Render (Backend)

## Projektstruktur
```
feuerwehrfoerderverein-oberstaufenbach/
├── frontend/          # Next.js Frontend-Anwendung
├── backend/           # Strapi CMS Backend
├── docs/              # Dokumentation für Vorstandsmitglieder
└── KONZEPTLEITFADEN.md
```

## Installation & Entwicklung

### Voraussetzungen
- Node.js 18+ 
- npm oder yarn
- Git

### Installation
```bash
# Alle Dependencies installieren
npm run install:all
```

### Entwicklung
```bash
# Frontend und Backend gleichzeitig starten
npm run dev

# Oder einzeln starten:
npm run dev:backend   # Nur Backend (Strapi)
npm run dev:frontend  # Nur Frontend (Next.js)
```

### Produktion
```bash
# Beide Anwendungen bauen
npm run build

# Beide Anwendungen im Produktionsmodus starten
npm run start
```

## Features
- Responsive Design für alle Geräte
- Einfaches CMS für Vorstandsmitglieder
- News & Veranstaltungskalender
- Mitgliederverwaltung
- Kontaktformular
- SEO-optimiert

## Support
Bei Fragen oder Problemen wenden Sie sich an den technischen Ansprechpartner des Vereins.