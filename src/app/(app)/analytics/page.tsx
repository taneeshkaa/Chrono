import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import AnalyticsClient from './analytics-client'

export default async function AnalyticsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <Suspense fallback={
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-slate-300 dark:border-slate-800 border-r-transparent"></div>
          <p className="mt-4 text-slate-500 dark:text-slate-400 font-light">Loading analytics...</p>
        </div>
      </div>
    }>
      <AnalyticsClient />
    </Suspense>
  )
}
