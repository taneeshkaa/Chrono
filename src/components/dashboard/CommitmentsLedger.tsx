'use client'

import { Calendar, Clock, AlertTriangle, CheckCircle, MoreVertical } from 'lucide-react'
import { useState } from 'react'

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
}

export default function CommitmentsLedger({ commitments }: CommitmentsLedgerProps) {
  const [selectedCommitment, setSelectedCommitment] = useState<string | null>(null)

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

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Commitments Ledger</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {commitments.length} commitments in your workspace
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
            Today
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
            This Week
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
            All
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {commitments.map((commitment) => {
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
                <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <MoreVertical className="h-4 w-4 text-slate-400" />
                </button>
              </div>
            </div>
          )
        })}

        {commitments.length === 0 && (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-slate-400 dark:text-slate-600" />
            </div>
            <h4 className="text-lg font-medium text-slate-900 dark:text-white mb-2">All caught up</h4>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Your commitments ledger is empty. All extracted commitments are properly scheduled and managed.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}