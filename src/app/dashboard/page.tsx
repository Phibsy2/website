import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Redirect based on role
  switch (session.user.role) {
    case 'ADMIN':
      redirect('/admin')
    case 'WALKER':
      redirect('/walker')
    case 'CUSTOMER':
      redirect('/customer')
    default:
      redirect('/login')
  }
}
