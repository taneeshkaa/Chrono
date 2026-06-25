'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

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
}

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

function getRiskLevel(score: number): RiskLevel {
  if (score < 25) return 'LOW'
  if (score < 50) return 'MEDIUM'
  if (score < 75) return 'HIGH'
  return 'CRITICAL'
}

function getRiskLevelClass(level: RiskLevel): string {
  switch (level) {
    case 'LOW':
      return 'bg-green-100 text-green-800'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800'
    case 'CRITICAL':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

type SyncState = {
  status: 'idle' | 'syncing' | 'success' | 'error'
  message: string | null
}

type FilterTab = 'all' | 'active' | 'completed' | 'archived'

type EditFormState = {
  title: string
  description: string
  category: CommitmentCategory
  priority: CommitmentPriority
  deadline: string
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

function formatDeadline(deadline: string | null) {
  if (!deadline) {
    return 'No deadline'
  }

  return new Date(deadline).toLocaleString()
}

function toDateTimeLocalValue(deadline: string | null) {
  if (!deadline) {
    return ''
  }

  const date = new Date(deadline)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)

  return local.toISOString().slice(0, 16)
}

function filterByTab(commitments: Commitment[], tab: FilterTab) {
  switch (tab) {
    case 'all':
      return commitments.filter((commitment) => commitment.status !== 'ARCHIVED')
    case 'active':
      return commitments.filter((commitment) => commitment.status === 'ACTIVE')
    case 'completed':
      return commitments.filter(
        (commitment) => commitment.status === 'COMPLETED',
      )
    case 'archived':
      return commitments.filter(
        (commitment) => commitment.status === 'ARCHIVED',
      )
    default:
      return commitments
  }
}

function sortTodaysFocus(commitments: Commitment[]) {
  return [...commitments].sort((left, right) => {
    const priorityDiff =
      PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]

    if (priorityDiff !== 0) {
      return priorityDiff
    }

    if (!left.deadline && !right.deadline) {
      return 0
    }

    if (!left.deadline) {
      return 1
    }

    if (!right.deadline) {
      return -1
    }

    return (
      new Date(left.deadline).getTime() - new Date(right.deadline).getTime()
    )
  })
}

function statusBadgeClass(status: CommitmentStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800'
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800'
    case 'ARCHIVED':
      return 'bg-yellow-100 text-yellow-800'
    case 'DISCOVERED':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-white text-gray-700'
  }
}

