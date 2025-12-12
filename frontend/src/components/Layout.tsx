'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  MapPinIcon,
  CogIcon,
  UserIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore, User } from '@/lib/auth';
import clsx from 'clsx';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const customerNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Meine Buchungen', href: '/dashboard/bookings', icon: CalendarDaysIcon },
  { name: 'Gruppentermine', href: '/dashboard/group-walks', icon: UserGroupIcon },
  { name: 'Meine Hunde', href: '/dashboard/dogs', icon: UserIcon },
  { name: 'Adressen', href: '/dashboard/addresses', icon: MapPinIcon },
  { name: 'Einstellungen', href: '/dashboard/settings', icon: CogIcon },
];

const walkerNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/walker', icon: HomeIcon },
  { name: 'Meine Termine', href: '/walker/bookings', icon: CalendarDaysIcon },
  { name: 'Gruppentermine', href: '/walker/group-walks', icon: UserGroupIcon },
  { name: 'Service-Gebiete', href: '/walker/service-areas', icon: MapPinIcon },
  { name: 'Verfügbarkeit', href: '/walker/availability', icon: ClipboardDocumentListIcon },
  { name: 'Einstellungen', href: '/walker/settings', icon: CogIcon },
];

const adminNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Benutzer', href: '/admin/users', icon: UsersIcon },
  { name: 'Buchungen', href: '/admin/bookings', icon: CalendarDaysIcon },
  { name: 'Walker', href: '/admin/walkers', icon: UserGroupIcon },
  { name: 'Gruppentermine', href: '/admin/group-walks', icon: ClipboardDocumentListIcon },
  { name: 'Berichte', href: '/admin/reports', icon: ChartBarIcon },
  { name: 'Einstellungen', href: '/admin/settings', icon: CogIcon },
];

function getNavigation(user: User | null): NavigationItem[] {
  if (!user) return customerNavigation;

  switch (user.role) {
    case 'ADMIN':
      return adminNavigation;
    case 'WALKER':
      return walkerNavigation;
    default:
      return customerNavigation;
  }
}

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const navigation = getNavigation(user);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-primary-600 px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <span className="text-2xl font-bold text-white">DogWalk</span>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {navigation.map((item) => (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={clsx(
                                  pathname === item.href
                                    ? 'bg-primary-700 text-white'
                                    : 'text-primary-200 hover:text-white hover:bg-primary-700',
                                  'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                )}
                              >
                                <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-primary-600 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Link href="/" className="text-2xl font-bold text-white">
              DogWalk
            </Link>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={clsx(
                          pathname === item.href
                            ? 'bg-primary-700 text-white'
                            : 'text-primary-200 hover:text-white hover:bg-primary-700',
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                        )}
                      >
                        <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <button
                  onClick={handleLogout}
                  className="group -mx-2 flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-primary-200 hover:bg-primary-700 hover:text-white"
                >
                  <ArrowRightOnRectangleIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                  Abmelden
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Sidebar öffnen</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Notifications */}
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Benachrichtigungen</span>
                <BellIcon className="h-6 w-6" aria-hidden="true" />
              </button>

              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />

              {/* Profile */}
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                <span className="hidden lg:flex lg:items-center">
                  <span className="text-sm font-semibold leading-6 text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="ml-2 badge badge-info">
                    {user?.role === 'ADMIN' ? 'Admin' : user?.role === 'WALKER' ? 'Walker' : 'Kunde'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
