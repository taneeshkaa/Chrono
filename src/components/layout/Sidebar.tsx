'use client'

import { Home, Calendar, CheckSquare, Settings, BarChart, Users } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  { icon: Home, label: 'Workspace', href: '/dashboard' },
  { icon: CheckSquare, label: 'Commitments', href: '/dashboard?tab=commitments' },
  { icon: Calendar, label: 'Calendar', href: '/dashboard?tab=calendar' },
  { icon: BarChart, label: 'Insights', href: '/analytics' },
  { icon: Users, label: 'Connections', href: '/connections' },
  { icon: Settings, label: 'Settings', href: '/dashboard?tab=settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams?.get('tab') || ''

  return (
    <aside className="w-64 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
      {/* Workspace Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Home className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Personal Workspace</h3>
            <p className="text-xs text-slate-550 dark:text-slate-400">Last synced 2 min ago</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            
            let isActive = false
            if (item.href.includes('?')) {
              const [path, query] = item.href.split('?')
              const tabName = query.split('=')[1]
              isActive = pathname === path && currentTab === tabName
            } else {
              isActive = pathname === item.href && (!currentTab || item.href !== '/dashboard')
            }

            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800'
                      : 'text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-500'}`} />
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Recent Activity */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Recent Activity
        </h4>
        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5"></div>
            <div className="flex-1">
              <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                "Meeting with design team" extracted from Gmail
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500">2 min ago</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5"></div>
            <div className="flex-1">
              <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                "Q2 Planning" added to calendar
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500">15 min ago</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
