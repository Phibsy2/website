import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

// Generischer Validierungs-Middleware-Generator
export const validate = <T extends ZodSchema>(schema: T, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      const validatedData = schema.parse(data);
      req[source] = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(new ValidationError(errors));
      } else {
        next(error);
      }
    }
  };
};

// Validierungsschemas für verschiedene Endpunkte

// Authentifizierung
export const registerSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z
    .string()
    .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
    .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
    .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
    .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten'),
  firstName: z.string().min(2, 'Vorname muss mindestens 2 Zeichen lang sein').max(50),
  lastName: z.string().min(2, 'Nachname muss mindestens 2 Zeichen lang sein').max(50),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Ungültige Telefonnummer').optional(),
  role: z.enum(['CUSTOMER', 'WALKER']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort erforderlich'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh Token erforderlich'),
});

// Benutzer
export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/).optional().nullable(),
});

// Adressen
export const addressSchema = z.object({
  street: z.string().min(2, 'Straße erforderlich').max(100),
  houseNumber: z.string().min(1, 'Hausnummer erforderlich').max(20),
  postalCode: z.string().regex(/^\d{5}$/, 'Ungültige Postleitzahl (5 Ziffern)'),
  city: z.string().min(2, 'Stadt erforderlich').max(100),
  country: z.string().default('Deutschland'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
  label: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
});

// Hunde
export const dogSchema = z.object({
  name: z.string().min(1, 'Name erforderlich').max(50),
  breed: z.string().min(2, 'Rasse erforderlich').max(50),
  age: z.number().int().min(0).max(30),
  weight: z.number().min(0.5).max(100),
  size: z.enum(['klein', 'mittel', 'groß']),
  temperament: z.string().max(200).optional(),
  specialNeeds: z.string().max(500).optional(),
  isVaccinated: z.boolean().default(true),
  isNeutered: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

// Buchungen
export const createBookingSchema = z.object({
  addressId: z.string().cuid('Ungültige Adress-ID'),
  dogIds: z.array(z.string().cuid()).min(1, 'Mindestens ein Hund erforderlich'),
  scheduledDate: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed > new Date();
  }, 'Datum muss in der Zukunft liegen'),
  duration: z.number().int().min(30).max(180),
  notes: z.string().max(500).optional(),
  walkerId: z.string().cuid().optional(),
});

export const updateBookingSchema = z.object({
  scheduledDate: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed > new Date();
  }).optional(),
  duration: z.number().int().min(30).max(180).optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

// Gruppentermine
export const createGroupWalkSchema = z.object({
  title: z.string().min(3, 'Titel erforderlich').max(100),
  description: z.string().max(500).optional(),
  meetingPoint: z.string().min(5, 'Treffpunkt erforderlich').max(200),
  meetingLat: z.number().min(-90).max(90),
  meetingLng: z.number().min(-180).max(180),
  scheduledDate: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed > new Date();
  }, 'Datum muss in der Zukunft liegen'),
  duration: z.number().int().min(30).max(180),
  maxParticipants: z.number().int().min(2).max(10),
  pricePerDog: z.number().min(0),
});

export const joinGroupWalkSchema = z.object({
  addressId: z.string().cuid('Ungültige Adress-ID'),
  dogIds: z.array(z.string().cuid()).min(1, 'Mindestens ein Hund erforderlich'),
});

// Walker-Profil
export const walkerProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  experience: z.number().int().min(0).max(50).optional(),
  maxDogs: z.number().int().min(1).max(10).optional(),
  hourlyRate: z.number().min(5).max(100),
  serviceRadius: z.number().int().min(1).max(50).optional(),
});

export const updateWalkerProfileSchema = walkerProfileSchema.partial().extend({
  isAvailable: z.boolean().optional(),
});

// Verfügbarkeit
export const availabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Ungültiges Zeitformat (HH:mm)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Ungültiges Zeitformat (HH:mm)'),
  isActive: z.boolean().default(true),
});

// Bewertungen
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// Pagination
export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ID-Parameter
export const idParamSchema = z.object({
  id: z.string().cuid('Ungültige ID'),
});
