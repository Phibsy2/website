'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      toast.success('Erfolgreich angemeldet!');

      // Redirect basierend auf Rolle
      const user = useAuthStore.getState().user;
      if (user?.role === 'ADMIN') {
        router.push('/admin');
      } else if (user?.role === 'WALKER') {
        router.push('/walker');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Anmeldung fehlgeschlagen');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link href="/" className="flex justify-center">
            <span className="text-4xl font-bold text-primary-600">DogWalk</span>
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Anmelden
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Oder{' '}
            <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500">
              erstellen Sie ein neues Konto
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                E-Mail-Adresse
              </label>
              <input
                {...register('email', {
                  required: 'E-Mail ist erforderlich',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Ungültige E-Mail-Adresse',
                  },
                })}
                type="email"
                autoComplete="email"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="E-Mail-Adresse"
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Passwort
              </label>
              <input
                {...register('password', {
                  required: 'Passwort ist erforderlich',
                })}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Passwort"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="text-gray-500 text-sm">
                  {showPassword ? 'Verbergen' : 'Anzeigen'}
                </span>
              </button>
            </div>
          </div>

          {(errors.email || errors.password) && (
            <div className="text-red-500 text-sm">
              {errors.email?.message || errors.password?.message}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Angemeldet bleiben
              </label>
            </div>

            <div className="text-sm">
              <Link href="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                Passwort vergessen?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Wird angemeldet...
                </span>
              ) : (
                'Anmelden'
              )}
            </button>
          </div>
        </form>

        {/* Test-Zugangsdaten (nur für Demo) */}
        <div className="mt-6 p-4 bg-gray-100 rounded-md">
          <p className="text-sm font-medium text-gray-700 mb-2">Demo-Zugangsdaten:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li><strong>Admin:</strong> admin@dogwalking.de / Admin123!</li>
            <li><strong>Walker:</strong> walker@dogwalking.de / Walker123!</li>
            <li><strong>Kunde:</strong> kunde@example.de / Kunde123!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
