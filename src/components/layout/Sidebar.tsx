'use client'

import { Home, Calendar, CheckSquare, Settings, Users, LogOut, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { handleSignOut } from '@/app/actions'
import { useState, useEffect } from 'react'

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: CheckSquare, label: 'Commitments', href: '/dashboard?tab=commitments' },
  { icon: Calendar, label: 'Calendar', href: '/dashboard?tab=calendar' },
  { icon: BarChart2, label: 'Analytics', href: '/analytics' },
  { icon: Users, label: 'Connections', href: '/connections' },
  { icon: Settings, label: 'Settings', href: '/dashboard?tab=settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams?.get('tab')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') {
      setIsCollapsed(true)
    }
  }, [])

  const toggleCollapse = () => {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem('sidebar-collapsed', String(nextState))
  }

  const getActiveItem = () => {
    if (pathname === '/connections') return 'Connections'
    if (pathname === '/analytics') return 'Analytics'
    if (tab === 'commitments') return 'Commitments'
    if (tab === 'calendar') return 'Calendar'
    if (tab === 'settings') return 'Settings'
    return 'Dashboard'
  }

  const activeItem = getActiveItem()

  return (
    <aside
      className={`border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Workspace Header */}
      <div className={`p-4 border-b border-slate-100 dark:border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Home className="h-5 w-5 text-white" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden whitespace-nowrap transition-opacity duration-300">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Personal Workspace</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">ChronoAI Dashboard</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeItem === item.label
            return (
              <li key={item.label}>
                <button
                  onClick={() => router.push(item.href)}
                  suppressHydrationWarning
                  title={isCollapsed && mounted ? item.label : undefined}
                  className={`w-full flex items-center rounded-lg transition-all ${
                    isCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-4 py-3'
                  } ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-500'}`} />
                  {!isCollapsed && <span className="font-medium text-sm overflow-hidden whitespace-nowrap">{item.label}</span>}
                  {isActive && !isCollapsed && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 flex-shrink-0"></div>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Collapse & Sign Out footer */}
      <div className="p-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
        {/* Toggle Collapse Button */}
        <button
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className={`w-full flex items-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${
            isCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-4 py-2.5'
          }`}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          {!isCollapsed && <span className="font-medium text-sm">Collapse Sidebar</span>}
        </button>

        {/* Sign Out */}
        <form action={handleSignOut}>
          <button
            type="submit"
            suppressHydrationWarning
            title={isCollapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all ${
              isCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-4 py-3'
            }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium text-sm overflow-hidden whitespace-nowrap">Sign Out</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}