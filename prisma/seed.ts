import { PrismaClient, UserRole, DogSize, ServiceType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create services
  const services = await Promise.all([
    prisma.service.upsert({
      where: { type: 'SINGLE_WALK' },
      update: {},
      create: {
        type: 'SINGLE_WALK',
        name: 'Einzelspaziergang',
        description: '60 Minuten individueller Spaziergang mit Ihrem Hund. Volle Aufmerksamkeit fuer Ihren Vierbeiner.',
        durationMinutes: 60,
        basePrice: 25.0,
        groupDiscount: 0,
      },
    }),
    prisma.service.upsert({
      where: { type: 'GROUP_WALK' },
      update: {},
      create: {
        type: 'GROUP_WALK',
        name: 'Gruppenspaziergang',
        description: '90 Minuten Spaziergang in einer Gruppe von 2-4 Hunden. Ideal fuer soziale Hunde.',
        durationMinutes: 90,
        basePrice: 18.0,
        groupDiscount: 0.15,
      },
    }),
    prisma.service.upsert({
      where: { type: 'DAYCARE' },
      update: {},
      create: {
        type: 'DAYCARE',
        name: 'Tagesbetreuung',
        description: 'Ganztaegige Betreuung inkl. mehrerer Spaziergaenge, Fuetterung und Spielzeit.',
        durationMinutes: 480,
        basePrice: 45.0,
        groupDiscount: 0.1,
      },
    }),
    prisma.service.upsert({
      where: { type: 'PUPPY_VISIT' },
      update: {},
      create: {
        type: 'PUPPY_VISIT',
        name: 'Welpenbesuch',
        description: '30 Minuten Besuch fuer Welpen. Kurzer Spaziergang und Spielzeit.',
        durationMinutes: 30,
        basePrice: 15.0,
        groupDiscount: 0,
      },
    }),
    prisma.service.upsert({
      where: { type: 'HOME_VISIT' },
      update: {},
      create: {
        type: 'HOME_VISIT',
        name: 'Hausbesuch',
        description: '30 Minuten Hausbesuch fuer Fuetterung, Medikamentengabe oder kurze Spielzeit.',
        durationMinutes: 30,
        basePrice: 12.0,
        groupDiscount: 0,
      },
    }),
  ])

  console.log('Services created:', services.length)

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pawfect-service.com' },
    update: {},
    create: {
      email: 'admin@pawfect-service.com',
      name: 'Administrator',
      password: adminPassword,
      role: 'ADMIN',
      phone: '+49 123 456789',
    },
  })

  console.log('Admin user created:', admin.email)

  // Create walker users
  const walkerPassword = await bcrypt.hash('walker123', 12)

  const walker1User = await prisma.user.upsert({
    where: { email: 'maria@pawfect-service.com' },
    update: {},
    create: {
      email: 'maria@pawfect-service.com',
      name: 'Maria Schmidt',
      password: walkerPassword,
      role: 'WALKER',
      phone: '+49 170 1234567',
    },
  })

  const walker1 = await prisma.walker.upsert({
    where: { userId: walker1User.id },
    update: {},
    create: {
      userId: walker1User.id,
      employeeNumber: 'EMP-0001',
      startDate: new Date('2023-01-15'),
      hourlyRate: 15.0,
      maxDogs: 4,
      canDriveCar: true,
      workAreas: ['10115', '10117', '10119', '10178', '10179'],
      availableFrom: '08:00',
      availableTo: '18:00',
      workDays: [1, 2, 3, 4, 5],
    },
  })

  const walker2User = await prisma.user.upsert({
    where: { email: 'thomas@pawfect-service.com' },
    update: {},
    create: {
      email: 'thomas@pawfect-service.com',
      name: 'Thomas Mueller',
      password: walkerPassword,
      role: 'WALKER',
      phone: '+49 171 9876543',
    },
  })

  const walker2 = await prisma.walker.upsert({
    where: { userId: walker2User.id },
    update: {},
    create: {
      userId: walker2User.id,
      employeeNumber: 'EMP-0002',
      startDate: new Date('2023-06-01'),
      hourlyRate: 14.0,
      maxDogs: 3,
      canDriveCar: true,
      workAreas: ['10115', '10117', '10119', '10178', '10179', '10243', '10245'],
      availableFrom: '09:00',
      availableTo: '17:00',
      workDays: [1, 2, 3, 4, 5, 6],
    },
  })

  console.log('Walkers created:', 2)

  // Create vehicles
  const vehicle1 = await prisma.vehicle.upsert({
    where: { licensePlate: 'B-PF 1234' },
    update: {},
    create: {
      licensePlate: 'B-PF 1234',
      brand: 'VW',
      model: 'Caddy',
      year: 2022,
      color: 'Weiss',
      maxDogs: 4,
      mileage: 15000,
      insuranceNumber: 'INS-2024-001',
      insuranceExpiry: new Date('2025-03-31'),
      nextServiceDue: new Date('2025-01-15'),
      assignedWalkerId: walker1.id,
    },
  })

  const vehicle2 = await prisma.vehicle.upsert({
    where: { licensePlate: 'B-PF 5678' },
    update: {},
    create: {
      licensePlate: 'B-PF 5678',
      brand: 'Renault',
      model: 'Kangoo',
      year: 2021,
      color: 'Silber',
      maxDogs: 3,
      mileage: 25000,
      insuranceNumber: 'INS-2024-002',
      insuranceExpiry: new Date('2025-06-30'),
      nextServiceDue: new Date('2025-02-28'),
      assignedWalkerId: walker2.id,
    },
  })

  console.log('Vehicles created:', 2)

  // Create customer user
  const customerPassword = await bcrypt.hash('kunde123', 12)

  const customer1User = await prisma.user.upsert({
    where: { email: 'max.mustermann@email.de' },
    update: {},
    create: {
      email: 'max.mustermann@email.de',
      name: 'Max Mustermann',
      password: customerPassword,
      role: 'CUSTOMER',
      phone: '+49 172 5555555',
    },
  })

  const customer1 = await prisma.customer.upsert({
    where: { userId: customer1User.id },
    update: {},
    create: {
      userId: customer1User.id,
      street: 'Musterstrasse',
      houseNumber: '42',
      postalCode: '10115',
      city: 'Berlin',
      latitude: 52.5200,
      longitude: 13.4050,
    },
  })

  const customer2User = await prisma.user.upsert({
    where: { email: 'anna.schmidt@email.de' },
    update: {},
    create: {
      email: 'anna.schmidt@email.de',
      name: 'Anna Schmidt',
      password: customerPassword,
      role: 'CUSTOMER',
      phone: '+49 173 6666666',
    },
  })

  const customer2 = await prisma.customer.upsert({
    where: { userId: customer2User.id },
    update: {},
    create: {
      userId: customer2User.id,
      street: 'Beispielweg',
      houseNumber: '7',
      postalCode: '10117',
      city: 'Berlin',
      latitude: 52.5170,
      longitude: 13.3888,
    },
  })

  console.log('Customers created:', 2)

  // Create dogs
  const dog1 = await prisma.dog.upsert({
    where: { id: 'dog-1' },
    update: {},
    create: {
      id: 'dog-1',
      customerId: customer1.id,
      name: 'Bello',
      breed: 'Labrador',
      size: 'LARGE',
      birthDate: new Date('2020-05-15'),
      weight: 32,
      vaccinated: true,
      neutered: true,
      friendlyWithDogs: true,
      friendlyWithPeople: true,
    },
  })

  const dog2 = await prisma.dog.upsert({
    where: { id: 'dog-2' },
    update: {},
    create: {
      id: 'dog-2',
      customerId: customer1.id,
      name: 'Luna',
      breed: 'Golden Retriever',
      size: 'LARGE',
      birthDate: new Date('2021-08-20'),
      weight: 28,
      vaccinated: true,
      neutered: false,
      friendlyWithDogs: true,
      friendlyWithPeople: true,
    },
  })

  const dog3 = await prisma.dog.upsert({
    where: { id: 'dog-3' },
    update: {},
    create: {
      id: 'dog-3',
      customerId: customer2.id,
      name: 'Rocky',
      breed: 'Dackel',
      size: 'SMALL',
      birthDate: new Date('2019-03-10'),
      weight: 8,
      vaccinated: true,
      neutered: true,
      friendlyWithDogs: true,
      friendlyWithPeople: true,
      specialNeeds: 'Hat manchmal Rueckenprobleme, bitte keine Treppen steigen lassen',
    },
  })

  console.log('Dogs created:', 3)

  // Create some sample bookings
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  // Create a walk slot for tomorrow
  const walkSlot = await prisma.walkSlot.create({
    data: {
      walkerId: walker1.id,
      date: tomorrow,
      startTime: '10:00',
      endTime: '12:00',
      maxDogs: 4,
      currentDogs: 2,
      status: 'OPEN',
      areaPostalCode: '10115',
      acceptedByWalker: true,
      acceptedAt: new Date(),
    },
  })

  // Create booking for customer 1
  const booking1 = await prisma.booking.create({
    data: {
      customerId: customer1.id,
      serviceId: services[1].id, // GROUP_WALK
      requestedDate: tomorrow,
      requestedTimeStart: '10:00',
      requestedTimeEnd: '12:00',
      status: 'CONFIRMED',
      useCustomerAddress: true,
      totalPrice: 36.0, // 2 dogs * 18 EUR
      walkSlotId: walkSlot.id,
      bookingDogs: {
        create: [
          { dogId: dog1.id },
          { dogId: dog2.id },
        ],
      },
    },
  })

  console.log('Sample bookings created')

  // Create system settings
  await prisma.systemSetting.upsert({
    where: { key: 'company_name' },
    update: {},
    create: {
      key: 'company_name',
      value: 'Pawfect Service GmbH',
      description: 'Firmenname fuer Rechnungen',
    },
  })

  await prisma.systemSetting.upsert({
    where: { key: 'max_group_size' },
    update: {},
    create: {
      key: 'max_group_size',
      value: '4',
      description: 'Maximale Hundeanzahl pro Gruppenspaziergang',
    },
  })

  await prisma.systemSetting.upsert({
    where: { key: 'booking_advance_days' },
    update: {},
    create: {
      key: 'booking_advance_days',
      value: '1',
      description: 'Mindestvorlaufzeit fuer Buchungen in Tagen',
    },
  })

  console.log('System settings created')

  console.log('Seeding completed!')
  console.log('')
  console.log('Test-Accounts:')
  console.log('Admin: admin@pawfect-service.com / admin123')
  console.log('Walker: maria@pawfect-service.com / walker123')
  console.log('Kunde: max.mustermann@email.de / kunde123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
