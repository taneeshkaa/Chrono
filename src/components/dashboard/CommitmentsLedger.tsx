'use client'

import { Calendar, Clock, AlertTriangle, CheckCircle, MoreVertical } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Commitment {
  id: string
  title: string
  category: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: string
  deadline?: string
  riskScore: number
  estimatedEffort?: number
}

interface CommitmentsLedgerProps {
  commitments: Commitment[]
  onRefresh?: () => void
}

export default function CommitmentsLedger({ commitments, onRefresh }: CommitmentsLedgerProps) {
  const [selectedCommitment, setSelectedCommitment] = useState<string | null>(null)
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('all')
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  useEffect(() => {
    const closeMenu = () => setActiveMenuId(null)
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [])

  const handleUpdateStatus = async (id: string, status: string) => {
    setActiveMenuId(null)
    try {
      const res = await fetch(`/api/commitments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    setActiveMenuId(null)
    if (!confirm('Are you sure you want to delete this commitment?')) return
    try {
      const res = await fetch(`/api/commitments/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete commitment')
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error(err)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-rose-600 dark:text-rose-400'
      case 'HIGH':
        return 'text-amber-600 dark:text-amber-400'
      case 'MEDIUM':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-slate-600 dark:text-slate-400'
    }
  }

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 80) {
      return {
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        border: 'border-rose-100 dark:border-rose-800',
        text: 'text-rose-700 dark:text-rose-300',
        label: 'High Risk',
      }
    } else if (riskScore >= 50) {
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-100 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-300',
        label: 'Medium Risk',
      }
    } else {
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-100 dark:border-emerald-800',
        text: 'text-emerald-700 dark:text-emerald-300',
        label: 'Low Risk',
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <div className="h-2 w-2 rounded-full bg-blue-500"></div>
      case 'AT_RISK':
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
      case 'COMPLETED':
        return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
      default:
        return <div className="h-2 w-2 rounded-full bg-slate-400"></div>
    }
  }

  const filteredCommitments = commitments.filter((c) => {
    if (filter === 'all') return true
    if (!c.deadline) return false
    
    const d = new Date(c.deadline)
    const now = new Date()
    
    if (filter === 'today') {
      const isSameDay = d.getDate() === now.getDate() && 
                        d.getMonth() === now.getMonth() && 
                        d.getFullYear() === now.getFullYear()
      const isPastDueAndActive = d < now && (c.status === 'ACTIVE' || c.status === 'AT_RISK')
      return isSameDay || isPastDueAndActive
    }
    
    if (filter === 'week') {
      const diffTime = d.getTime() - now.getTime()
      const diffDays = diffTime / (1000 * 60 * 60 * 24)
      const isWithinNext7Days = diffDays >= -1 && diffDays <= 7
      const isPastDueAndActive = d < now && (c.status === 'ACTIVE' || c.status === 'AT_RISK')
      return isWithinNext7Days || isPastDueAndActive
    }
    
    return true
  })

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Commitments Ledger</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {filteredCommitments.length} commitments listed
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setFilter('today')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              filter === 'today'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Today
          </button>
          <button 
            onClick={() => setFilter('week')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              filter === 'week'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            This Week
          </button>
          <button 
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            All
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredCommitments.map((commitment) => {
          const riskBadge = getRiskBadge(commitment.riskScore)
          const isSelected = selectedCommitment === commitment.id

          return (
            <div
              key={commitment.id}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10'
                  : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
              }`}
              onClick={() => setSelectedCommitment(commitment.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(commitment.status)}
                    <span className={`text-xs font-medium ${getPriorityColor(commitment.priority)}`}>
                      {commitment.priority}
                    </span>
                    <div className={`text-xs px-2 py-0.5 rounded-full ${riskBadge.bg} ${riskBadge.border} ${riskBadge.text}`}>
                      {riskBadge.label}
                    </div>
                  </div>
                  <h4 className="font-medium text-slate-900 dark:text-white">{commitment.title}</h4>
                  <div className="flex items-center space-x-4 mt-3">
                    <div className="flex items-center space-x-1 text-sm text-slate-500 dark:text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{commitment.category}</span>
                    </div>
                    {commitment.deadline && (
                      <div className="flex items-center space-x-1 text-sm text-slate-500 dark:text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {new Date(commitment.deadline).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                    {commitment.estimatedEffort && (
                      <div className="flex items-center space-x-1 text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-medium">{commitment.estimatedEffort} min</span>
                        <span>estimated</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveMenuId(activeMenuId === commitment.id ? null : commitment.id)
                    }}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <MoreVertical className="h-4 w-4 text-slate-400" />
                  </button>
                  {activeMenuId === commitment.id && (
                    <div 
                      className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 py-1 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {commitment.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleUpdateStatus(commitment.id, 'COMPLETED')}
                          className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-1.5 cursor-pointer"
                        >
                          Mark Completed
                        </button>
                      )}
                      {commitment.status !== 'ACTIVE' && (
                        <button
                          onClick={() => handleUpdateStatus(commitment.id, 'ACTIVE')}
                          className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-1.5 cursor-pointer"
                        >
                          Mark Active
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(commitment.id)}
                        className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-1.5 cursor-pointer font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {filteredCommitments.length === 0 && (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-slate-400 dark:text-slate-600" />
            </div>
            <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No commitments</h4>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              No commitments found matching this filter.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}