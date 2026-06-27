import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import RoadmapClient from './roadmap-client'

export default async function RoadmapPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return <RoadmapClient />
}
