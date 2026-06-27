import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/dashboard/DashboardClient'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true }
  })

  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardClient
        user={{
          id: session.user.id,
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          image: session.user.image ?? null,
          timezone: dbUser?.timezone ?? 'Asia/Kolkata',
        }}
      />
    </Suspense>
  )
}
