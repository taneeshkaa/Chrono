import { Suspense } from 'react'
import ConnectionsClient from './connections-client'

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConnectionsClient />
    </Suspense>
  )
}

