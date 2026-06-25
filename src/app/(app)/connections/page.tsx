import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import ConnectionsClient from './connections-client'

export default async function ConnectionsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Loading connections...</div>}>
      <ConnectionsClient />
    </Suspense>
  )
}
