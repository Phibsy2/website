'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth';

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'CUSTOMER' | 'WALKER';
  acceptTerms: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role') === 'WALKER' ? 'WALKER' : 'CUSTOMER';

  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: {
      role: defaultRole as 'CUSTOMER' | 'WALKER',
    },
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    if (!data.acceptTerms) {
      toast.error('Bitte akzeptieren Sie die AGB');
      return;
    }

    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
      });

      toast.success('Erfolgreich registriert!');

      if (data.role === 'WALKER') {
        router.push('/walker/setup');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Registrierung fehlgeschlagen');
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
            Konto erstellen
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Oder{' '}
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
              melden Sie sich an
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {/* Rolle auswählen */}
          <div className="flex space-x-4">
            <label className="flex-1">
              <input
                {...register('role')}
                type="radio"
                value="CUSTOMER"
                className="sr-only peer"
              />
              <div className="p-4 border-2 rounded-lg cursor-pointer peer-checked:border-primary-500 peer-checked:bg-primary-50 hover:border-gray-400">
                <div className="text-center">
                  <span className="text-2xl">🐕</span>
                  <p className="font-medium">Hundebesitzer</p>
                  <p className="text-sm text-gray-500">Ich suche einen Walker</p>
                </div>
              </div>
            </label>
            <label className="flex-1">
              <input
                {...register('role')}
                type="radio"
                value="WALKER"
                className="sr-only peer"
              />
              <div className="p-4 border-2 rounded-lg cursor-pointer peer-checked:border-primary-500 peer-checked:bg-primary-50 hover:border-gray-400">
                <div className="text-center">
                  <span className="text-2xl">🚶</span>
                  <p className="font-medium">Dog Walker</p>
                  <p className="text-sm text-gray-500">Ich biete Services an</p>
                </div>
              </div>
            </label>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="label">Vorname</label>
                <input
                  {...register('firstName', {
                    required: 'Vorname ist erforderlich',
                    minLength: { value: 2, message: 'Mindestens 2 Zeichen' },
                  })}
                  type="text"
                  className="input"
                  placeholder="Max"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="label">Nachname</label>
                <input
                  {...register('lastName', {
                    required: 'Nachname ist erforderlich',
                    minLength: { value: 2, message: 'Mindestens 2 Zeichen' },
                  })}
                  type="text"
                  className="input"
                  placeholder="Mustermann"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="label">E-Mail-Adresse</label>
              <input
                {...register('email', {
                  required: 'E-Mail ist erforderlich',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Ungültige E-Mail-Adresse',
                  },
                })}
                type="email"
                className="input"
                placeholder="max@example.de"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="label">Telefon (optional)</label>
              <input
                {...register('phone', {
                  pattern: {
                    value: /^\+?[\d\s-]{10,}$/,
                    message: 'Ungültige Telefonnummer',
                  },
                })}
                type="tel"
                className="input"
                placeholder="+49 171 1234567"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">Passwort</label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Passwort ist erforderlich',
                    minLength: { value: 8, message: 'Mindestens 8 Zeichen' },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Muss Groß-, Kleinbuchstaben und Zahl enthalten',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-20"
                  placeholder="••••••••"
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
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">Passwort bestätigen</label>
              <input
                {...register('confirmPassword', {
                  required: 'Bitte Passwort bestätigen',
                  validate: (value) => value === password || 'Passwörter stimmen nicht überein',
                })}
                type="password"
                className="input"
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                {...register('acceptTerms', { required: true })}
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="acceptTerms" className="ml-2 block text-sm text-gray-900">
                Ich akzeptiere die{' '}
                <Link href="/terms" className="text-primary-600 hover:text-primary-500">
                  AGB
                </Link>{' '}
                und{' '}
                <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
                  Datenschutzerklärung
                </Link>
              </label>
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
                  Wird registriert...
                </span>
              ) : (
                'Registrieren'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
