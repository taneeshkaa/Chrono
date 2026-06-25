'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Mail, Calendar, ArrowLeft, RefreshCw, Trash2, Plus, CheckCircle2, AlertCircle } from 'lucide-react'

type Connection = {
  id: string
  email: string
  connected: boolean
  createdAt: string
}

export default function ConnectionsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const success = searchParams.get('success')
  const error = searchParams.get('error')

  const fetchConnections = async () => {
    try {
      const res = await fetch('/api/connections/gmail/list')
      if (res.ok) {
        const data = await res.json()
        setConnections(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (connectionId: string) => {
    const confirmed = window.confirm('Disconnect this Gmail account? You will need to reconnect to sync emails.')
    if (!confirmed) return

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

  const handleSyncEmails = async () => {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res = await fetch('/api/sync/gmail', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSyncMessage(`✓ Synced! Found ${data.commitmentsFound ?? 0} new commitments.`)
      } else {
        setSyncMessage(`✗ ${data.error ?? 'Sync failed'}`)
      }
    } catch {
      setSyncMessage('✗ Failed to sync emails')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  const connectedAccounts = connections.filter(c => c.connected)

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Connections
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Connect your accounts to discover commitments from emails and calendar events
            </p>
          </div>
        </div>

        {/* Success/Error banners */}
        {success && (
          <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-800 dark:text-emerald-200">
              {success === 'gmail_connected' ? 'Gmail account connected successfully!' : success}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-red-800 dark:text-red-200">
              {error === 'no_code' ? 'OAuth authorization failed. Please try again.' :
               error === 'token_failed' ? 'Failed to exchange tokens. Please try again.' :
               error === 'profile_failed' ? 'Failed to fetch Google profile. Please try again.' :
               `Connection error: ${error}`}
            </p>
          </div>
        )}

        {/* Sync message */}
        {syncMessage && (
          <div className={`mb-4 p-4 rounded-lg ${
            syncMessage.startsWith('✓')
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}>
            <p>{syncMessage}</p>
          </div>
        )}

        {/* Gmail Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <Mail className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Gmail Accounts
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Connect Gmail to discover commitments from your emails
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connectedAccounts.length > 0 && (
                <button
                  onClick={handleSyncEmails}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {syncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
              <button
                onClick={handleConnectGmail}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Connect Gmail
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <Mail className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 mb-1">No Gmail accounts connected yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Click &quot;Connect Gmail&quot; to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${conn.connected ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {conn.email}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Connected since {new Date(conn.createdAt).toLocaleDateString()}
                        {!conn.connected && ' • Disconnected — reconnect to sync'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnect(conn.id)}
                    className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg text-sm transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calendar Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Google Calendar
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Calendar access is included with your Gmail connection
              </p>
            </div>
          </div>

          {connectedAccounts.length > 0 ? (
            <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Calendar sync is active via your connected Gmail account(s). Events appear automatically on your dashboard.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Connect a Gmail account above to also enable Google Calendar sync.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
