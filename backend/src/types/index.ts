import { Request } from 'express';
import { User, UserRole } from '@prisma/client';

// Erweiterte Request-Typen mit Authentifizierung
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

// JWT Token Payload
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// API-Antwort-Typen
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ApiError[];
  pagination?: PaginationInfo;
}

export interface ApiError {
  field?: string;
  message: string;
  code?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Pagination Query Params
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Buchungs-DTOs
export interface CreateBookingDto {
  addressId: string;
  dogIds: string[];
  scheduledDate: string;
  duration: number;
  notes?: string;
  walkerId?: string;
}

export interface UpdateBookingDto {
  scheduledDate?: string;
  duration?: number;
  notes?: string;
  status?: string;
}

// Gruppentermin-DTOs
export interface CreateGroupWalkDto {
  title: string;
  description?: string;
  meetingPoint: string;
  meetingLat: number;
  meetingLng: number;
  scheduledDate: string;
  duration: number;
  maxParticipants: number;
  pricePerDog: number;
}

export interface JoinGroupWalkDto {
  addressId: string;
  dogIds: string[];
}

// Benutzer-DTOs
export interface RegisterUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

// Walker-DTOs
export interface CreateWalkerProfileDto {
  bio?: string;
  experience?: number;
  maxDogs?: number;
  hourlyRate: number;
  serviceRadius?: number;
}

export interface UpdateWalkerProfileDto {
  bio?: string;
  experience?: number;
  maxDogs?: number;
  hourlyRate?: number;
  serviceRadius?: number;
  isAvailable?: boolean;
}

// Adress-DTOs
export interface CreateAddressDto {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  label?: string;
  notes?: string;
}

// Hunde-DTOs
export interface CreateDogDto {
  name: string;
  breed: string;
  age: number;
  weight: number;
  size: 'klein' | 'mittel' | 'groß';
  temperament?: string;
  specialNeeds?: string;
  isVaccinated?: boolean;
  isNeutered?: boolean;
  notes?: string;
}

// Bewertungs-DTOs
export interface CreateReviewDto {
  rating: number;
  comment?: string;
}

// Koordinaten für Geo-Berechnungen
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Terminzusammenlegungs-Typen
export interface BookingSlot {
  bookingId: string;
  customerId: string;
  address: Coordinates & { id: string };
  scheduledDate: Date;
  duration: number;
  dogs: string[];
}

export interface GroupSuggestion {
  slots: BookingSlot[];
  commonMeetingPoint: Coordinates;
  totalDistance: number;
  timeWindow: { start: Date; end: Date };
  estimatedSavings: number;
}

// Dashboard-Statistiken
export interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalRevenue: number;
  averageRating: number;
  activeWalkers: number;
  totalCustomers: number;
}

// Walker-Statistiken
export interface WalkerStats {
  totalWalks: number;
  upcomingWalks: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
}
