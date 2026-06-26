'use client'

import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

type ConnectionStatus = {
  connected: boolean
  count: number
}

type UserInfo = {
  name?: string | null
  email?: string | null
  image?: string | null
}

export default function GlobalNav() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false, count: 0 })
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)


  useEffect(() => {
    setMounted(true)

    async function fetchStatus() {
      try {
        // Fetch connections to determine sync status
        const connectionsRes = await fetch('/api/connections/gmail/list')
        if (connectionsRes.ok) {
          const connections = await connectionsRes.json()
          const connectedAccounts = Array.isArray(connections)
            ? connections.filter((c: { connected: boolean }) => c.connected)
            : []
          setConnectionStatus({
            connected: connectedAccounts.length > 0,
            count: connectedAccounts.length,
          })
        }
      } catch {
        // Silently fail — user may not be logged in yet
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [])


  // Get user initials for the avatar
  const getInitials = () => {
    if (userInfo?.name) {
      return userInfo.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (userInfo?.email) {
      return userInfo.email[0].toUpperCase()
    }
    return '?'
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="flex items-center h-14 px-6">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
            ChronoAI
          </span>
        </div>

        {/* Spacer to push Right Section to the far right */}
        <div className="flex-1" />

        {/* Right Section - Sync Status & Avatar */}
        <div className="flex items-center space-x-4">
          {/* Sync Status */}
          {mounted ? (
            loading ? (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <Loader2 className="h-3.5 w-3.5 text-slate-400 animate-spin" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Checking...
                </span>
              </div>
            ) : connectionStatus.connected ? (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  {connectionStatus.count} Gmail connected
                </span>
              </div>
            ) : (
              <a
                href="/connections"
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              >
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Connect Gmail
                </span>
              </a>
            )
          ) : (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <Loader2 className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Checking...</span>
            </div>
          )}

          {/* User Avatar */}
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <span className="text-white text-sm font-medium">{getInitials()}</span>
          </div>
        </div>
      </div>
    </header>
  )
}