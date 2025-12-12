import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Axios-Instanz erstellen
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor für Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor für Token Refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Token abgelaufen - versuche Refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh fehlgeschlagen - Logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API Response Type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{ field?: string; message: string; code?: string }>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth API
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: 'CUSTOMER' | 'WALKER';
  }) => api.post<ApiResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse>('/auth/login', data),

  logout: () => api.post<ApiResponse>('/auth/logout'),

  me: () => api.get<ApiResponse>('/auth/me'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post<ApiResponse>('/auth/change-password', data),
};

// User API
export const userApi = {
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) =>
    api.patch<ApiResponse>('/users/profile', data),

  getAddresses: () => api.get<ApiResponse>('/users/addresses'),

  addAddress: (data: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
    label?: string;
    notes?: string;
  }) => api.post<ApiResponse>('/users/addresses', data),

  updateAddress: (id: string, data: any) =>
    api.patch<ApiResponse>(`/users/addresses/${id}`, data),

  deleteAddress: (id: string) => api.delete<ApiResponse>(`/users/addresses/${id}`),

  getDogs: () => api.get<ApiResponse>('/users/dogs'),

  addDog: (data: {
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
  }) => api.post<ApiResponse>('/users/dogs', data),

  updateDog: (id: string, data: any) => api.patch<ApiResponse>(`/users/dogs/${id}`, data),

  deleteDog: (id: string) => api.delete<ApiResponse>(`/users/dogs/${id}`),

  getNotifications: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get<ApiResponse>('/users/notifications', { params }),

  markNotificationRead: (id: string) =>
    api.post<ApiResponse>(`/users/notifications/${id}/read`),

  markAllNotificationsRead: () => api.post<ApiResponse>('/users/notifications/read-all'),
};

// Booking API
export const bookingApi = {
  getMyBookings: (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get<ApiResponse>('/bookings/my', { params }),

  getBooking: (id: string) => api.get<ApiResponse>(`/bookings/${id}`),

  createBooking: (data: {
    addressId: string;
    dogIds: string[];
    scheduledDate: string;
    duration: number;
    notes?: string;
    walkerId?: string;
  }) => api.post<ApiResponse>('/bookings', data),

  updateBooking: (id: string, data: any) =>
    api.patch<ApiResponse>(`/bookings/${id}`, data),

  cancelBooking: (id: string, reason?: string) =>
    api.post<ApiResponse>(`/bookings/${id}/cancel`, { reason }),

  getWalkerBookings: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => api.get<ApiResponse>('/bookings/walker', { params }),

  getGroupingSuggestions: () => api.get<ApiResponse>('/bookings/suggestions/grouping'),
};

// Walker API
export const walkerApi = {
  getWalkers: (params?: {
    page?: number;
    limit?: number;
    available?: boolean;
    minRating?: number;
    maxRate?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
  }) => api.get<ApiResponse>('/walkers', { params }),

  getWalker: (id: string) => api.get<ApiResponse>(`/walkers/${id}`),

  getMyProfile: () => api.get<ApiResponse>('/walkers/profile/me'),

  createProfile: (data: {
    bio?: string;
    experience?: number;
    maxDogs?: number;
    hourlyRate: number;
    serviceRadius?: number;
  }) => api.post<ApiResponse>('/walkers/profile', data),

  updateProfile: (data: any) => api.patch<ApiResponse>('/walkers/profile', data),

  getStats: () => api.get<ApiResponse>('/walkers/stats/me'),

  addServiceArea: (data: {
    postalCode: string;
    city: string;
    latitude: number;
    longitude: number;
  }) => api.post<ApiResponse>('/walkers/service-areas', data),

  removeServiceArea: (postalCode: string) =>
    api.delete<ApiResponse>(`/walkers/service-areas/${postalCode}`),

  setAvailability: (data: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive?: boolean;
  }) => api.post<ApiResponse>('/walkers/availability', data),

  removeAvailability: (id: string) =>
    api.delete<ApiResponse>(`/walkers/availability/${id}`),

  addReview: (bookingId: string, data: { rating: number; comment?: string }) =>
    api.post<ApiResponse>(`/walkers/reviews/${bookingId}`, data),
};

// Group Walk API
export const groupWalkApi = {
  getGroupWalks: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
  }) => api.get<ApiResponse>('/group-walks', { params }),

  getGroupWalk: (id: string) => api.get<ApiResponse>(`/group-walks/${id}`),

  createGroupWalk: (data: {
    title: string;
    description?: string;
    meetingPoint: string;
    meetingLat: number;
    meetingLng: number;
    scheduledDate: string;
    duration: number;
    maxParticipants: number;
    pricePerDog: number;
  }) => api.post<ApiResponse>('/group-walks', data),

  joinGroupWalk: (id: string, data: { addressId: string; dogIds: string[] }) =>
    api.post<ApiResponse>(`/group-walks/${id}/join`, data),

  leaveGroupWalk: (id: string) => api.post<ApiResponse>(`/group-walks/${id}/leave`),

  startGroupWalk: (id: string) => api.post<ApiResponse>(`/group-walks/${id}/start`),

  completeGroupWalk: (id: string) => api.post<ApiResponse>(`/group-walks/${id}/complete`),

  cancelGroupWalk: (id: string) => api.post<ApiResponse>(`/group-walks/${id}/cancel`),
};

// Admin API
export const adminApi = {
  getDashboard: () => api.get<ApiResponse>('/admin/dashboard'),

  getUsers: (params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    isActive?: boolean;
  }) => api.get<ApiResponse>('/admin/users', { params }),

  toggleUserStatus: (id: string) => api.post<ApiResponse>(`/admin/users/${id}/toggle-status`),

  getAllBookings: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    walkerId?: string;
    customerId?: string;
    from?: string;
    to?: string;
  }) => api.get<ApiResponse>('/admin/bookings', { params }),

  assignBookingToWalker: (bookingId: string, walkerId: string) =>
    api.post<ApiResponse>(`/admin/bookings/${bookingId}/assign`, { walkerId }),

  getAllWalkers: (params?: { page?: number; limit?: number; isAvailable?: boolean }) =>
    api.get<ApiResponse>('/admin/walkers', { params }),

  getAllGroupWalks: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<ApiResponse>('/admin/group-walks', { params }),

  getRevenueReport: (params?: { from?: string; to?: string; groupBy?: string }) =>
    api.get<ApiResponse>('/admin/reports/revenue', { params }),

  getConfig: () => api.get<ApiResponse>('/admin/config'),

  updateConfig: (key: string, value: string, description?: string) =>
    api.put<ApiResponse>('/admin/config', { key, value, description }),
};

export default api;
