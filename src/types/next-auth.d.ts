import { UserRole } from '@prisma/client'
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      image?: string
      customerId?: string
      walkerId?: string
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    image?: string
    customerId?: string
    walkerId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    customerId?: string
    walkerId?: string
  }
}
