import React from 'react'
import {
  BrainCircuit,
  Sparkles,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Clock,
  AlertTriangle,
  RefreshCw,
  Award,
  Zap,
  Activity
} from 'lucide-react'
import type { SimulationResult, FutureTimelineEvent } from '@/types/simulation'

interface FutureOutlookProps {
  data: SimulationResult | null
  loading: boolean
  error: boolean
  onRetry: () => void
}

export default function FutureOutlook({
  data,
  loading,
  error,
  onRetry
}: FutureOutlookProps) {
  
  // Format Date to "JULY 10" or "TODAY"
  const formatTimelineDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      
      const isToday =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
        
      if (isToday) {
        return 'TODAY'
      }
      
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase()
    } catch (e) {
      return 'UPCOMING'
    }
  }

  // Get severity style for badges
  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/50'
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/50'
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50'
      case 'LOW':
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
    }
  }

  // Get type badge classes
  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'WARNING':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
      case 'DEADLINE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
      case 'CONSEQUENCE':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
      case 'PREDICTION':
      default:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
    }
  }

  // Skeleton Loader implementation
  if (loading) {
    return (
      <div className="space-y-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Skeleton Hero Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            </div>
            <div className="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="space-y-2 pt-2">
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
          </div>

          {/* Skeleton Most At Risk Commitment */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            </div>
            <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="space-y-2">
              <div className="h-3 w-5/6 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
          </div>

          {/* Skeleton Reliability Profile */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
          </div>
        </div>

        {/* Skeleton Timeline */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm animate-pulse space-y-4">
          <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded mt-1"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded mt-1"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error State implementation
  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Simulation Engine Offline</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Unable to load future outlook.</p>
          </div>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors text-sm font-semibold cursor-pointer shadow-md shadow-rose-500/10 animate-fade-in"
        >
          <RefreshCw className="h-4 w-4" />
          Retry simulation
        </button>
      </div>
    )
  }

  // Fallback for no data
  if (!data || !data.futureOutlook) {
    return null
  }

  const { futureOutlook, overallSuccessProbability } = data
  const mostAtRisk = data.predictions && data.predictions.length > 0 ? data.predictions[0] : null
  const reliability = futureOutlook.reliabilityProfile

  // Categories helper to map scores
  const categoryKeys = ['academic', 'career', 'personal', 'finance']

  return (
    <div className="space-y-6 mb-6">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <BrainCircuit className="h-4.5 w-4.5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">Future Outlook Simulation</h2>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Simulated: {new Date(data.simulatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* SECTION 1: Future Outlook Hero Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300">
            <BrainCircuit className="h-32 w-32 -mr-6 -mt-6" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Future Health</span>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                futureOutlook.futureHealth === 'HEALTHY'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/50'
                  : futureOutlook.futureHealth === 'WATCHLIST'
                  ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/50'
                  : futureOutlook.futureHealth === 'AT_RISK'
                  ? 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-900/50'
                  : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/50'
              }`}>
                {futureOutlook.futureHealth}
              </span>
            </div>

            <div className="mb-4">
              <h3 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                {Math.round(overallSuccessProbability * 100)}%
              </h3>
              <p className="text-xs text-slate-500 mt-1">Overall Success Probability</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-start gap-2 bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100 dark:border-indigo-950 p-3 rounded-xl">
              <Sparkles className="h-4.5 w-4.5 text-indigo-500 mt-0.5 shrink-0 animate-pulse" />
              <div>
                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Recommended Action</p>
                <p className="text-xs text-slate-800 dark:text-slate-200 font-medium mt-0.5">{futureOutlook.recommendedAction}</p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Most At Risk Commitment */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between group">
          {mostAtRisk ? (
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-rose-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="h-4 w-4" /> At Risk Commitment
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getSeverityBadgeClass(mostAtRisk.consequenceAnalysis.impactLevel)}`}>
                    {mostAtRisk.consequenceAnalysis.impactLevel} IMPACT
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">
                  {mostAtRisk.title}
                </h3>
                
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                    {Math.round(mostAtRisk.failureProbability * 100)}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Failure Probability</span>
                </div>

                <div className="space-y-3">
                  {/* Risk Factors */}
                  {mostAtRisk.riskFactors.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Risk Factors</p>
                      <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-0.5 pl-0.5">
                        {mostAtRisk.riskFactors.slice(0, 2).map((factor, idx) => (
                          <li key={idx} className="line-clamp-1 truncate">{factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Consequences */}
                  {mostAtRisk.consequenceAnalysis.consequences.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Consequences</p>
                      <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-0.5 pl-0.5">
                        {mostAtRisk.consequenceAnalysis.consequences.slice(0, 2).map((consequence, idx) => (
                          <li key={idx} className="line-clamp-1 truncate">{consequence}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-6 text-slate-500 text-center">
              <ShieldAlert className="h-8 w-8 opacity-20 mb-2 text-slate-400" />
              <p className="text-xs font-semibold">No critical risk commitment found.</p>
              <p className="text-[10px] opacity-75 mt-0.5">All tracked active tasks are performing well.</p>
            </div>
          )}
        </div>

        {/* SECTION 3: Reliability Profile */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Reliability Profile</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border flex items-center gap-1 ${
                reliability.trend === 'IMPROVING'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/50'
                  : reliability.trend === 'DECLINING'
                  ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/50'
                  : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
              }`}>
                {reliability.trend === 'IMPROVING' && <TrendingUp className="h-3 w-3 animate-bounce" />}
                {reliability.trend === 'DECLINING' && <TrendingDown className="h-3 w-3" />}
                {reliability.trend === 'STABLE' && <Minus className="h-3 w-3" />}
                {reliability.trend}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <h3 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                {reliability.overallScore}%
              </h3>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Overall Reliability</span>
            </div>

            {/* Category Scores */}
            <div className="space-y-2">
              {categoryKeys.map((category) => {
                const score = reliability.categoryScores[category] ?? 50
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-slate-600 dark:text-slate-400 capitalize">{category}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{score}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          score >= 75
                            ? 'bg-emerald-500'
                            : score >= 50
                            ? 'bg-blue-500'
                            : score >= 35
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9px] font-bold text-slate-450 dark:text-slate-550">
            <div>
              STRONG: <span className="text-emerald-500 uppercase">{reliability.strongestCategory ?? 'NONE'}</span>
            </div>
            <div>
              WEAK: <span className="text-rose-500 uppercase">{reliability.weakestCategory ?? 'NONE'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Future Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-1.5">
          <Calendar className="h-4.5 w-4.5 text-indigo-500" /> Projected Future Timeline
        </h3>

        {futureOutlook.timeline && futureOutlook.timeline.length > 0 ? (
          <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-6">
            {futureOutlook.timeline.map((event: FutureTimelineEvent, idx: number) => (
              <div key={idx} className="relative group">
                {/* Timeline Dot Indicator */}
                <span className={`absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ring-4 ring-white dark:ring-slate-900 ${
                  event.type === 'WARNING'
                    ? 'bg-orange-500'
                    : event.type === 'DEADLINE'
                    ? 'bg-blue-500'
                    : event.type === 'CONSEQUENCE'
                    ? 'bg-rose-500'
                    : 'bg-purple-500'
                }`}></span>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 bg-slate-50/20 dark:bg-slate-900/10 hover:border-slate-200 dark:hover:border-slate-800 transition-colors">
                  <div className="space-y-1.5">
                    {/* Event Metadata row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-extrabold tracking-wider text-slate-500 dark:text-slate-400">
                        {formatTimelineDate(event.date)}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${getTypeBadgeClass(event.type)}`}>
                        {event.type}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${getSeverityBadgeClass(event.severity)}`}>
                        {event.severity}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-955 dark:text-white">
                      {event.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-450">
                      {event.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Calendar className="h-8 w-8 opacity-20 mx-auto mb-2" />
            <p className="text-xs font-semibold">Timeline clear.</p>
            <p className="text-[10px] opacity-75 mt-0.5">No upcoming scheduling warnings or deadlines detected.</p>
          </div>
        )}
      </div>
    </div>
  )
}
