'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Connection = {
  id: string
  email: string
  connected: boolean
  createdAt: string
}

export default function ConnectionsClient() {
  const searchParams = useSearchParams()
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)

  const success = searchParams.get('success')
  const error = searchParams.get('error')

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/connections/gmail/list')
      if (res.ok) {
        const data = await res.json()
        setConnections(data)
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (connectionId: string) => {
    try {
      const res = await fetch('/api/connections/gmail/disconnect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })

      if (res.ok) {
        fetchConnections()
      }
    } catch (err) {
      console.error('Failed to disconnect:', err)
    }
  }

  const handleConnectGmail = () => {
    window.location.href = '/api/connections/gmail/connect'
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConnections()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Connections
          </h1>
        </div>

        {success && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg">
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Gmail Accounts
            </h2>
            <button
              onClick={handleConnectGmail}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Connect Gmail
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          ) : connections.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No Gmail accounts connected yet.</p>
          ) : (
            <div className="space-y-4">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {conn.email}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Connected since {new Date(conn.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDisconnect(conn.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
