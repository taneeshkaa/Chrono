'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { RefreshCw, Mail, Calendar, AlertTriangle, Plus, X, BarChart2, Bell, CheckCircle2, Trash2, CheckCircle, Settings as SettingsIcon, BrainCircuit, ShieldAlert, Sparkles, Clock, Target, CalendarDays, ChevronRight } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import TodaysFocus from './TodaysFocus'
import CommitmentsLedger from './CommitmentsLedger'
import CalendarView from './CalendarView'
import NotificationTray from './NotificationTray'
import FutureOutlook from './FutureOutlook'
import type { SimulationResult } from '@/types/simulation'

type UserInfo = {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

type Commitment = {
  id: string
  title: string
  description?: string
  category: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: string
  deadline?: string
  riskScore: number
  estimatedEffort?: number
  createdAt: string
}

type CalendarEvent = {
  title: string
  date: string
  time: string
}

type Notification = {
  id: string
  title: string
  message: string
  type: 'reminder' | 'warning' | 'success' | 'info' | 'alert'
  timestamp: string
  isRead: boolean
  commitmentId?: string
}

type Insight = {
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
}

type SyncState = {
  status: 'idle' | 'syncing' | 'success' | 'error'
  message: string | null
}

type Props = {
  user: UserInfo
}

export default function DashboardClient({ user }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams?.get('tab') || 'dashboard'

  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [clientNotifications, setClientNotifications] = useState<Notification[]>([])
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<Set<string>>(new Set())
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set())

  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [hasGmailConnection, setHasGmailConnection] = useState(false)
  const [emailSyncState, setEmailSyncState] = useState<SyncState>({ status: 'idle', message: null })
  const [calendarSyncState, setCalendarSyncState] = useState<SyncState>({ status: 'idle', message: null })

  // Simulation Engine states
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(null)
  const [simulationLoading, setSimulationLoading] = useState(true)
  const [simulationError, setSimulationError] = useState(false)

  // New commitment modal states
  const [isNewCommitmentOpen, setIsNewCommitmentOpen] = useState(false)
  const [isAIInsightsOpen, setIsAIInsightsOpen] = useState(false)
  const [newCommitmentForm, setNewCommitmentForm] = useState({
    title: '',
    description: '',
    category: 'PERSONAL',
    priority: 'MEDIUM',
    deadline: '',
    estimatedEffort: ''
  })

  // Settings mock state forSettings panel
  const [settingsForm, setSettingsForm] = useState({
    timezone: 'Asia/Kolkata',
    syncFrequency: '60',
    notifyLeadTime: '24'
  })
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<string | null>(null)

  const fetchSimulation = useCallback(async () => {
    setSimulationLoading(true)
    setSimulationError(false)
    try {
      const res = await fetch('/api/simulation')
      if (!res.ok) {
        throw new Error('Simulation endpoint returned non-OK status')
      }
      const data = await res.json()
      setSimulationData(data)
    } catch (error) {
      console.error('Failed to fetch simulation data:', error)
      setSimulationError(true)
    } finally {
      setSimulationLoading(false)
    }
  }, [])

  const fetchData = useCallback(async () => {
    // Fire simulation fetch in background to avoid blocking other requests
    fetchSimulation()

    try {
      const [commitmentsRes, eventsRes, notificationsRes, insightsRes, connectionsRes] = await Promise.all([
        fetch('/api/commitments'),
        fetch('/api/calendar/events'),
        fetch('/api/notifications'),
        fetch('/api/insights'),
        fetch('/api/connections/gmail/list'),
      ])

      const [commitmentsData, eventsData, notificationsData, insightsData, connectionsData] = await Promise.all([
        commitmentsRes.ok ? commitmentsRes.json() : [],
        eventsRes.ok ? eventsRes.json() : [],
        notificationsRes.ok ? notificationsRes.json() : [],
        insightsRes.ok ? insightsRes.json() : [],
        connectionsRes.ok ? connectionsRes.json() : [],
      ])

      setCommitments(Array.isArray(commitmentsData) ? commitmentsData : [])
      setCalendarEvents(Array.isArray(eventsData) ? eventsData : [])
      setNotifications(Array.isArray(notificationsData) ? notificationsData : [])
      setInsights(Array.isArray(insightsData) ? insightsData : [])

      const connectedAccounts = Array.isArray(connectionsData)
        ? connectionsData.filter((c: { connected: boolean }) => c.connected)
        : []
      setHasGmailConnection(connectedAccounts.length > 0)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchSimulation])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Sync client-side notification mapping whenever raw notifications or interaction histories change
  useEffect(() => {
    const mapped = notifications.map((notif: any) => {
      const commitmentId = notif.id.split('-')[0]
      let displayType: 'reminder' | 'warning' | 'success' | 'info' | 'alert' = 'info'
      if (notif.type === 'DEADLINE') displayType = 'warning'
      if (notif.type === 'RISK') displayType = 'alert'
      if (notif.type === 'MISSED') displayType = 'alert'

      return {
        id: notif.id,
        title: notif.title,
        message: notif.description || notif.message || '',
        type: displayType,
        timestamp: new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: readNotificationIds.has(notif.id),
        commitmentId
      }
    })

    const filtered = mapped.filter((n: any) => !dismissedNotificationIds.has(n.id))
    setClientNotifications(filtered)
  }, [notifications, dismissedNotificationIds, readNotificationIds])

  // Notification action callbacks
  const dismissNotification = (id: string) => {
    setDismissedNotificationIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  const markAllNotificationsRead = () => {
    setReadNotificationIds(prev => {
      const next = new Set(prev)
      clientNotifications.forEach(n => next.add(n.id))
      return next
    })
  }

  const clearAllNotifications = () => {
    setDismissedNotificationIds(prev => {
      const next = new Set(prev)
      clientNotifications.forEach(n => next.add(n.id))
      return next
    })
  }

  // Create new commitment form submission
  const handleCreateCommitment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCommitmentForm,
          estimatedEffort: newCommitmentForm.estimatedEffort ? parseInt(newCommitmentForm.estimatedEffort) : null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create commitment')
      }

      setIsNewCommitmentOpen(false)
      setNewCommitmentForm({
        title: '',
        description: '',
        category: 'PERSONAL',
        priority: 'MEDIUM',
        deadline: '',
        estimatedEffort: ''
      })
      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Error creating commitment')
    }
  }

  // Sync Emails
  const syncEmails = async () => {
    setEmailSyncState({ status: 'syncing', message: null })
    try {
      const response = await fetch('/api/sync/gmail', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Email sync failed')
      }

      setEmailSyncState({
        status: 'success',
        message: `Found ${data.commitmentsFound ?? 0} new commitments`,
      })

      await fetchData()
    } catch (error) {
      setEmailSyncState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Email sync failed',
      })
    }
  }

  // Sync Calendar
  const syncCalendar = async () => {
    setCalendarSyncState({ status: 'syncing', message: null })
    try {
      const response = await fetch('/api/calendar/sync', { method: 'POST' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'Calendar sync failed')
      }

      setCalendarSyncState({
        status: 'success',
        message: `${data.eventsCreated ?? 0} created, ${data.eventsUpdated ?? 0} updated`,
      })

      await fetchData()
    } catch (error) {
      setCalendarSyncState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Calendar sync failed',
      })
    }
  }

  // Save Settings configuration
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsSaveStatus('Saving settings...')
    setTimeout(() => {
      setSettingsSaveStatus('Settings saved successfully!')
      setTimeout(() => setSettingsSaveStatus(null), 3000)
    }, 800)
  }

  // Get today's focus - highest priority active commitment
  const todayFocus = commitments
    .filter(c => c.status === 'ACTIVE' || c.status === 'AT_RISK')
    .sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.riskScore - a.riskScore
    })[0]

  // Calculate AI stats
  const activeCount = commitments.filter(c => c.status === 'ACTIVE' || c.status === 'AT_RISK').length
  const completedCount = commitments.filter(c => c.status === 'COMPLETED').length
  const missedCount = commitments.filter(c => c.status === 'MISSED').length
  const criticalCount = commitments.filter(c => c.riskScore >= 75 && c.status !== 'COMPLETED' && c.status !== 'ARCHIVED').length

  // Transform calendar events & commitments with deadlines for the CalendarView component
  const googleEvents = calendarEvents.map((event, index) => {
    const eventDate = new Date(event.date)
    const hour = eventDate.getHours()
    const minute = eventDate.getMinutes()
    
    return {
      id: `event-${index}`,
      title: event.title,
      time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      date: event.date,
      duration: 60,
      type: 'meeting' as const,
      participants: [],
    }
  })

  const commitmentEvents = commitments
    .filter(c => c.deadline && c.status !== 'COMPLETED' && c.status !== 'ARCHIVED')
    .map(c => {
      const date = new Date(c.deadline!)
      const hour = date.getHours()
      const minute = date.getMinutes()

      return {
        id: `commitment-${c.id}`,
        title: `[ChronoAI] ${c.title}`,
        time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        date: c.deadline!,
        duration: c.estimatedEffort || 45,
        type: 'focus' as const,
        commitmentId: c.id
      }
    })

  const unifiedEvents = [...googleEvents, ...commitmentEvents]

  // Filtered insights categories
  const highestRiskCommitments = commitments
    .filter(c => c.riskScore >= 70 && c.status !== 'COMPLETED' && c.status !== 'ARCHIVED')
    .slice(0, 3)

  const upcomingDeadlines = commitments
    .filter(c => {
      if (!c.deadline || c.status === 'COMPLETED' || c.status === 'ARCHIVED') return false
      const daysUntil = (new Date(c.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      return daysUntil <= 3 && daysUntil >= 0
    })
    .slice(0, 3)

  const ignoredCommitments = commitments
    .filter(c => {
      if (c.status !== 'DISCOVERED') return false
      const daysAgo = (new Date().getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      return daysAgo >= 3
    })
    .slice(0, 3)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 overflow-y-auto">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* New Commitment Button */}
          <button
            onClick={() => setIsNewCommitmentOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-md shadow-blue-500/10 hover:shadow-lg text-sm font-semibold cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            New Commitment
          </button>

          {!hasGmailConnection ? (
            <button
              onClick={() => router.push('/connections')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 rounded-lg hover:bg-amber-100 transition-colors text-sm font-semibold"
            >
              <AlertTriangle className="h-4.5 w-4.5" />
              Connect Gmail First
            </button>
          ) : (
            <>
              <button
                onClick={syncEmails}
                disabled={emailSyncState.status === 'syncing'}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 disabled:opacity-50 rounded-lg transition-all text-sm font-semibold cursor-pointer"
              >
                {emailSyncState.status === 'syncing' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4.5 w-4.5 text-blue-500" />
                )}
                {emailSyncState.status === 'syncing' ? 'Syncing...' : 'Sync Emails'}
              </button>

              <button
                onClick={syncCalendar}
                disabled={calendarSyncState.status === 'syncing'}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 disabled:opacity-50 rounded-lg transition-all text-sm font-semibold cursor-pointer"
              >
                {calendarSyncState.status === 'syncing' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4.5 w-4.5 text-purple-500" />
                )}
                {calendarSyncState.status === 'syncing' ? 'Syncing...' : 'Sync Calendar'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sync Status Notifications */}
      {emailSyncState.status === 'success' && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg flex items-center justify-between">
          <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">✓ Email Sync Success: {emailSyncState.message}</p>
          <button onClick={() => setEmailSyncState({ status: 'idle', message: null })} className="text-emerald-800 hover:opacity-75"><X className="h-4 w-4" /></button>
        </div>
      )}
      {emailSyncState.status === 'error' && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg flex items-center justify-between">
          <p className="text-sm text-red-800 dark:text-red-300 font-medium">✗ Email Sync Error: {emailSyncState.message}</p>
          <button onClick={() => setEmailSyncState({ status: 'idle', message: null })} className="text-red-800 hover:opacity-75"><X className="h-4 w-4" /></button>
        </div>
      )}
      {calendarSyncState.status === 'success' && (
        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg flex items-center justify-between">
          <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">✓ Calendar Sync Success: {calendarSyncState.message}</p>
          <button onClick={() => setCalendarSyncState({ status: 'idle', message: null })} className="text-emerald-800 hover:opacity-75"><X className="h-4 w-4" /></button>
        </div>
      )}
      {calendarSyncState.status === 'error' && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg flex items-center justify-between">
          <p className="text-sm text-red-800 dark:text-red-300 font-medium">✗ Calendar Sync Error: {calendarSyncState.message}</p>
          <button onClick={() => setCalendarSyncState({ status: 'idle', message: null })} className="text-red-800 hover:opacity-75"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total commitments</p>
            <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{commitments.length}</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Commitments</p>
            <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{activeCount}</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
            <Target className="h-5 w-5 text-amber-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Completed Task Load</p>
            <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{completedCount}</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Critical Risk Tasks</p>
            <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{criticalCount}</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
          </div>
        </div>
      </div>

      {/* Future Outlook Section */}
      {tab === 'dashboard' && (
        <FutureOutlook
          data={simulationData}
          loading={simulationLoading}
          error={simulationError}
          onRetry={fetchSimulation}
        />
      )}

      {/* Embedded AI Insights Panel */}
      {tab === 'dashboard' && (
        <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2.5 mb-5 border-b border-blue-100 dark:border-blue-900 pb-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/10">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                AI Time Intelligence Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Automated scheduling risks and productivity optimizations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Risk Commitments */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" /> Highest Risk Commitments
              </h4>
              {highestRiskCommitments.length > 0 ? (
                <ul className="space-y-2">
                  {highestRiskCommitments.map(c => (
                    <li key={c.id} className="text-xs border-b border-slate-100 dark:border-slate-800 pb-1.5 last:border-0 last:pb-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{c.title}</p>
                      <p className="text-slate-500 mt-0.5">Risk Score: <span className="font-bold text-rose-500">{c.riskScore}</span></p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">No high-risk commitments active.</p>
              )}
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Upcoming Deadlines
              </h4>
              {upcomingDeadlines.length > 0 ? (
                <ul className="space-y-2">
                  {upcomingDeadlines.map(c => (
                    <li key={c.id} className="text-xs border-b border-slate-100 dark:border-slate-800 pb-1.5 last:border-0 last:pb-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{c.title}</p>
                      <p className="text-slate-500 mt-0.5">Due: <span className="font-medium text-amber-600 dark:text-amber-400">{new Date(c.deadline!).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span></p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">No deadlines in the next 3 days.</p>
              )}
            </div>

            {/* Ignored / Discovered */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
              <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Ignored Discovered Items
              </h4>
              {ignoredCommitments.length > 0 ? (
                <ul className="space-y-2">
                  {ignoredCommitments.map(c => (
                    <li key={c.id} className="text-xs border-b border-slate-100 dark:border-slate-800 pb-1.5 last:border-0 last:pb-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{c.title}</p>
                      <p className="text-slate-500 mt-0.5">Discovered: <span className="font-medium text-blue-500">{new Date(c.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span></p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">No ignored discovery items.</p>
              )}
            </div>

            {/* Risk Breakdown & AI Recommendations */}
            <div
              onClick={() => setIsAIInsightsOpen(true)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              <div>
                <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> AI Recommendations
                </h4>
                {insights.length > 0 ? (
                  <>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium italic line-clamp-2">
                      &ldquo;{insights[0].description}&rdquo;
                    </p>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-2 inline-flex items-center gap-0.5 group-hover:underline">
                      View all {insights.length} insights <ChevronRight className="h-3 w-3" />
                    </span>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Keep syncing emails to get automated AI tips.</p>
                )}
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                  <span>CRITICAL RISK STATUS</span>
                  <span className="text-rose-500">{criticalCount} Tasks</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div
                    className="bg-rose-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (criticalCount / (commitments.length || 1)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Splits Views based on url query */}
      {tab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          {/* Commitments Ledger Column */}
          <div className="lg:col-span-4 h-full">
            <CommitmentsLedger commitments={commitments} onRefresh={fetchData} />
          </div>

          {/* Calendar Unified View Column */}
          <div className="lg:col-span-5 h-full">
            <CalendarView events={unifiedEvents} />
          </div>

          {/* Notification Tray Column */}
          <div className="lg:col-span-3 h-full">
            <NotificationTray
              notifications={clientNotifications}
              onDismiss={dismissNotification}
              onMarkAllRead={markAllNotificationsRead}
              onClearAll={clearAllNotifications}
            />
          </div>
        </div>
      )}

      {tab === 'commitments' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          <div className="lg:col-span-9 h-full">
            <CommitmentsLedger commitments={commitments} onRefresh={fetchData} />
          </div>
          <div className="lg:col-span-3 h-full">
            <NotificationTray
              notifications={clientNotifications}
              onDismiss={dismissNotification}
              onMarkAllRead={markAllNotificationsRead}
              onClearAll={clearAllNotifications}
            />
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          <div className="lg:col-span-9 h-full">
            <CalendarView events={unifiedEvents} />
          </div>
          <div className="lg:col-span-3 h-full">
            <NotificationTray
              notifications={clientNotifications}
              onDismiss={dismissNotification}
              onMarkAllRead={markAllNotificationsRead}
              onClearAll={clearAllNotifications}
            />
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          <div className="lg:col-span-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 h-fit shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
              <SettingsIcon className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Personal Settings</h2>
            </div>
            
            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">User Timezone</label>
                <select
                  value={settingsForm.timezone}
                  onChange={e => setSettingsForm({ ...settingsForm, timezone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="UTC">UTC (GMT+0:00)</option>
                  <option value="Asia/Kolkata">Kolkata (GMT+5:30)</option>
                  <option value="America/New_York">New York (GMT-5:00)</option>
                  <option value="Europe/London">London (GMT+0:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Gmail Sync Frequency</label>
                <select
                  value={settingsForm.syncFrequency}
                  onChange={e => setSettingsForm({ ...settingsForm, syncFrequency: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="15">Every 15 minutes</option>
                  <option value="30">Every 30 minutes</option>
                  <option value="60">Hourly</option>
                  <option value="1440">Daily</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">AI Warning Lead Time</label>
                <select
                  value={settingsForm.notifyLeadTime}
                  onChange={e => setSettingsForm({ ...settingsForm, notifyLeadTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="12">12 hours before</option>
                  <option value="24">24 hours before</option>
                  <option value="48">48 hours before</option>
                  <option value="72">3 days before</option>
                </select>
              </div>

              {settingsSaveStatus && (
                <div className={`p-3 rounded-lg text-sm ${settingsSaveStatus.includes('successfully') ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700' : 'bg-blue-50 dark:bg-blue-950/20 text-blue-700'}`}>
                  {settingsSaveStatus}
                </div>
              )}

              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm cursor-pointer shadow-md transition-colors"
              >
                Save Changes
              </button>
            </form>
          </div>
          <div className="lg:col-span-3 h-full">
            <NotificationTray
              notifications={clientNotifications}
              onDismiss={dismissNotification}
              onMarkAllRead={markAllNotificationsRead}
              onClearAll={clearAllNotifications}
            />
          </div>
        </div>
      )}

      {/* New Commitment Creation Modal */}
      {isNewCommitmentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="h-5.5 w-5.5 text-blue-500" />
                Create New Commitment
              </h2>
              <button
                onClick={() => setIsNewCommitmentOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateCommitment} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Commitment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Submit Project Report"
                  value={newCommitmentForm.title}
                  onChange={e => setNewCommitmentForm({ ...newCommitmentForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Provide details about this task..."
                  value={newCommitmentForm.description}
                  onChange={e => setNewCommitmentForm({ ...newCommitmentForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={newCommitmentForm.category}
                    onChange={e => setNewCommitmentForm({ ...newCommitmentForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="PERSONAL">Personal</option>
                    <option value="ACADEMIC">Academic</option>
                    <option value="CAREER">Career</option>
                    <option value="FINANCE">Finance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={newCommitmentForm.priority}
                    onChange={e => setNewCommitmentForm({ ...newCommitmentForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Deadline Date</label>
                  <input
                    type="datetime-local"
                    value={newCommitmentForm.deadline}
                    onChange={e => setNewCommitmentForm({ ...newCommitmentForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Est. Effort (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 60"
                    value={newCommitmentForm.estimatedEffort}
                    onChange={e => setNewCommitmentForm({ ...newCommitmentForm, estimatedEffort: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewCommitmentOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm cursor-pointer shadow-md transition-colors"
                >
                  Save Commitment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Insights Modal */}
      {isAIInsightsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5.5 w-5.5 text-indigo-500" />
                AI Time Intelligence Insights
              </h2>
              <button
                onClick={() => setIsAIInsightsOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {insights.length > 0 ? (
                <div className="space-y-4">
                  {insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-bold text-slate-950 dark:text-white text-sm">{insight.title}</h3>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            insight.priority === 'HIGH'
                              ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900'
                              : insight.priority === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900'
                          }`}
                        >
                          {insight.priority} PRIORITY
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {insight.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">No AI insights generated yet. Sync your email or calendar to build insights.</p>
              )}
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
              <button
                onClick={() => setIsAIInsightsOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg text-sm cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