export function DashboardCommitments() {
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [loadingCommitments, setLoadingCommitments] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [editingCommitment, setEditingCommitment] = useState<Commitment | null>(
    null,
  )
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    message: null,
  })

  const fetchCommitments = useCallback(async () => {
    setListError(null)

    try {
      const response = await fetch('/api/commitments')
      const text = await response.text()
      const data = text ? JSON.parse(text) as Commitment[] | { error?: string } : null

      if (!response.ok) {
        throw new Error(
          data && 'error' in data && data.error
            ? data.error
            : 'Failed to load commitments',
        )
      }

      setCommitments(Array.isArray(data) ? data : [])
    } catch (error) {
      setListError(
        error instanceof Error
          ? error.message
          : 'Failed to load commitments',
      )
    } finally {
      setLoadingCommitments(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCommitments()
  }, [fetchCommitments])

  const nonArchivedCommitments = useMemo(
    () =>
      commitments.filter((commitment) => commitment.status !== 'ARCHIVED'),
    [commitments],
  )

  const filteredCommitments = useMemo(
    () => filterByTab(commitments, activeTab),
    [commitments, activeTab],
  )

  const todaysFocus = useMemo(
    () =>
      sortTodaysFocus(
        commitments.filter(
          (commitment) =>
            commitment.status === 'DISCOVERED' ||
            commitment.status === 'ACTIVE',
        ),
      ).slice(0, 5),
    [commitments],
  )

  const updateCommitment = async (
    id: string,
    body: Record<string, string | null>,
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
      const data = text ? JSON.parse(text) as { error?: string } : null

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to update commitment')
      }

      await fetchCommitments()
      return true
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Failed to update commitment',
      )
      return false
    } finally {
      setPendingActionId(null)
    }
  }

  const deleteCommitment = async (commitment: Commitment) => {
    const confirmed = window.confirm(
      `Delete "${commitment.title}" permanently? This cannot be undone.`,
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
      const data = text ? JSON.parse(text) as { error?: string } : null

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to delete commitment')
      }

      await fetchCommitments()
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Failed to delete commitment',
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
      const data = text ? JSON.parse(text) as {
        error?: string
        commitmentsFound?: number
      } : null

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
          error instanceof Error
            ? error.message
            : 'Email sync failed',
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Commitments</p>
          <h3 className="text-2xl font-bold">{nonArchivedCommitments.length}</h3>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">High Priority</p>
          <h3 className="text-2xl font-bold">
            {
              nonArchivedCommitments.filter(
                (commitment) =>
                  commitment.priority === 'HIGH' ||
                  commitment.priority === 'CRITICAL',
              ).length
            }
          </h3>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Active</p>
          <h3 className="text-2xl font-bold">
            {
              commitments.filter(
                (commitment) => commitment.status === 'ACTIVE',
              ).length
            }
          </h3>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <h3 className="text-2xl font-bold">
            {
              commitments.filter(
                (commitment) => commitment.status === 'COMPLETED',
              ).length
            }
          </h3>
        </div>
      </div>

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Today&apos;s Focus</h3>

        {todaysFocus.length === 0 ? (
          <p className="text-gray-500">
            No discovered or active commitments need attention right now.
          </p>
        ) : (
          <div className="space-y-3">
            {todaysFocus.map((commitment) => (
              <div
                key={commitment.id}
                className="flex items-center justify-between border rounded-lg p-3"
              >
                <div>
                  <p className="font-medium">{commitment.title}</p>
                  <p className="text-sm text-gray-500">
                    {commitment.category} · {formatDeadline(commitment.deadline)}
                  </p>
                </div>

                <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">
                  {commitment.priority}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={syncEmails}
          disabled={syncState.status === 'syncing'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors"
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

      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Commitments</h3>

          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={
                  activeTab === tab.id
                    ? 'px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white'
                    : 'px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50'
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {actionError && (
          <p className="mb-4 text-sm text-red-700">{actionError}</p>
        )}

        {loadingCommitments ? (
          <p className="text-gray-500">Loading commitments...</p>
        ) : listError ? (
          <p className="text-red-700">{listError}</p>
        ) : filteredCommitments.length === 0 ? (
          <p className="text-gray-500">
            No commitments in this view yet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredCommitments.map((commitment) => {
              const isPending = pendingActionId === commitment.id

              return (
                <article
                  key={commitment.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-medium text-gray-900">
                      {commitment.title}
                    </h4>

                    <span
                      className={`px-2 py-1 text-xs rounded ${statusBadgeClass(commitment.status)}`}
                    >
                      {commitment.status}
                    </span>
                  </div>

                  {commitment.description && (
                    <p className="mt-2 text-sm text-gray-600">
                      {commitment.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-white text-gray-700 rounded border border-gray-200">
                      {commitment.category}
                    </span>

                    <span className="px-2 py-1 bg-white text-gray-700 rounded border border-gray-200">
                      {commitment.priority}
                    </span>

                    <span className={`px-2 py-1 rounded ${getRiskLevelClass(getRiskLevel(commitment.riskScore))}`}>
                      {getRiskLevel(commitment.riskScore)}: {commitment.riskScore}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mt-3">
                    Deadline: {formatDeadline(commitment.deadline)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {commitment.status === 'DISCOVERED' && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          updateCommitment(commitment.id, { status: 'ACTIVE' })
                        }
                        className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
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
                        className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50"
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
                        className="px-3 py-1.5 text-xs rounded-lg border border-yellow-500 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
                      >
                        Archive
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => openEditModal(commitment)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => deleteCommitment(commitment)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

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
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm text-gray-700">Title</span>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm({ ...editForm, title: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-sm text-gray-700">Description</span>
                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      description: event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm text-gray-700">Category</span>
                  <select
                    value={editForm.category}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        category: event.target.value as CommitmentCategory,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="ACADEMIC">Academic</option>
                    <option value="CAREER">Career</option>
                    <option value="PERSONAL">Personal</option>
                    <option value="FINANCE">Finance</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm text-gray-700">Priority</span>
                  <select
                    value={editForm.priority}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        priority: event.target.value as CommitmentPriority,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm text-gray-700">Deadline</span>
                <input
                  type="datetime-local"
                  value={editForm.deadline}
                  onChange={(event) =>
                    setEditForm({ ...editForm, deadline: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pendingActionId === editingCommitment.id}
                onClick={saveEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
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
