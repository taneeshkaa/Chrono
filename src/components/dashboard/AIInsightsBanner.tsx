'use client'

import { AlertTriangle, TrendingUp, Calendar, Zap, ChevronRight } from 'lucide-react'

interface AIInsightsBannerProps {
  insights: {
    criticalRisks: number
    timeConflicts: number
    upcomingDeadlines: number
    optimizationOpportunities: number
  }
}

export default function AIInsightsBanner({ insights }: AIInsightsBannerProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">AI Insights</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">Real-time analysis of your commitments</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Critical Risks */}
          {insights.criticalRisks > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-lg">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              <span className="text-xs font-medium text-rose-700 dark:text-rose-300">
                {insights.criticalRisks} critical risk{insights.criticalRisks !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Time Conflicts */}
          {insights.timeConflicts > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg">
              <Calendar className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                {insights.timeConflicts} time conflict{insights.timeConflicts !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Optimization Opportunities */}
          {insights.optimizationOpportunities > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {insights.optimizationOpportunities} optimization{insights.optimizationOpportunities !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          <button className="flex items-center space-x-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
            <span>View details</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}