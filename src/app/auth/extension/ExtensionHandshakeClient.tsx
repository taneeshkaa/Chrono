'use client'

import { useEffect, useState } from 'react'

export default function ExtensionHandshakeClient({ email }: { email: string }) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function fetchTokenAndHandshake() {
      try {
        const res = await fetch('/api/auth/extension-token', {
          method: 'POST',
        })

        if (!res.ok) {
          throw new Error('Failed to generate extension token')
        }

        const data = await res.json()
        const token = data.token

        // Send token to the extension via postMessage
        // In development, apiBase is localhost:3000. In production, it can be read from configuration or relative
        const apiBase = window.location.origin

        window.postMessage(
          {
            type: 'CHRONO_AUTH_SUCCESS',
            token: token,
            email: email,
            apiBase: apiBase,
          },
          '*',
        )

        setStatus('success')
      } catch (err) {
        console.error('Handshake error:', err)
        setErrorMessage(err instanceof Error ? err.message : 'Unknown error')
        setStatus('error')
      }
    }

    fetchTokenAndHandshake()
  }, [email])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700 text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-600 dark:text-slate-300 font-medium">Connecting extension...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center text-4xl shadow-inner animate-bounce">
              ✅
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              ChronoAI Extension Connected
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Logged in as <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span>
            </p>
            <p className="text-slate-600 dark:text-slate-300 mt-4 max-w-xs">
              Your extension has been connected successfully. You can close this tab now.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 bg-red-500/10 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center text-4xl">
              ❌
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              Handshake Failed
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2 max-w-xs">
              {errorMessage || 'Could not connect the extension to your account.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
