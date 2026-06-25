'use client'

import { AlertTriangle, CheckCircle, Clock, Calendar, TrendingUp } from 'lucide-react'

interface TodaysFocusProps {
  commitment: {
    id: string
    title: string
    description?: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    status: string
    deadline?: string
    riskScore: number
    estimatedEffort?: number
  }
}

export default function TodaysFocus({ commitment }: TodaysFocusProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800 text-rose-700 dark:text-rose-300'
      case 'HIGH':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-300'
      case 'MEDIUM':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300'
      default:
        return 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300'
    }
  }

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 80) {
      return {
        color: 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800',
        text: 'High Risk',
        icon: <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
      }
    } else if (riskScore >= 50) {
      return {
        color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800',
        text: 'Medium Risk',
        icon: <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      }
    } else {
      return {
        color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800',
        text: 'Low Risk',
        icon: <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
      }
    }
  }

  const riskBadge = getRiskBadge(commitment.riskScore)

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Today&apos;s Focus</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">Your highest priority commitment</p>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
            {commitment.title}
          </h1>
          {commitment.description && (
            <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-2xl">
              {commitment.description}
            </p>
          )}
        </div>
        <div className={`px-4 py-2 rounded-lg border ${getPriorityColor(commitment.priority)}`}>
          <span className="font-semibold text-sm">{commitment.priority}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {/* Risk Indicator */}
        <div className={`p-4 rounded-xl border ${riskBadge.color}`}>
          <div className="flex items-center space-x-3">
            {riskBadge.icon}
            <div>
              <p className="text-sm font-medium">Risk Assessment</p>
              <p className="text-2xl font-bold mt-1">{commitment.riskScore}%</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{riskBadge.text}</p>
            </div>
          </div>
        </div>

        {/* Deadline */}
        {commitment.deadline && (
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Deadline</p>
                <p className="text-lg font-semibold mt-1">
                  {new Date(commitment.deadline).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {new Date(commitment.deadline).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Estimated Effort */}
        {commitment.estimatedEffort && (
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Estimated Effort</p>
                <p className="text-lg font-semibold mt-1">{commitment.estimatedEffort} min</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Focus time needed</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors">
          Start Working
        </button>
        <button className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium rounded-xl transition-colors">
          Reschedule
        </button>
        <button className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium rounded-xl transition-colors">
          Delegate
        </button>
      </div>
    </div>
  )
}