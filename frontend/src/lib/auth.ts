import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from './api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'CUSTOMER' | 'WALKER' | 'ADMIN';
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: 'CUSTOMER' | 'WALKER';
  }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password });
          const { user, accessToken, refreshToken } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || 'Anmeldung fehlgeschlagen';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);
          const { user, accessToken, refreshToken } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || 'Registrierung fehlgeschlagen';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          // Logout trotzdem durchführen
        }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await authApi.me();
          set({
            user: response.data.data,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Hook für geschützte Routen
export const useRequireAuth = (allowedRoles?: string[]) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const hasAccess = isAuthenticated && user && (
    !allowedRoles || allowedRoles.includes(user.role)
  );

  return {
    user,
    isAuthenticated,
    isLoading,
    hasAccess,
  };
};
