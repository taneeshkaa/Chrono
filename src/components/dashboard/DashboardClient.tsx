'use client'

import { useEffect, useState, Suspense } from 'react'
import TodaysFocus from './TodaysFocus'
import AIInsightsBanner from './AIInsightsBanner'
import CommitmentsLedger from './CommitmentsLedger'
import CalendarView from './CalendarView'
import NotificationTray from './NotificationTray'

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
  type: 'REMINDER' | 'DEADLINE_WARNING' | 'STATUS_UPDATE' | 'RECOMMENDATION' | 'ALERT'
  isRead: boolean
  createdAt: string
  commitmentId?: string
}

type Insight = {
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
}

export default function DashboardClient() {
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all data in parallel
        const [commitmentsRes, eventsRes, notificationsRes, insightsRes] = await Promise.all([
          fetch('/api/commitments'),
          fetch('/api/calendar/events'),
          fetch('/api/notifications'),
          fetch('/api/insights')
        ])

        const [commitmentsData, eventsData, notificationsData, insightsData] = await Promise.all([
          commitmentsRes.ok ? commitmentsRes.json() : [],
          eventsRes.ok ? eventsRes.json() : [],
          notificationsRes.ok ? notificationsRes.json() : [],
          insightsRes.ok ? insightsRes.json() : []
        ])

        setCommitments(Array.isArray(commitmentsData) ? commitmentsData : [])
        setCalendarEvents(Array.isArray(eventsData) ? eventsData : [])
        setNotifications(Array.isArray(notificationsData) ? notificationsData : [])
        setInsights(Array.isArray(insightsData) ? insightsData : [])
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Get today's focus - highest priority active commitment
  const todayFocus = commitments
    .filter(c => c.status === 'ACTIVE' || c.status === 'AT_RISK')
    .sort((a, b) => {
      // Sort by priority first (CRITICAL > HIGH > MEDIUM > LOW)
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      // Then by risk score (higher first)
      return b.riskScore - a.riskScore
    })[0]

  // Calculate AI insights from data
  const aiInsights = {
    criticalRisks: commitments.filter(c => c.riskScore >= 75).length,
    timeConflicts: 0, // Would need to calculate overlapping events
    upcomingDeadlines: commitments.filter(c => {
      if (!c.deadline) return false
      const daysUntil = (new Date(c.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      return daysUntil <= 3 && daysUntil >= 0
    }).length,
    optimizationOpportunities: insights.length
  }

  // Transform calendar events for the CalendarView component
  const transformedEvents = calendarEvents.map((event, index) => {
    const eventDate = new Date(event.date)
    const hour = eventDate.getHours()
    const minute = eventDate.getMinutes()
    
    return {
      id: `event-${index}`,
      title: event.title,
      time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
      duration: 60, // Default duration
      type: 'meeting' as const,
      participants: [],
    }
  })

  // Transform notifications for the NotificationTray component
  const transformedNotifications = notifications.map(notif => ({
    id: notif.id,
    title: notif.title,
    message: notif.message,
    type: notif.type.toLowerCase() as 'reminder' | 'warning' | 'success' | 'info' | 'alert',
    timestamp: new Date(notif.createdAt).toLocaleString(),
    isRead: notif.isRead,
    commitmentId: notif.commitmentId
  }))

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Main Content Area (Center Canvas) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {/* Today's Focus - Hero Section */}
          <div className="mb-6">
            {todayFocus ? (
              <Suspense fallback={<div className="h-48 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>}>
                <TodaysFocus commitment={todayFocus} />
              </Suspense>
            ) : (
              <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-8 shadow-sm text-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">All Clear!</h2>
                <p className="text-slate-600 dark:text-slate-400">No critical commitments requiring immediate attention.</p>
              </div>
            )}
          </div>

          {/* AI Insights Banner */}
          <div className="mb-8">
            <Suspense fallback={<div className="h-20 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl"></div>}>
              <AIInsightsBanner insights={aiInsights} />
            </Suspense>
          </div>

          {/* Workspace Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Commitments Ledger */}
            <div>
              <Suspense fallback={<div className="h-[500px] animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl"></div>}>
                <CommitmentsLedger commitments={commitments} />
              </Suspense>
            </div>

            {/* Calendar View */}
            <div>
              <Suspense fallback={<div className="h-[500px] animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl"></div>}>
                <CalendarView events={transformedEvents} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Tray (Right Column) */}
      <Suspense fallback={<div className="w-80 bg-slate-100 dark:bg-slate-800"></div>}>
        <NotificationTray notifications={transformedNotifications} />
      </Suspense>
    </div>
  )
}
