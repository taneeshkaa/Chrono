'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type CommitmentStatus =
  | 'DISCOVERED'
  | 'ACTIVE'
  | 'AT_RISK'
  | 'COMPLETED'
  | 'MISSED'
  | 'ARCHIVED'

type CommitmentCategory = 'ACADEMIC' | 'CAREER' | 'PERSONAL' | 'FINANCE'
type CommitmentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

type Commitment = {
  id: string
  title: string
  description: string | null
  category: CommitmentCategory
  priority: CommitmentPriority
  deadline: string | null
  status: CommitmentStatus
  riskScore: number
  createdAt: string
}

type SyncState = {
  status: 'idle' | 'syncing' | 'success' | 'error'
  message: string | null
}

type Insight = {
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
}

type NotificationItem = {
  id: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  type: 'DEADLINE' | 'RISK' | 'MISSED' | 'SUMMARY'
  createdAt: string
}

type DailySummary = {
  title: string
  description: string
}

function getInsightPriorityBadgeClass(priority: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  switch (priority) {
    case 'LOW':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'HIGH':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getNotificationPriorityBadgeClass(priority: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  switch (priority) {
    case 'LOW':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'HIGH':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getNotificationTypeBadgeClass(type: 'DEADLINE' | 'RISK' | 'MISSED' | 'SUMMARY'): string {
  switch (type) {
    case 'DEADLINE':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'RISK':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'MISSED':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'SUMMARY':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

type FilterTab = 'all' | 'active' | 'completed' | 'archived'

type EditFormState = {
  title: string
  description: string
  category: CommitmentCategory
  priority: CommitmentPriority
  deadline: string
}

type SortOption =
  | 'deadline-nearest'
  | 'deadline-furthest'
  | 'priority-desc'
  | 'priority-asc'
  | 'risk-desc'
  | 'risk-asc'
  | 'created-newest'
  | 'created-oldest'

type Filters = {
  status: CommitmentStatus | 'all'
  priority: CommitmentPriority | 'all'
  category: CommitmentCategory | 'all'
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'all'
}

const PRIORITY_ORDER: Record<CommitmentPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

const FILTER_TABS: Array<{ id: FilterTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'archived', label: 'Archived' },
]

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

function getRiskLevel(score: number): RiskLevel {
  if (score < 25) return 'LOW'
  if (score < 50) return 'MEDIUM'
  if (score < 75) return 'HIGH'
  return 'CRITICAL'
}

function getPriorityBadgeClass(priority: CommitmentPriority): string {
  switch (priority) {
    case 'LOW':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getRiskBadgeClass(level: RiskLevel): string {
  switch (level) {
    case 'LOW':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function statusBadgeClass(status: CommitmentStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'ARCHIVED':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'DISCOVERED':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'MISSED':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-white text-gray-700 border-gray-200'
  }
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) {
    return 'No deadline'
  }

  return new Date(deadline).toLocaleString()
}

function toDateTimeLocalValue(deadline: string | null): string {
  if (!deadline) {
    return ''
  }

  const date = new Date(deadline)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)

  return local.toISOString().slice(0, 16)
}

export function DashboardCommitments() {
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [loadingCommitments, setLoadingCommitments] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [editingCommitment, setEditingCommitment] =
    useState<Commitment | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    message: null,
  })

  const [insights, setInsights] = useState<Insight[]>([])
  const [loadingInsights, setLoadingInsights] = useState(true)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
  const shownNotificationIdsRef = useRef<Set<string>>(new Set())
  const [calendarEvents, setCalendarEvents] = useState<Array<{ title: string; date: string; time: string }>>([])
  const [loadingCalendarEvents, setLoadingCalendarEvents] = useState(true)

  // New state for Phase 11 features
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    priority: 'all',
    category: 'all',
    risk: 'all',
  })
  const [sortOption, setSortOption] = useState<SortOption>('deadline-nearest')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchCommitments = useCallback(async () => {
    setListError(null)

    try {
      const response = await fetch('/api/commitments')
      const text = await response.text()
      const data = text
        ? (JSON.parse(text) as Commitment[] | { error?: string })
        : null

      if (!response.ok) {
        throw new Error(
          data && 'error' in data && data.error
            ? data.error
            : 'Failed to load commitments'
        )
      }

      setCommitments(Array.isArray(data) ? data : [])
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : 'Failed to load commitments'
      )
    } finally {
      setLoadingCommitments(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCommitments()
  }, [fetchCommitments])

  const fetchInsights = useCallback(async () => {
    try {
      const response = await fetch('/api/insights')
      if (!response.ok) {
        throw new Error('Failed to fetch insights')
      }
      const data = await response.json()
      setInsights(Array.isArray(data) ? data : [])
    } catch {
      setInsights([])
    } finally {
      setLoadingInsights(false)
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications')
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      const data = await response.json()
      setNotifications(Array.isArray(data) ? data : [])
    } catch {
      setNotifications([])
    } finally {
      setLoadingNotifications(false)
    }
  }, [])

  const fetchDailySummary = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/summary')
      if (!response.ok) {
        throw new Error('Failed to fetch daily summary')
      }
      const data = await response.json()
      setDailySummary(data)
    } catch {
      setDailySummary(null)
    }
  }, [])

  const fetchCalendarEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/events')
      if (!response.ok) {
        throw new Error('Failed to fetch calendar events')
      }
      const data = await response.json()
      setCalendarEvents(Array.isArray(data) ? data : [])
    } catch {
      setCalendarEvents([])
    } finally {
      setLoadingCalendarEvents(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInsights()
    fetchNotifications()
    fetchDailySummary()
    fetchCalendarEvents()
  }, [fetchInsights, fetchNotifications, fetchDailySummary, fetchCalendarEvents])

  // Browser notifications
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Request permission on page load
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Show notifications
    if (Notification.permission === 'granted') {
      notifications.forEach((notification) => {
        if (!shownNotificationIdsRef.current.has(notification.id)) {
          new Notification('ChronoAI Reminder', {
            body: notification.description,
          })
          shownNotificationIdsRef.current.add(notification.id)
        }
      })
    }
  }, [notifications])

  const nonArchivedCommitments = useMemo(
    () => commitments.filter((commitment) => commitment.status !== 'ARCHIVED'),
    [commitments]
  )

  // Filter commitments based on all filters
  const filteredCommitments = useMemo(() => {
    let result = [...commitments]

    // Apply filter tab
    if (activeTab === 'active') {
      result = result.filter((c) => c.status === 'ACTIVE')
    } else if (activeTab === 'completed') {
      result = result.filter((c) => c.status === 'COMPLETED')
    } else if (activeTab === 'archived') {
      result = result.filter((c) => c.status === 'ARCHIVED')
    }

    // Apply search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(lowerQuery) ||
          (c.description && c.description.toLowerCase().includes(lowerQuery))
      )
    }

    // Apply status filter
    if (filters.status !== 'all') {
      result = result.filter((c) => c.status === filters.status)
    }

    // Apply priority filter
    if (filters.priority !== 'all') {
      result = result.filter((c) => c.priority === filters.priority)
    }

    // Apply category filter
    if (filters.category !== 'all') {
      result = result.filter((c) => c.category === filters.category)
    }

    // Apply risk filter
    if (filters.risk !== 'all') {
      result = result.filter((c) => getRiskLevel(c.riskScore) === filters.risk)
    }

    return result
  }, [commitments, activeTab, searchQuery, filters])

  // Sort commitments
  const sortedCommitments = useMemo(() => {
    const result = [...filteredCommitments]

    switch (sortOption) {
      case 'deadline-nearest':
        result.sort((a, b) => {
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        })
        break
      case 'deadline-furthest':
        result.sort((a, b) => {
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return new Date(b.deadline).getTime() - new Date(a.deadline).getTime()
        })
        break
      case 'priority-desc':
        result.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
        break
      case 'priority-asc':
        result.sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority])
        break
      case 'risk-desc':
        result.sort((a, b) => b.riskScore - a.riskScore)
        break
      case 'risk-asc':
        result.sort((a, b) => a.riskScore - b.riskScore)
        break
      case 'created-newest':
        result.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        break
      case 'created-oldest':
        result.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        break
    }

    return result
  }, [filteredCommitments, sortOption])

  // Pagination
  const totalPages = Math.ceil(sortedCommitments.length / itemsPerPage)
  const paginatedCommitments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    const end = start + itemsPerPage
    return sortedCommitments.slice(start, end)
  }, [sortedCommitments, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1)
  }, [searchQuery, filters, sortOption, activeTab])

  const updateCommitment = async (
    id: string,
    body: Record<string, string | null>
  ): Promise<boolean> => {
    setActionError(null)
    setPendingActionId(id)

    try {
      const response = await fetch(`/api/commitments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const text = await response.text()
      const data = text ? (JSON.parse(text) as { error?: string }) : null

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to update commitment')
      }

      await fetchCommitments()
      return true
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to update commitment'
      )
      return false
    } finally {
      setPendingActionId(null)
    }
  }

  const deleteCommitment = async (commitment: Commitment) => {
    const confirmed = window.confirm(
      `Delete "${commitment.title}" permanently? This cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    setActionError(null)
    setPendingActionId(commitment.id)

    try {
      const response = await fetch(`/api/commitments/${commitment.id}`, {
        method: 'DELETE',
      })

      const text = await response.text()
      const data = text ? (JSON.parse(text) as { error?: string }) : null

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to delete commitment')
      }

      await fetchCommitments()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to delete commitment'
      )
    } finally {
      setPendingActionId(null)
    }
  }

  const openEditModal = (commitment: Commitment) => {
    setEditingCommitment(commitment)
    setEditForm({
      title: commitment.title,
      description: commitment.description ?? '',
      category: commitment.category,
      priority: commitment.priority,
      deadline: toDateTimeLocalValue(commitment.deadline),
    })
    setActionError(null)
  }

  const closeEditModal = () => {
    setEditingCommitment(null)
    setEditForm(null)
  }

  const saveEdit = async () => {
    if (!editingCommitment || !editForm) {
      return
    }

    if (editForm.title.trim().length === 0) {
      setActionError('Title is required')
      return
    }

    const success = await updateCommitment(editingCommitment.id, {
      title: editForm.title.trim(),
      description: editForm.description.trim() || null,
      category: editForm.category,
      priority: editForm.priority,
      deadline: editForm.deadline
        ? new Date(editForm.deadline).toISOString()
        : null,
    })

    if (success) {
      closeEditModal()
    }
  }

  const syncEmails = async () => {
    setSyncState({
      status: 'syncing',
      message: null,
    })

    try {
      const response = await fetch('/api/sync/gmail', {
        method: 'POST',
      })

      const text = await response.text()
      const data = text
        ? (JSON.parse(text) as {
            error?: string
            commitmentsFound?: number
          })
        : null

      if (!response.ok) {
        throw new Error(data?.error ?? 'Email sync failed')
      }

      setSyncState({
        status: 'success',
        message: `Found ${data?.commitmentsFound ?? 0} new commitments`,
      })

      await fetchCommitments()
    } catch (error) {
      setSyncState({
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Email sync failed',
      })
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilters({
      status: 'all',
      priority: 'all',
      category: 'all',
      risk: 'all',
    })
    setSortOption('deadline-nearest')
    setCurrentPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Commitments</p>
          <h3 className="text-2xl font-bold text-gray-900">
            {nonArchivedCommitments.length}
          </h3>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">High Priority</p>
          <h3 className="text-2xl font-bold text-gray-900">
            {
              nonArchivedCommitments.filter(
                (commitment) =>
                  commitment.priority === 'HIGH' ||
                  commitment.priority === 'CRITICAL'
              ).length
            }
          </h3>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">Active</p>
          <h3 className="text-2xl font-bold text-gray-900">
            {
              commitments.filter(
                (commitment) => commitment.status === 'ACTIVE'
              ).length
            }
          </h3>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-500">Completed</p>
          <h3 className="text-2xl font-bold text-gray-900">
            {
              commitments.filter(
                (commitment) => commitment.status === 'COMPLETED'
              ).length
            }
          </h3>
        </div>
      </div>

      {/* Upcoming Calendar Events */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          Upcoming Calendar Events
        </h3>

        {loadingCalendarEvents ? (
          <p className="text-gray-500">Loading calendar events...</p>
        ) : calendarEvents.length > 0 ? (
          <div className="space-y-3">
            {calendarEvents.map((event, index) => (
              <div
                key={index}
                className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">{event.title}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(event.date).toLocaleDateString()} • {event.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No upcoming calendar events.</p>
        )}
      </section>

      {/* Daily Summary Card */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Today&apos;s Summary</h3>
        <p className="text-gray-700">
          {dailySummary ? dailySummary.description : "Loading summary..."}
        </p>
      </section>

      {/* Notification Center */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Notification Center</h3>

        {loadingNotifications ? (
          <p className="text-gray-500">Loading notifications...</p>
        ) : notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="font-medium text-gray-900">{notification.title}</h4>
                  <div className="flex gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded border ${getNotificationPriorityBadgeClass(notification.priority)}`}
                    >
                      {notification.priority}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded border ${getNotificationTypeBadgeClass(notification.type)}`}
                    >
                      {notification.type}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{notification.description}</p>
                <p className="text-xs text-gray-400">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No notifications.</p>
        )}
      </section>

      {/* AI Insights */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">AI Insights</h3>

        {loadingInsights ? (
          <p className="text-gray-500">Generating insights...</p>
        ) : insights.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {insights.map((insight, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h4 className="font-medium text-gray-900">{insight.title}</h4>
                  <span
                    className={`px-2 py-1 text-xs rounded border ${getInsightPriorityBadgeClass(insight.priority)}`}
                  >
                    {insight.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{insight.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Unable to generate insights right now.</p>
        )}
      </section>

      {/* Today's Focus */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">
          Today&apos;s Focus
        </h3>

        {commitments.filter(
          (c) => c.status === 'DISCOVERED' || c.status === 'ACTIVE'
        ).length === 0 ? (
          <p className="text-gray-500">
            No discovered or active commitments need attention right now.
          </p>
        ) : (
          <div className="space-y-3">
            {commitments
              .filter(
                (c) => c.status === 'DISCOVERED' || c.status === 'ACTIVE'
              )
              .sort((a, b) => {
                const priorityDiff =
                  PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
                if (priorityDiff !== 0) return priorityDiff
                if (!a.deadline) return 1
                if (!b.deadline) return -1
                return (
                  new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
                )
              })
              .slice(0, 5)
              .map((commitment) => (
                <div
                  key={commitment.id}
                  className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {commitment.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {commitment.category} · {formatDeadline(commitment.deadline)}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-1 text-xs rounded border ${getPriorityBadgeClass(
                      commitment.priority
                    )}`}
                  >
                    {commitment.priority}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Sync Button */}
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={syncEmails}
          disabled={syncState.status === 'syncing'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors font-medium"
        >
          {syncState.status === 'syncing' ? 'Syncing...' : 'Sync Emails'}
        </button>

        {syncState.message && (
          <p
            className={
              syncState.status === 'error'
                ? 'text-sm text-red-700'
                : 'text-sm text-green-700'
            }
          >
            {syncState.message}
          </p>
        )}
      </div>

      {/* Commitments Section */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Toolbar: Search, Filters, Sort */}
        <div className="space-y-4 mb-6">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search commitments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    status: e.target.value as CommitmentStatus | 'all',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">All</option>
                <option value="DISCOVERED">DISCOVERED</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="MISSED">MISSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    priority: e.target.value as CommitmentPriority | 'all',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">All</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    category: e.target.value as CommitmentCategory | 'all',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="all">All</option>
                <option value="ACADEMIC">ACADEMIC</option>
                <option value="CAREER">CAREER</option>
                <option value="PERSONAL">PERSONAL</option>
                <option value="FINANCE">FINANCE</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="deadline-nearest">Deadline (Nearest First)</option>
                <option value="deadline-furthest">Deadline (Furthest First)</option>
                <option value="priority-desc">Priority (Highest First)</option>
                <option value="priority-asc">Priority (Lowest First)</option>
                <option value="risk-desc">Risk (Highest First)</option>
                <option value="risk-asc">Risk (Lowest First)</option>
                <option value="created-newest">Created (Newest First)</option>
                <option value="created-oldest">Created (Oldest First)</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="flex justify-start">
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Filters & Sort
            </button>
          </div>
        </div>

        {/* Error Message */}
        {actionError && (
          <p className="mb-4 text-sm text-red-700">{actionError}</p>
        )}

        {/* Loading State */}
        {loadingCommitments ? (
          <p className="text-gray-500">Loading commitments...</p>
        ) : listError ? (
          <p className="text-red-700">{listError}</p>
        ) : paginatedCommitments.length === 0 ? (
          <p className="text-gray-500">
            No commitments in this view yet.
          </p>
        ) : (
          <>
            {/* Commitments Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {paginatedCommitments.map((commitment) => {
                const isPending = pendingActionId === commitment.id
                const riskLevel = getRiskLevel(commitment.riskScore)

                return (
                  <article
                    key={commitment.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h4 className="font-medium text-gray-900 flex-1">
                        {commitment.title}
                      </h4>

                      <span
                        className={`px-2 py-1 text-xs rounded border shrink-0 ${statusBadgeClass(
                          commitment.status
                        )}`}
                      >
                        {commitment.status}
                      </span>
                    </div>

                    {commitment.description && (
                      <p className="mb-3 text-sm text-gray-600 line-clamp-2">
                        {commitment.description}
                      </p>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span
                        className={`px-2 py-1 text-xs rounded border ${getPriorityBadgeClass(
                          commitment.priority
                        )}`}
                      >
                        {commitment.priority}
                      </span>

                      <span className="px-2 py-1 text-xs rounded border bg-white text-gray-700 border-gray-200">
                        {commitment.category}
                      </span>

                      <span
                        className={`px-2 py-1 text-xs rounded border ${getRiskBadgeClass(
                          riskLevel
                        )}`}
                      >
                        {riskLevel}: {commitment.riskScore}
                      </span>
                    </div>

                    {/* Deadline */}
                    <p className="text-xs text-gray-500 mb-4">
                      Deadline: {formatDeadline(commitment.deadline)}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {commitment.status === 'DISCOVERED' && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            updateCommitment(commitment.id, { status: 'ACTIVE' })
                          }
                          className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                        >
                          Activate
                        </button>
                      )}

                      {(commitment.status === 'DISCOVERED' ||
                        commitment.status === 'ACTIVE') && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            updateCommitment(commitment.id, {
                              status: 'COMPLETED',
                            })
                          }
                          className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50 transition-colors font-medium"
                        >
                          Complete
                        </button>
                      )}

                      {commitment.status !== 'ARCHIVED' && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            updateCommitment(commitment.id, {
                              status: 'ARCHIVED',
                            })
                          }
                          className="px-3 py-1.5 text-xs rounded-lg border border-yellow-500 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 transition-colors font-medium"
                        >
                          Archive
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => openEditModal(commitment)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-50 transition-colors font-medium"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => deleteCommitment(commitment)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Previous
                </button>

                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Edit Modal */}
      {editingCommitment && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Commitment
              </h3>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Title</span>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Description
                </span>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Category
                  </span>
                  <select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        category: e.target.value as CommitmentCategory,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="ACADEMIC">Academic</option>
                    <option value="CAREER">Career</option>
                    <option value="PERSONAL">Personal</option>
                    <option value="FINANCE">Finance</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Priority
                  </span>
                  <select
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        priority: e.target.value as CommitmentPriority,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Deadline
                </span>
                <input
                  type="datetime-local"
                  value={editForm.deadline}
                  onChange={(e) =>
                    setEditForm({ ...editForm, deadline: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pendingActionId === editingCommitment.id}
                onClick={saveEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
