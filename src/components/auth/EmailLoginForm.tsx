'use client'

import { useState } from 'react'
import { handleEmailSignIn, handleEmailSignUp } from '@/app/actions'

export default function EmailLoginForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [validation, setValidation] = useState<{ email?: string; password?: string }>({})

  function validateForm(formData: FormData): boolean {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const errors: { email?: string; password?: string } = {}

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!password || password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    setValidation(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(formData: FormData) {
    setError(null)

    if (!validateForm(formData)) return

    setLoading(true)
    try {
      if (isSignUp) {
        await handleEmailSignUp(formData)
      } else {
        await handleEmailSignIn(formData)
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please try again.'
      // Auth.js redirects on NEXT_REDIRECT errors — only show real errors
      if (message === 'NEXT_REDIRECT') return
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500">
            or continue with email
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Email/Password Form */}
      <form action={handleSubmit} className="space-y-3">
        {isSignUp && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              suppressHydrationWarning
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            suppressHydrationWarning
            className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
              validation.email
                ? 'border-red-400 dark:border-red-500'
                : 'border-slate-300 dark:border-slate-600'
            }`}
          />
          {validation.email && (
            <p className="mt-1 text-xs text-red-500">{validation.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            placeholder="••••••••"
            suppressHydrationWarning
            className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
              validation.password
                ? 'border-red-400 dark:border-red-500'
                : 'border-slate-300 dark:border-slate-600'
            }`}
          />
          {validation.password && (
            <p className="mt-1 text-xs text-red-500">{validation.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          suppressHydrationWarning
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg px-4 py-3 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : isSignUp ? (
            'Create Account'
          ) : (
            'Sign in with Email'
          )}
        </button>
      </form>

      {/* Toggle Sign Up / Sign In */}
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        {isSignUp ? (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false)
                setError(null)
                setValidation({})
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true)
                setError(null)
                setValidation({})
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Sign up
            </button>
          </>
        )}
      </p>
    </div>
  )
}
