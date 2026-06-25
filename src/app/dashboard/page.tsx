import { auth, signOut } from '@/auth'
import Image from 'next/image'
import { DashboardCommitments } from './dashboard-commitments'

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Chrono</h1>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <button
              type="submit"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Welcome {session?.user?.name}!
              </h2>
              <p className="text-gray-600 mt-2">
                {session?.user?.email}
              </p>
              {session?.user?.image && (
                <Image
                  src={session.user.image}
                  alt="Profile"
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full mt-4"
                />
              )}
            </div>
          </div>

          <DashboardCommitments />
        </div>
      </div>
    </div>
  )
}
