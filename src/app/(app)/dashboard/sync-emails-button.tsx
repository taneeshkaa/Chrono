'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type SyncState = {
  status: 'idle' | 'syncing' | 'success' | 'error'
  commitmentsFound: number | null
  message: string | null
}

export function SyncEmailsButton() {
  const router = useRouter()
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    commitmentsFound: null,
    message: null,
  })

  const syncEmails = async () => {
    setSyncState({
      status: 'syncing',
      commitmentsFound: null,
      message: null,
    })

    try {
      const response = await fetch('/api/sync/gmail', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Email sync failed')
      }

      setSyncState({
        status: 'success',
        commitmentsFound: data.commitmentsFound ?? 0,
        message: null,
      })
      router.refresh()
    } catch (error) {
      setSyncState({
        status: 'error',
        commitmentsFound: null,
        message: error instanceof Error ? error.message : 'Email sync failed',
      })
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={syncEmails}
        disabled={syncState.status === 'syncing'}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
      >
        {syncState.status === 'syncing' ? 'Syncing...' : 'Sync Emails'}
      </button>

      {syncState.status === 'success' && (
        <p className="text-sm text-green-700">
          {syncState.commitmentsFound} commitments found
        </p>
      )}

      {syncState.status === 'error' && (
        <p className="text-sm text-red-700">{syncState.message}</p>
      )}
    </div>
  )
}
