import Link from 'next/link'

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration. Please contact support.',
  AccessDenied: 'Access denied. You do not have permission to sign in.',
  Verification: 'The verification link has expired or has already been used.',
  OAuthSignin: 'Could not start the Google sign-in flow. Please try again.',
  OAuthCallback: 'Could not complete the Google sign-in flow. Please try again.',
  OAuthCreateAccount: 'Could not create your account via Google. Please try again.',
  EmailCreateAccount: 'Could not create your account with email. Please try again.',
  Callback: 'There was an error during authentication. Please try again.',
  OAuthAccountNotLinked:
    'This email is already associated with another sign-in method. Please use your original sign-in method.',
  CredentialsSignin: 'Invalid email or password. Please check your credentials and try again.',
  SessionRequired: 'You must be signed in to access this page.',
  Default: 'An unexpected authentication error occurred. Please try again.',
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorKey = error || 'Default'
  const message = errorMessages[errorKey] || errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        {/* Error Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
            <span className="text-white font-bold text-xl">!</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-white">
          Authentication Error
        </h1>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400 mb-6">
          {message}
        </p>

        {error && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mb-6">
            Error code: <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{error}</code>
          </p>
        )}

        <div className="space-y-3">
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg px-4 py-3 hover:from-blue-600 hover:to-purple-700 transition-all font-medium"
          >
            Try Again
          </Link>

          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
