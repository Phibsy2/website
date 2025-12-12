import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starte Seeding...');

  // Admin-Benutzer erstellen
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dogwalking.de' },
    update: {},
    create: {
      email: 'admin@dogwalking.de',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });
  console.log(`Admin erstellt: ${admin.email}`);

  // Test-Walker erstellen
  const walkerPassword = await bcrypt.hash('Walker123!', 12);
  const walker = await prisma.user.upsert({
    where: { email: 'walker@dogwalking.de' },
    update: {},
    create: {
      email: 'walker@dogwalking.de',
      passwordHash: walkerPassword,
      firstName: 'Max',
      lastName: 'Mustermann',
      phone: '+49 171 1234567',
      role: UserRole.WALKER,
      emailVerified: true,
    },
  });
  console.log(`Walker erstellt: ${walker.email}`);

  // Walker-Profil erstellen
  const walkerProfile = await prisma.walkerProfile.upsert({
    where: { userId: walker.id },
    update: {},
    create: {
      userId: walker.id,
      bio: 'Erfahrener Dog Walker mit Liebe zu allen Hunderassen. Seit 5 Jahren im Geschäft.',
      experience: 5,
      maxDogs: 4,
      hourlyRate: 15,
      serviceRadius: 5,
      isAvailable: true,
    },
  });

  // Service-Gebiete für Walker
  await prisma.serviceArea.upsert({
    where: {
      walkerProfileId_postalCode: {
        walkerProfileId: walkerProfile.id,
        postalCode: '10115',
      },
    },
    update: {},
    create: {
      walkerProfileId: walkerProfile.id,
      postalCode: '10115',
      city: 'Berlin',
      latitude: 52.5326,
      longitude: 13.3884,
    },
  });

  // Verfügbarkeit für Walker (Mo-Fr 8-18 Uhr)
  for (let day = 1; day <= 5; day++) {
    await prisma.walkerAvailability.upsert({
      where: {
        walkerProfileId_dayOfWeek_startTime_endTime: {
          walkerProfileId: walkerProfile.id,
          dayOfWeek: day,
          startTime: '08:00',
          endTime: '18:00',
        },
      },
      update: {},
      create: {
        walkerProfileId: walkerProfile.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '18:00',
        isActive: true,
      },
    });
  }
  console.log('Walker-Profil und Verfügbarkeit erstellt');

  // Test-Kunde erstellen
  const customerPassword = await bcrypt.hash('Kunde123!', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'kunde@example.de' },
    update: {},
    create: {
      email: 'kunde@example.de',
      passwordHash: customerPassword,
      firstName: 'Anna',
      lastName: 'Schmidt',
      phone: '+49 172 9876543',
      role: UserRole.CUSTOMER,
      emailVerified: true,
    },
  });
  console.log(`Kunde erstellt: ${customer.email}`);

  // Adresse für Kunden
  const address = await prisma.address.upsert({
    where: { id: 'seed-address-1' },
    update: {},
    create: {
      id: 'seed-address-1',
      userId: customer.id,
      street: 'Berliner Straße',
      houseNumber: '123',
      postalCode: '10115',
      city: 'Berlin',
      latitude: 52.5320,
      longitude: 13.3850,
      isDefault: true,
      label: 'Zuhause',
    },
  });
  console.log('Kundenadresse erstellt');

  // Hund für Kunden
  const dog = await prisma.dog.upsert({
    where: { id: 'seed-dog-1' },
    update: {},
    create: {
      id: 'seed-dog-1',
      ownerId: customer.id,
      name: 'Bello',
      breed: 'Labrador Retriever',
      age: 3,
      weight: 28,
      size: 'groß',
      temperament: 'Freundlich und verspielt',
      isVaccinated: true,
      isNeutered: true,
    },
  });
  console.log('Hund erstellt');

  // Zweiter Kunde für Gruppentermin-Tests
  const customer2Password = await bcrypt.hash('Kunde123!', 12);
  const customer2 = await prisma.user.upsert({
    where: { email: 'kunde2@example.de' },
    update: {},
    create: {
      email: 'kunde2@example.de',
      passwordHash: customer2Password,
      firstName: 'Thomas',
      lastName: 'Müller',
      phone: '+49 173 1111111',
      role: UserRole.CUSTOMER,
      emailVerified: true,
    },
  });

  await prisma.address.upsert({
    where: { id: 'seed-address-2' },
    update: {},
    create: {
      id: 'seed-address-2',
      userId: customer2.id,
      street: 'Friedrichstraße',
      houseNumber: '50',
      postalCode: '10117',
      city: 'Berlin',
      latitude: 52.5200,
      longitude: 13.3880,
      isDefault: true,
      label: 'Zuhause',
    },
  });

  await prisma.dog.upsert({
    where: { id: 'seed-dog-2' },
    update: {},
    create: {
      id: 'seed-dog-2',
      ownerId: customer2.id,
      name: 'Luna',
      breed: 'Golden Retriever',
      age: 2,
      weight: 25,
      size: 'groß',
      temperament: 'Sanft und freundlich',
      isVaccinated: true,
      isNeutered: false,
    },
  });
  console.log('Zweiter Kunde mit Adresse und Hund erstellt');

  // Systemkonfiguration
  const configs = [
    { key: 'BASE_PRICE_PER_HOUR', value: '15', description: 'Basispreis pro Stunde in Euro' },
    { key: 'PRICE_PER_ADDITIONAL_DOG', value: '10', description: 'Zusatzpreis pro weiterem Hund' },
    { key: 'GROUP_WALK_MAX_RADIUS', value: '3', description: 'Maximaler Radius für Gruppentermine in km' },
    { key: 'GROUP_WALK_TIME_WINDOW', value: '60', description: 'Zeitfenster für Terminzusammenlegung in Minuten' },
    { key: 'CANCELLATION_DEADLINE_HOURS', value: '24', description: 'Stunden vor Termin für kostenlose Stornierung' },
  ];

  for (const cfg of configs) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value },
      create: cfg,
    });
  }
  console.log('Systemkonfiguration erstellt');

  // Beispiel-Gruppentermin erstellen
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  futureDate.setHours(10, 0, 0, 0);

  await prisma.groupWalk.upsert({
    where: { id: 'seed-group-walk-1' },
    update: {},
    create: {
      id: 'seed-group-walk-1',
      walkerId: walkerProfile.id,
      title: 'Morgen-Spaziergang im Tiergarten',
      description: 'Entspannter Gruppenspaziergang durch den Tiergarten. Ideal für gesellige Hunde.',
      meetingPoint: 'Brandenburger Tor, Westseite',
      meetingLat: 52.5163,
      meetingLng: 13.3777,
      scheduledDate: futureDate,
      duration: 60,
      maxParticipants: 6,
      pricePerDog: 12,
      status: 'OPEN',
    },
  });
  console.log('Beispiel-Gruppentermin erstellt');

  console.log('Seeding abgeschlossen!');
  console.log('\n--- Test-Zugangsdaten ---');
  console.log('Admin: admin@dogwalking.de / Admin123!');
  console.log('Walker: walker@dogwalking.de / Walker123!');
  console.log('Kunde: kunde@example.de / Kunde123!');
  console.log('Kunde 2: kunde2@example.de / Kunde123!');
}

main()
  .catch((e) => {
    console.error('Seeding Fehler:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
