'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { RefreshCw, Mail, Calendar, AlertTriangle, Plus, X, BarChart2, Bell, CheckCircle2, Trash2, CheckCircle, Settings as SettingsIcon, BrainCircuit, ShieldAlert, Sparkles, Clock, Target, CalendarDays, ChevronRight, ChevronLeft, ChevronDown, Map } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { saveUserSettings } from '@/app/actions'
import TodaysFocus from './TodaysFocus'
import CommitmentsLedger from './CommitmentsLedger'
import CalendarView from './CalendarView'
import NotificationTray from './NotificationTray'
import FutureOutlook from './FutureOutlook'
import ContextCard from './ContextCard'
import OverloadBanner from './OverloadBanner'
import type { SimulationResult } from '@/types/simulation'

type UserInfo = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  timezone?: string | null
}

type PriorityItem = {
  id: string
  type: 'commitment' | 'context'
  title: string
  action: string
  estimatedTime: number
  urgency: 'today' | 'this-week' | 'later'
}

type RoadmapDay = {
  day: string
  tasks: {
    title: string
    duration: number
    type: 'commitment' | 'context'
  }[]
}

type RoadmapData = {
  overloaded: boolean
  overloadMessage: string | null
  postponeSuggestions: {
    commitmentId: string
    commitmentTitle: string
    reason: string
    suggestion: string
  }[]
  priorityList: PriorityItem[]
  roadmap: RoadmapDay[]
  generalAdvice: string
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

function formatRelativeTime(dateInput: string | Date | null): string {
  if (!dateInput) return 'Never'
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const diff = Date.now() - date.getTime()
  if (diff < 0) return 'just now'

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function DashboardClient({ user }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams?.get('tab') || 'dashboard'

  // Roadmap state
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [roadmapLoading, setRoadmapLoading] = useState(true)
  const [roadmapExists, setRoadmapExists] = useState(false)
  const [roadmapGeneratedAt, setRoadmapGeneratedAt] = useState<string | null>(null)
  const [roadmapGenerating, setRoadmapGenerating] = useState(false)
  const [roadmapCollapsed, setRoadmapCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chrono_roadmap_collapsed') === 'true'
    }
    return false
  })

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
  const [isContextSyncing, setIsContextSyncing] = useState(false)

  // Simulation Engine states
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(null)
  const [simulationLoading, setSimulationLoading] = useState(true)
  const [simulationError, setSimulationError] = useState(false)

  // New commitment modal states
  const [isNewCommitmentOpen, setIsNewCommitmentOpen] = useState(false)
  const [isAIInsightsOpen, setIsAIInsightsOpen] = useState(false)
  const [isSubmittingCommitment, setIsSubmittingCommitment] = useState(false)
  const [newCommitmentForm, setNewCommitmentForm] = useState({
    title: '',
    description: '',
    deadline: ''
  })

  // Settings state for Settings panel
  const [settingsForm, setSettingsForm] = useState({
    timezone: user.timezone || 'Asia/Kolkata',
    syncFrequency: '60',
    notifyLeadTime: '24'
  })
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<string | null>(null)

  const [selectedContextId, setSelectedContextId] = useState<string | null>(null)
  const [selectedContext, setSelectedContext] = useState<any>(null)
  const [contextLoading, setContextLoading] = useState(false)

  const [contexts, setContexts] = useState<any[]>([])
  const [contextsLoading, setContextsLoading] = useState(true)

  // Fetch detail on select
  useEffect(() => {
    if (!selectedContextId) {
      setSelectedContext(null)
      return
    }

    const fetchContextDetail = async () => {
      setContextLoading(true)
      try {
        const res = await fetch(`/api/commitments/${selectedContextId}`)
        if (res.ok) {
          const data = await res.json()
          setSelectedContext(data)
        } else {
          const local = commitments.find(c => c.id === selectedContextId)
          setSelectedContext(local)
        }
      } catch (err) {
        console.error(err)
        const local = commitments.find(c => c.id === selectedContextId)
        setSelectedContext(local)
      } finally {
        setContextLoading(false)
      }
    }

    fetchContextDetail()
  }, [selectedContextId, commitments])

  const formatLastActive = (dateString: string | Date | undefined | null) => {
    if (!dateString) return 'Never'
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      
      if (diffDays === 0) {
        return `Today at ${timeStr}`
      } else if (diffDays === 1) {
        return `Yesterday at ${timeStr}`
      } else {
        return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`
      }
    } catch {
      return 'Recently'
    }
  }

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

  const fetchRoadmap = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/roadmap')
      const data = await response.json()

      if (data.exists) {
        setRoadmap(data.data)
        setRoadmapExists(true)
        setRoadmapGeneratedAt(data.generatedAt)
      } else {
        setRoadmapExists(false)
        setRoadmap(null)
      }
    } catch (error) {
      console.error('Failed to fetch roadmap:', error)
    } finally {
      setRoadmapLoading(false)
    }
  }, [])

  const regenerateRoadmap = async () => {
    setRoadmapGenerating(true)
    try {
      const response = await fetch('/api/ai/roadmap', {
        method: 'POST',
      })
      const data = await response.json()

      if (data.error) {
        alert('Failed to generate roadmap: ' + data.error)
      } else {
        setRoadmap(data)
        setRoadmapExists(true)
        setRoadmapGeneratedAt(new Date().toISOString())
      }
    } catch (error) {
      console.error('Failed to regenerate roadmap:', error)
      alert('Failed to regenerate roadmap. Please try again.')
    } finally {
      setRoadmapGenerating(false)
    }
  }

  const fetchData = useCallback(async () => {
    // Fire simulation fetch and roadmap fetch in background
    fetchSimulation()
    fetchRoadmap()

    try {
      const [commitmentsRes, eventsRes, notificationsRes, insightsRes, connectionsRes, contextsRes] = await Promise.all([
        fetch('/api/commitments'),
        fetch('/api/calendar/events'),
        fetch('/api/notifications'),
        fetch('/api/insights'),
        fetch('/api/connections/gmail/list'),
        fetch('/api/dashboard/contexts'),
      ])

      const [commitmentsData, eventsData, notificationsData, insightsData, connectionsData, contextsData] = await Promise.all([
        commitmentsRes.ok ? commitmentsRes.json() : [],
        eventsRes.ok ? eventsRes.json() : [],
        notificationsRes.ok ? notificationsRes.json() : [],
        insightsRes.ok ? insightsRes.json() : [],
        connectionsRes.ok ? connectionsRes.json() : [],
        contextsRes.ok ? contextsRes.json() : { contexts: [] },
      ])

      setCommitments(Array.isArray(commitmentsData) ? commitmentsData : [])
      setCalendarEvents(Array.isArray(eventsData) ? eventsData : [])
      setNotifications(Array.isArray(notificationsData) ? notificationsData : [])
      setInsights(Array.isArray(insightsData) ? insightsData : [])
      setContexts(contextsData && Array.isArray(contextsData.contexts) ? contextsData.contexts : [])
      
      const connectedAccounts = Array.isArray(connectionsData)
        ? connectionsData.filter((c: { connected: boolean }) => c.connected)
        : []
      setHasGmailConnection(connectedAccounts.length > 0)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
      setContextsLoading(false)
    }
  }, [fetchSimulation])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Save roadmap collapse state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chrono_roadmap_collapsed', roadmapCollapsed.toString())
    }
  }, [roadmapCollapsed])

  // Helper functions for roadmap styling
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'today':
        return 'border-l-4 border-l-rose-500 bg-rose-50 dark:bg-rose-900/20'
      case 'this-week':
        return 'border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/20'
      default:
        return 'border-l-4 border-l-slate-300 bg-slate-50 dark:bg-slate-800'
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'today':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
      case 'this-week':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    }
  }

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
    setIsSubmittingCommitment(true)
    try {
      const response = await fetch('/api/commitments/analyze-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newCommitmentForm.title,
          description: newCommitmentForm.description,
          deadline: newCommitmentForm.deadline || null,
          userId: user.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error ?? 'Failed to analyze and create commitment')
      }

      setIsNewCommitmentOpen(false)
      setNewCommitmentForm({
        title: '',
        description: '',
        deadline: ''
      })
      await fetchData()
    } catch (err: any) {
      alert(err.message || 'Error creating commitment')
    } finally {
      setIsSubmittingCommitment(false)
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

  // Sync Contexts from AI conversations
  const syncContexts = async () => {
    setIsContextSyncing(true)
    try {
      const response = await fetch('/api/ai/analyze-context', { method: 'POST' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'AI context sync failed')
      }

      // Refresh contexts section without full page reload
      const res = await fetch('/api/dashboard/contexts')
      if (res.ok) {
        const data = await res.json()
        setContexts(data && Array.isArray(data.contexts) ? data.contexts : [])
      }
    } catch (error) {
      console.error('Failed to sync contexts:', error)
      alert(error instanceof Error ? error.message : 'AI context sync failed')
    } finally {
      setIsContextSyncing(false)
    }
  }

  const handleDeleteContext = useCallback(async (contextId: string) => {
    try {
      const response = await fetch(`/api/dashboard/contexts/${contextId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Failed to remove context')
      }

      setContexts((prev) => prev.filter((ctx) => ctx.id !== contextId))
    } catch (error) {
      console.error('Failed to delete context:', error)
      alert(error instanceof Error ? error.message : 'Failed to remove context')
      throw error
    }
  }, [])

  // Save Settings configuration
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsSaveStatus('Saving settings...')
    try {
      await saveUserSettings(settingsForm.timezone)
      setSettingsSaveStatus('Settings saved successfully!')
      setTimeout(() => setSettingsSaveStatus(null), 3000)
    } catch (err: any) {
      setSettingsSaveStatus('Failed to save settings: ' + (err.message || 'Unknown error'))
    }
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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-8 overflow-y-auto">
      {/* Header Status Bar (Sync States) */}
      {(emailSyncState.status === 'success' || emailSyncState.status === 'error' || calendarSyncState.status === 'success' || calendarSyncState.status === 'error') && (
        <div className="mb-6 space-y-2">
          {emailSyncState.status === 'success' && (
            <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md flex items-center justify-between">
              <p className="text-xs text-slate-700 dark:text-slate-350 font-medium">Email Sync Success: {emailSyncState.message}</p>
              <button onClick={() => setEmailSyncState({ status: 'idle', message: null })} className="text-slate-500 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
          {emailSyncState.status === 'error' && (
            <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md flex items-center justify-between">
              <p className="text-xs text-slate-650 dark:text-slate-350 font-medium">Email Sync Error: {emailSyncState.message}</p>
              <button onClick={() => setEmailSyncState({ status: 'idle', message: null })} className="text-slate-500 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
          {calendarSyncState.status === 'success' && (
            <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md flex items-center justify-between">
              <p className="text-xs text-slate-700 dark:text-slate-350 font-medium">Calendar Sync Success: {calendarSyncState.message}</p>
              <button onClick={() => setCalendarSyncState({ status: 'idle', message: null })} className="text-slate-500 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
          {calendarSyncState.status === 'error' && (
            <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md flex items-center justify-between">
              <p className="text-xs text-slate-650 dark:text-slate-350 font-medium">Calendar Sync Error: {calendarSyncState.message}</p>
              <button onClick={() => setCalendarSyncState({ status: 'idle', message: null })} className="text-slate-500 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>
      )}

      {/* Main Tab Render: Dashboard (Memory Bank) */}
      {tab === 'dashboard' && (
        <div className="flex-1 flex flex-col">
          {/* Conditional view: Context Detail Split View vs Memory Bank List */}
          {selectedContextId ? (
            <div className="flex-1 flex flex-col space-y-6">
              {/* Back breadcrumb and Actions */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
                <button
                  onClick={() => setSelectedContextId(null)}
                  className="flex items-center gap-1.5 text-xs text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350 transition-colors font-medium cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Memory Bank
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      if (confirm('Mark this commitment as completed?')) {
                        try {
                          const res = await fetch(`/api/commitments/${selectedContextId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'COMPLETED' }),
                          })
                          if (res.ok) {
                            setSelectedContextId(null)
                            fetchData()
                          }
                        } catch (err) {
                          console.error(err)
                        }
                      }
                    }}
                    className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    Mark completed
                  </button>
                </div>
              </div>

              {contextLoading || !selectedContext ? (
                <div className="flex-1 flex items-center justify-center py-20">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-slate-300 dark:border-slate-800 border-r-transparent"></div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Restoring continuity state...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 flex-1 py-4">
                  {/* Left Panel: The State (7 cols) */}
                  <div className="lg:col-span-7 space-y-10">
                    <div className="flex flex-wrap items-center gap-10 border-b border-slate-200/60 dark:border-slate-850 pb-8">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">STATUS</p>
                        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100/60 dark:bg-slate-900/65 border border-slate-200 dark:border-slate-800/80 rounded text-slate-700 dark:text-slate-300">
                          {selectedContext.status === 'AT_RISK' ? 'At Risk' : selectedContext.status === 'ACTIVE' ? 'In Progress' : 'Proposed'}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">LAST ACTIVE</p>
                        <span className="text-sm text-slate-700 dark:text-slate-300 font-light">
                          {formatLastActive(selectedContext.lastActivity || selectedContext.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500">WHERE YOU LEFT OFF</p>
                      <h2 className="text-3xl font-light text-slate-900 dark:text-slate-100 leading-relaxed tracking-tight max-w-2xl">
                        {selectedContext.description || "No content summary extracted. Start by adding notes or sync connected emails to analyze where you left off."}
                      </h2>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500">LAST THING DONE</p>
                      <div className="flex items-center gap-3.5 text-sm text-slate-700 dark:text-slate-300">
                        <div className="h-5 w-5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-center text-slate-450 dark:text-slate-500 font-bold shrink-0">
                          ✓
                        </div>
                        <span className="font-light">
                          {selectedContext.lastActivity ? 'Updated details and synchronised task state' : 'Identified obligation from connection source'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-450 dark:text-slate-555 font-semibold">NEXT RECOMMENDED STEP</p>
                      <div className="p-5 rounded-xl bg-slate-100/40 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-850 max-w-xl">
                        <p className="text-sm font-medium text-slate-850 dark:text-slate-255 leading-relaxed">
                          {selectedContext.actionPlans && selectedContext.actionPlans.length > 0 
                            ? selectedContext.actionPlans[0].planContent 
                            : selectedContext.priority === 'CRITICAL' || selectedContext.priority === 'HIGH'
                              ? 'Flagged priority constraint. Address deadlines and sync with connected accounts to avoid scheduling delays.'
                              : 'Review existing brief and update timeline details to advance progress.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel: The Metadata Box (5 cols) */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* AI Continuity Recommendation card */}
                    <div className="p-6 rounded-xl bg-slate-100/30 dark:bg-slate-900/15 border border-slate-200/80 dark:border-slate-855/80 shadow-sm leading-relaxed">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3.5">AI Continuity Recommendation</p>
                      <p className="text-sm text-slate-700 dark:text-slate-350 font-light">
                        {selectedContext.aiSummary || "Continuity check: Review recent interactions. Consider scheduling 15 minutes to organize notes and set milestones for upcoming deliverables."}
                      </p>
                    </div>

                    {/* Estimated Time */}
                    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900/40 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-555">Estimated Time</p>
                        <p className="text-xl font-medium mt-1 text-slate-900 dark:text-slate-200">
                          {selectedContext.estimatedEffort ? `${selectedContext.estimatedEffort} minutes` : '45 minutes (Default)'}
                        </p>
                      </div>
                    </div>

                    {/* Source Connected tracking indicator */}
                    <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900/40 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">Source Connected</p>
                      <div className="flex items-center gap-2.5 text-xs text-slate-555 dark:text-slate-400 mt-1">
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                        <span className="font-light truncate">
                          {selectedContext.sources && selectedContext.sources.length > 0 
                            ? `Extracted from Gmail: "${selectedContext.sources[0].sourceReference || 'No Subject'}"`
                            : 'Extracted from ChatGPT Conversation'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Layout Header */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10 border-b border-slate-200/80 dark:border-slate-800 pb-6">
                <div>
                  <h1 className="text-4xl font-extralight tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                    Welcome back, <span className="font-normal text-slate-950 dark:text-white">Tanishka</span>
                  </h1>
                  <p className="text-sm text-slate-400 dark:text-slate-500 font-light mt-2 tracking-wide">
                    You have <span className="text-slate-600 dark:text-slate-450 font-medium">{activeCount + contexts.length} active contexts</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* New Commitment Button */}
                  <button
                    onClick={() => setIsNewCommitmentOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-transparent bg-slate-900 hover:bg-slate-850 text-white dark:bg-slate-100 dark:hover:bg-slate-205 dark:text-slate-955 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Commitment
                  </button>

                  {!hasGmailConnection ? (
                    <button
                      onClick={() => router.push('/connections')}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-105 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-200/50 transition-colors text-xs font-semibold cursor-pointer"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
                      Connect Gmail
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={syncEmails}
                        disabled={emailSyncState.status === 'syncing'}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 disabled:opacity-50 rounded-lg transition-all text-xs font-semibold cursor-pointer"
                      >
                        {emailSyncState.status === 'syncing' ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        Sync Emails
                      </button>

                      <button
                        onClick={syncCalendar}
                        disabled={calendarSyncState.status === 'syncing'}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-850 dark:text-slate-200 disabled:opacity-50 rounded-lg transition-all text-xs font-semibold cursor-pointer"
                      >
                        {calendarSyncState.status === 'syncing' ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        Sync Calendar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Two Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                
                {/* Left Column (60% width) */}
                <div className="lg:col-span-3 space-y-10">
                  {/* Active Contexts Section */}
                  {contextsLoading ? (
                    <div className="py-6">
                      <p className="text-xs text-slate-550 dark:text-slate-450 font-light">Loading active contexts...</p>
                    </div>
                  ) : (
                    <div className="max-w-5xl">
                      <div className="flex items-center gap-2.5 mb-5">
                        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          ACTIVE CONTEXTS ({contexts.length})
                        </h2>
                        <button
                          onClick={syncContexts}
                          disabled={isContextSyncing}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 rounded transition-all cursor-pointer"
                        >
                          {isContextSyncing ? (
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <span>↻</span>
                          )}
                          Sync
                        </button>
                      </div>

                      {contexts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {contexts.map((ctx) => (
                            <ContextCard key={ctx.id} {...ctx} onDelete={handleDeleteContext} />
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 max-w-3xl">
                          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">No active contexts yet</h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                            Install the ChronoAI Chrome extension and use ChatGPT, Claude, or Gemini — your active contexts and progress checkpoints will sync here automatically.
                          </p>
                          <a
                            href="/auth/extension"
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-400 font-semibold transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Connect Extension <ChevronRight className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Overload Banner */}
                  <OverloadBanner />

                  {/* 4-Category List Layout (Memory Bank) */}
                  <div className="space-y-10 flex-1 max-w-5xl">
                    {[
                      {
                        title: '🔥 URGENT',
                        items: commitments.filter(
                          c => (c.status === 'ACTIVE' || c.status === 'AT_RISK' || c.status === 'DISCOVERED') &&
                          (c.priority === 'CRITICAL' || c.priority === 'HIGH' || c.status === 'AT_RISK')
                        ),
                      },
                      {
                        title: '📚 LEARNING',
                        items: commitments.filter(
                          c => (c.status === 'ACTIVE' || c.status === 'AT_RISK' || c.status === 'DISCOVERED') &&
                          !(c.priority === 'CRITICAL' || c.priority === 'HIGH' || c.status === 'AT_RISK') &&
                          c.category === 'ACADEMIC'
                        ),
                      },
                      {
                        title: '💻 PROJECTS',
                        items: commitments.filter(
                          c => (c.status === 'ACTIVE' || c.status === 'AT_RISK' || c.status === 'DISCOVERED') &&
                          !(c.priority === 'CRITICAL' || c.priority === 'HIGH' || c.status === 'AT_RISK') &&
                          c.category === 'CAREER'
                        ),
                      },
                      {
                        title: '📬 PERSONAL',
                        items: commitments.filter(
                          c => (c.status === 'ACTIVE' || c.status === 'AT_RISK' || c.status === 'DISCOVERED') &&
                          !(c.priority === 'CRITICAL' || c.priority === 'HIGH' || c.status === 'AT_RISK') &&
                          (c.category === 'PERSONAL' || c.category === 'FINANCE')
                        ),
                      },
                    ].map((category) => (
                      <div key={category.title} className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          {category.title}
                          <span className="text-[10px] font-normal lowercase text-slate-400">
                            ({category.items.length})
                          </span>
                        </h3>
                        
                        {category.items.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2.5">
                            {category.items.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => setSelectedContextId(item.id)}
                                className="w-full flex items-center justify-between py-3.5 px-5 rounded-md border border-slate-200/70 dark:border-slate-850 bg-white dark:bg-slate-900/35 hover:bg-slate-50/50 dark:hover:bg-slate-900 hover:border-slate-350 dark:hover:border-slate-750 transition-all text-left group cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-slate-850 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
                                    {item.title}
                                  </span>
                                  {item.status === 'AT_RISK' && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-amber-250/20 bg-amber-50/40 text-amber-600 dark:bg-amber-950/20 dark:text-amber-300">
                                      at risk
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400 dark:text-slate-550 group-hover:text-slate-600 dark:group-hover:text-slate-450 font-light flex items-center gap-2 transition-colors">
                                  {item.deadline ? new Date(item.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No deadline'}
                                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-slate-600 italic pl-1 font-light">No active items</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column (40% width, sticky top) */}
                <div className="lg:col-span-2">
                  <div className="lg:sticky lg:top-4 space-y-4">
                    {/* AI Roadmap Section */}
                    <div className="max-w-5xl">
                      <div className="flex items-center gap-2.5 mb-5">
                        <button
                          onClick={() => setRoadmapCollapsed(!roadmapCollapsed)}
                          className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                        >
                          {roadmapCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <Map className="h-3.5 w-3.5" />
                          AI ROADMAP
                        </h2>
                        <button
                          onClick={regenerateRoadmap}
                          disabled={roadmapGenerating}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 rounded transition-all cursor-pointer"
                        >
                          {roadmapGenerating ? (
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <span>↻</span>
                          )}
                          {roadmapGenerating ? 'Generating...' : (roadmapExists ? 'Regenerate' : 'Generate')}
                        </button>
                      </div>

                      {!roadmapCollapsed && (
                        <>
                          {roadmapLoading ? (
                            <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10">
                              <div className="text-center">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-slate-300 dark:border-slate-800 border-r-transparent"></div>
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Loading roadmap...</p>
                              </div>
                            </div>
                          ) : !roadmapExists || !roadmap ? (
                            <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10">
                              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">No Roadmap Generated Yet</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                                Generate your AI roadmap to get a personalized priority list and 7-day plan based on your commitments and contexts.
                              </p>
                              <button
                                onClick={regenerateRoadmap}
                                disabled={roadmapGenerating}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5"
                              >
                                {roadmapGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                                {roadmapGenerating ? 'Generating...' : 'Generate Roadmap'}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {/* General Advice */}
                              {roadmap.generalAdvice && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                  <p className="text-sm text-blue-900 dark:text-blue-100">{roadmap.generalAdvice}</p>
                                </div>
                              )}

                              <div className="grid grid-cols-1 gap-6">
                                {/* SECTION A - Priority List */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">YOUR PRIORITY LIST</h3>
                                  <div className="space-y-3">
                                    {roadmap.priorityList
                                      .sort((a, b) => {
                                        const urgencyOrder = { today: 0, 'this-week': 1, later: 2 }
                                        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
                                      })
                                      .slice(0, 5)
                                      .map((item) => (
                                        <div key={item.id} className={`p-3 rounded-lg border border-slate-200 dark:border-slate-700 ${getUrgencyColor(item.urgency)}`}>
                                          <div className="flex items-start justify-between mb-1.5">
                                            <h4 className="text-sm font-medium text-slate-900 dark:text-white flex-1">{item.title}</h4>
                                            <div className="flex items-center gap-1.5">
                                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getUrgencyBadge(item.urgency)}`}>
                                                {item.urgency.replace('-', ' ').toUpperCase()}
                                              </span>
                                              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                                {item.type}
                                              </span>
                                            </div>
                                          </div>
                                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{item.action}</p>
                                          <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-500">
                                            <Clock className="h-2.5 w-2.5" />
                                            <span>~{item.estimatedTime} min</span>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                  {roadmap.priorityList.length > 5 && (
                                    <button className="mt-3 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">
                                      View all {roadmap.priorityList.length} tasks →
                                    </button>
                                  )}
                                </div>

                                {/* SECTION B - 7-Day Roadmap (Horizontal Scroll) */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">7-DAY ROADMAP</h3>
                                  <div className="flex gap-3 overflow-x-auto pb-2">
                                    {roadmap.roadmap.map((day, index) => (
                                      <div key={index} className="flex-shrink-0 w-44 border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800">
                                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white mb-2">{day.day}</h4>
                                        <div className="space-y-2">
                                          {day.tasks.slice(0, 3).map((task, taskIndex) => (
                                            <div key={taskIndex} className="space-y-0.5">
                                              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400">{task.duration} min</span>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">{task.type}</span>
                                              </div>
                                            </div>
                                          ))}
                                          {day.tasks.length > 3 && (
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">+{day.tasks.length - 3} more</p>
                                          )}
                                          {day.tasks.length === 0 && (
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">No tasks</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Last Generated */}
                              <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                                <span>Last generated: {roadmapGeneratedAt ? formatRelativeTime(roadmapGeneratedAt) : 'N/A'}</span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
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

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Deadline Date (Optional)</label>
                <input
                  type="datetime-local"
                  value={newCommitmentForm.deadline}
                  onChange={e => setNewCommitmentForm({ ...newCommitmentForm, deadline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
                <button
                  type="button"
                  disabled={isSubmittingCommitment}
                  onClick={() => setIsNewCommitmentOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCommitment}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm cursor-pointer shadow-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingCommitment && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  {isSubmittingCommitment ? 'Analyzing & Saving...' : 'Save Commitment'}
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
