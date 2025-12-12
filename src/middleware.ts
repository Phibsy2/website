import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Admin routes
    if (pathname.startsWith('/admin')) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // Walker routes
    if (pathname.startsWith('/walker')) {
      if (token?.role !== 'WALKER') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // Customer routes
    if (pathname.startsWith('/customer')) {
      if (token?.role !== 'CUSTOMER') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Public routes
        if (
          pathname === '/' ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/register') ||
          pathname.startsWith('/api/auth')
        ) {
          return true
        }

        // All other routes require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/walker/:path*',
    '/customer/:path*',
    '/api/customer/:path*',
    '/api/admin/:path*',
    '/api/walker/:path*',
    '/api/bookings/:path*',
  ],
}
