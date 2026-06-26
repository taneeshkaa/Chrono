import React, { useState, useEffect } from 'react'
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
  HelpCircle,
  AlertCircle
} from 'lucide-react'
import type { SimulationResult, FutureTimelineEvent, WhatIfSimulationResult } from '@/types/simulation'

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
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string>('')
  const [selectedAction, setSelectedAction] = useState<'COMPLETE' | 'IGNORE'>('COMPLETE')
  const [simResult, setSimResult] = useState<WhatIfSimulationResult | null>(null)
  const [simLoading, setSimLoading] = useState<boolean>(false)
  const [simError, setSimError] = useState<string | null>(null)

  // Reset selected commitment ID if predictions list changes or item is no longer active
  useEffect(() => {
    if (data?.predictions && data.predictions.length > 0) {
      const exists = data.predictions.some(p => p.commitmentId === selectedCommitmentId)
      if (!selectedCommitmentId || !exists) {
        setSelectedCommitmentId(data.predictions[0].commitmentId)
      }
    } else {
      setSelectedCommitmentId('')
      setSimResult(null)
    }
  }, [data?.predictions, selectedCommitmentId])

  // Run What-If Simulation
  useEffect(() => {
    if (!selectedCommitmentId) {
      setSimResult(null)
      return
    }

    const runWhatIf = async () => {
      setSimLoading(true)
      setSimError(null)
      try {
        const res = await fetch('/api/simulation/what-if', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: selectedAction,
            commitmentId: selectedCommitmentId
          })
        })
        
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error ?? 'Simulation failed')
        }
        
        const result = await res.json()
        setSimResult(result)
      } catch (err: any) {
        console.error(err)
        setSimError(err.message ?? 'Failed to run what-if simulation')
      } finally {
        setSimLoading(false)
      }
    }

    runWhatIf()
  }, [selectedCommitmentId, selectedAction])

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
        return 'bg-orange-100 text-orange-850 dark:bg-orange-950/40 dark:text-orange-300'
      case 'DEADLINE':
        return 'bg-blue-100 text-blue-850 dark:bg-blue-950/40 dark:text-blue-300'
      case 'CONSEQUENCE':
        return 'bg-rose-100 text-rose-850 dark:bg-rose-950/40 dark:text-rose-300'
      case 'PREDICTION':
      default:
        return 'bg-purple-100 text-purple-850 dark:bg-purple-950/40 dark:text-purple-300'
    }
  }

  // Get Success Probability Level display settings (TASK 2)
  const getSuccessProbabilityLevel = (prob: number) => {
    const pct = Math.round(prob * 100)
    if (pct <= 10) {
      return {
        label: 'Very Low',
        colorClass: 'text-rose-600 dark:text-rose-450',
        cardBorder: 'hover:border-rose-300 dark:hover:border-rose-850',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/45 dark:text-rose-300'
      }
    }
    if (pct <= 25) {
      return {
        label: 'Low',
        colorClass: 'text-orange-600 dark:text-orange-450',
        cardBorder: 'hover:border-orange-300 dark:hover:border-orange-850',
        badgeBg: 'bg-orange-50 text-orange-700 border-orange-250 dark:bg-orange-950/45 dark:text-orange-300'
      }
    }
    if (pct <= 50) {
      return {
        label: 'Moderate',
        colorClass: 'text-amber-600 dark:text-amber-450',
        cardBorder: 'hover:border-amber-300 dark:hover:border-amber-850',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/45 dark:text-amber-300'
      }
    }
    if (pct <= 75) {
      return {
        label: 'Good',
        colorClass: 'text-blue-600 dark:text-blue-450',
        cardBorder: 'hover:border-blue-300 dark:hover:border-blue-850',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-250 dark:bg-blue-950/45 dark:text-blue-300'
      }
    }
    return {
      label: 'Strong',
      colorClass: 'text-emerald-600 dark:text-emerald-450',
      cardBorder: 'hover:border-emerald-300 dark:hover:border-emerald-850',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/45 dark:text-emerald-300'
    }
  }

  // Generate dynamic Future Outlook Narrative (TASK 1 & 7)
  const generateFutureNarrative = (data: SimulationResult) => {
    const { futureOutlook, predictions } = data
    const health = futureOutlook.futureHealth
    const mostAtRisk = predictions && predictions.length > 0 ? predictions[0] : null

    if (!predictions || predictions.length === 0) {
      return {
        intro: "Future Outlook is clear.",
        consequenceText: "No active commitments are currently creating future risk.",
        healthStatus: "Your future outlook is currently HEALTHY.",
        recommendation: "Keep maintaining your schedule consistency!"
      }
    }

    if (!mostAtRisk) {
      return {
        intro: "Future Outlook is clear.",
        consequenceText: "Your active commitments are estimated to have extremely low failure rates.",
        healthStatus: "Your future outlook is currently HEALTHY.",
        recommendation: "All commitments are on track!"
      }
    }

    const title = mostAtRisk.title
    const consequences = mostAtRisk.consequenceAnalysis?.consequences || []
    
    // Intro sentence
    const intro = `Based on your current commitments, there is a high likelihood that "${title}" will be missed.`
    
    // Consequence sentence
    let consequenceText = ""
    if (consequences.length > 0) {
      if (consequences.length === 1) {
        consequenceText = `This may lead to ${consequences[0].toLowerCase()}.`
      } else {
        const c1 = consequences[0].toLowerCase().trim()
        const c2 = consequences[1].toLowerCase().trim()
        const cleanC1 = c1.endsWith('.') ? c1.slice(0, -1) : c1
        const cleanC2 = c2.endsWith('.') ? c2.slice(0, -1) : c2
        consequenceText = `This may lead to ${cleanC1} and ${cleanC2}.`
      }
    } else {
      consequenceText = "This may impact your coordinate schedules and timelines."
    }

    // Health Status sentence
    const healthStatus = `Your future outlook is currently ${health}.`

    // Recommendation sentence
    let recommendation = ""
    if (futureOutlook.recommendedAction) {
      const rec = futureOutlook.recommendedAction
      if (rec.toLowerCase().includes("complete")) {
        recommendation = `${rec} within the next 24 hours to improve your projected success rate.`
      } else {
        recommendation = `${rec} to bolster scheduling success rates.`
      }
    } else {
      recommendation = `Completing "${title}" immediately would improve your projected success rate.`
    }

    return {
      intro,
      consequenceText,
      healthStatus,
      recommendation
    }
  }

  // Generate reliability insights (TASK 6)
  const generateReliabilityInsight = (strongest: string | null, weakest: string | null) => {
    if (!strongest && !weakest) {
      return "No historical commitments found to evaluate reliability category insights."
    }

    const strongestLabel = strongest ? strongest.toLowerCase() : null
    const weakestLabel = weakest ? weakest.toLowerCase() : null

    if (strongestLabel && weakestLabel && strongestLabel !== weakestLabel) {
      return `Your ${strongestLabel} commitments show strong reliability while ${weakestLabel}-related commitments need attention.`
    }

    if (strongestLabel) {
      return `You consistently complete ${strongestLabel} commitments on time, showing excellent reliability.`
    }

    if (weakestLabel) {
      return `Your ${weakestLabel}-related commitments have been frequently delayed or missed and need focus.`
    }

    return "Your completion reliability is balanced evenly across all tracked categories."
  }

  // Shorten event title for grouped timelines (TASK 4)
  const getShortenedEventTitle = (event: FutureTimelineEvent, commitmentTitle: string): string => {
    const title = event.title
    const type = event.type
    
    if (type === 'WARNING' && title.toLowerCase().includes('risk increasing')) {
      return 'Risk increasing'
    }
    if (type === 'DEADLINE' && title.toLowerCase().includes('deadline approaching')) {
      return 'Deadline approaching'
    }
    if (type === 'PREDICTION' && title.toLowerCase().includes('likelihood of missing')) {
      return 'Predicted failure'
    }
    if (type === 'CONSEQUENCE' && title.toLowerCase().includes('consequence')) {
      return 'Potential consequence'
    }
    
    return title.replace(commitmentTitle, '').trim() || title
  }

  // Skeleton Loading states
  if (loading) {
    return (
      <div className="space-y-6 mb-6">
        <div className="flex items-center gap-2 mb-2 animate-pulse">
          <div className="h-5 w-5 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-6 w-56 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>

        {/* Narrative Card skeleton */}
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl animate-pulse space-y-3">
          <div className="h-4 w-40 bg-slate-250 dark:bg-slate-800 rounded"></div>
          <div className="h-3 w-5/6 bg-slate-250 dark:bg-slate-800 rounded"></div>
          <div className="h-3 w-4/6 bg-slate-250 dark:bg-slate-800 rounded"></div>
        </div>

        {/* Stats cards skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm space-y-3 animate-pulse">
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse"></div>
            <div className="h-48 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse"></div>
          </div>
          <div className="h-96 bg-slate-100 dark:bg-slate-900 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    )
  }

  // Error state UI
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
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors text-sm font-semibold cursor-pointer shadow-md shadow-rose-500/10"
        >
          <RefreshCw className="h-4 w-4" />
          Retry simulation
        </button>
      </div>
    )
  }

  // Fallback if no simulation data
  if (!data || !data.futureOutlook) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-sm text-center">
        <BrainCircuit className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3 animate-pulse" />
        <h3 className="font-bold text-slate-900 dark:text-white">No Simulation Data</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          We couldn't load any simulation predictions. Start adding active commitments to activate the simulation engine.
        </p>
      </div>
    )
  }

  const { futureOutlook, overallSuccessProbability } = data
  const mostAtRisk = data.predictions && data.predictions.length > 0 ? data.predictions[0] : null
  const reliability = futureOutlook.reliabilityProfile
  const categoryKeys = ['academic', 'career', 'personal', 'finance']

  // Group events by commitment title (TASK 4)
  const groupedTimeline: { commitmentTitle: string; events: FutureTimelineEvent[] }[] = []
  const groupMap = new Map<string, FutureTimelineEvent[]>()
  const unmatchedEvents: FutureTimelineEvent[] = []

  if (futureOutlook.timeline && futureOutlook.timeline.length > 0) {
    futureOutlook.timeline.forEach((event) => {
      // Find matching prediction by title check
      const matchingPred = data.predictions?.find(p => 
        event.title.toLowerCase().includes(p.title.toLowerCase()) || 
        event.description.toLowerCase().includes(p.title.toLowerCase())
      )

      if (matchingPred) {
        const titleKey = matchingPred.title
        if (!groupMap.has(titleKey)) {
          groupMap.set(titleKey, [])
        }
        groupMap.get(titleKey)!.push(event)
      } else {
        unmatchedEvents.push(event)
      }
    })

    groupMap.forEach((events, commitmentTitle) => {
      groupedTimeline.push({ commitmentTitle, events })
    })

    if (unmatchedEvents.length > 0) {
      groupedTimeline.push({ commitmentTitle: "System Alerts", events: unmatchedEvents })
    }
  }

  const activePredictions = data.predictions || []
  const narrative = generateFutureNarrative(data)
  const successBand = getSuccessProbabilityLevel(overallSuccessProbability)

  return (
    <div className="space-y-6 mb-6">
      {/* Simulation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
              Future Simulation Engine
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Continuous scheduling predictive analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100 dark:border-indigo-950 px-3.5 py-1.5 rounded-xl max-w-md">
          <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-1">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Recommendation:</span> {futureOutlook.recommendedAction}
          </p>
        </div>
      </div>

      {/* TASK 1: Future Outlook Narrative Hero Card */}
      <div className="bg-gradient-to-r from-indigo-50/60 to-purple-50/60 dark:from-indigo-950/15 dark:to-purple-950/15 border border-indigo-100/80 dark:border-indigo-900/40 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300">
          <BrainCircuit className="h-28 w-28 -mr-4 -mt-4" />
        </div>
        <h3 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 animate-pulse" />
          Future Outlook Narrative
        </h3>
        <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium space-y-2 max-w-4xl">
          <p>{narrative.intro}</p>
          {narrative.consequenceText && <p>{narrative.consequenceText}</p>}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className={`px-2 py-0.5 text-xs font-bold rounded-md border ${successBand.badgeBg}`}>
              {narrative.healthStatus}
            </span>
            <span className="text-slate-650 dark:text-slate-350">{narrative.recommendation}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid (Task 2 & 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Success Probability - TASK 2 Banded Display */}
        <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between group transition-all ${successBand.cardBorder}`}>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Success Probability</p>
            <h3 className={`text-xl font-black mt-2 tracking-tight ${successBand.colorClass}`}>
              {successBand.label} <span className="text-xs font-bold">({Math.round(overallSuccessProbability * 100)}%)</span>
            </h3>
          </div>
          <div className={`h-11 w-11 rounded-lg flex items-center justify-center shrink-0 ${successBand.badgeBg}`}>
            <Award className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* 2. Future Health */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between group hover:border-indigo-400 dark:hover:border-indigo-800 transition-colors">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Future Health</p>
            <h3 className={`text-xl font-black mt-2 tracking-tight ${
              futureOutlook.futureHealth === 'HEALTHY'
                ? 'text-emerald-600 dark:text-emerald-400'
                : futureOutlook.futureHealth === 'WATCHLIST'
                ? 'text-amber-600 dark:text-amber-400'
                : futureOutlook.futureHealth === 'AT_RISK'
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-rose-600 dark:text-rose-450'
            }`}>
              {futureOutlook.futureHealth}
            </h3>
          </div>
          <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${
            futureOutlook.futureHealth === 'HEALTHY'
              ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40'
              : futureOutlook.futureHealth === 'WATCHLIST'
              ? 'bg-amber-50 text-amber-500 dark:bg-amber-950/40'
              : 'bg-rose-50 text-rose-500 dark:bg-rose-950/40'
          }`}>
            <Clock className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* 3. Most At Risk Commitment - TASK 5 Detailed Impact */}
        <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm transition-all flex flex-col justify-between ${mostAtRisk ? 'hover:border-rose-350 dark:hover:border-rose-900 lg:col-span-1 lg:row-span-1 h-auto' : ''}`}>
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Most At Risk</p>
              {mostAtRisk ? (
                <h3 className="text-sm font-bold mt-2 text-slate-900 dark:text-white line-clamp-1" title={mostAtRisk.title}>
                  {mostAtRisk.title} <span className="text-xs font-extrabold text-rose-500">({Math.round(mostAtRisk.failureProbability * 100)}%)</span>
                </h3>
              ) : (
                <h3 className="text-sm font-semibold mt-2 text-slate-400">None</h3>
              )}
            </div>
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${mostAtRisk ? 'bg-rose-50 text-rose-550 dark:bg-rose-950/40' : 'bg-slate-50 text-slate-400 dark:bg-slate-900'}`}>
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>

          {/* TASK 5: "Why This Matters" Consequences Detail */}
          {mostAtRisk && (
            <div className="mt-3 pt-3 border-t border-slate-150 dark:border-slate-800/80 space-y-2 text-[11px] leading-relaxed">
              <div>
                <p className="font-extrabold text-[9px] text-rose-500 uppercase tracking-widest mb-1.5">Why This Matters</p>
                <p className="font-bold text-slate-500 dark:text-slate-450">Potential Consequences</p>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 pl-0.5 mt-0.5 space-y-0.5">
                  {mostAtRisk.consequenceAnalysis.consequences.slice(0, 2).map((c, idx) => (
                    <li key={idx} className="truncate line-clamp-1">{c}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <p className="font-bold text-slate-500 dark:text-slate-450">Stakeholder Impact</p>
                <p className="text-slate-650 dark:text-slate-350 italic mt-0.5 line-clamp-2">
                  {mostAtRisk.consequenceAnalysis.stakeholderImpact}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 4. Reliability Score */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm flex items-center justify-between group hover:border-indigo-400 dark:hover:border-indigo-800 transition-colors">
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Reliability Score</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <h3 className="text-3xl font-extrabold text-slate-950 dark:text-white">{reliability.overallScore}%</h3>
              <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${
                reliability.trend === 'IMPROVING'
                  ? 'text-emerald-500'
                  : reliability.trend === 'DECLINING'
                  ? 'text-rose-500'
                  : 'text-slate-500'
              }`}>
                {reliability.trend === 'IMPROVING' && <TrendingUp className="h-3 w-3" />}
                {reliability.trend === 'DECLINING' && <TrendingDown className="h-3 w-3" />}
                {reliability.trend === 'STABLE' && <Minus className="h-3 w-3" />}
                {reliability.trend === 'STABLE' ? 'STBL' : reliability.trend.slice(0, 4)}
              </span>
            </div>
          </div>
          <div className="h-11 w-11 rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40 flex items-center justify-center">
            <Award className="h-5.5 w-5.5" />
          </div>
        </div>
      </div>

      {/* Simulator, Reliability, and Timeline Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* TASK 3: WHAT-IF SIMULATOR CARD WITH VISUAL COMPARISON AND DYNAMIC TREND BADGES */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-850">
              <HelpCircle className="h-5 w-5 text-indigo-500 shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">What-If Simulation Sandbox</h3>
            </div>

            {activePredictions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  {/* Select dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Select Commitment</label>
                    <select
                      value={selectedCommitmentId}
                      onChange={(e) => setSelectedCommitmentId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {activePredictions.map((pred) => (
                        <option key={pred.commitmentId} value={pred.commitmentId}>
                          {pred.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Scenario Toggle */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Scenario Action</label>
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedAction('COMPLETE')}
                        className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          selectedAction === 'COMPLETE'
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        Simulate Completion
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAction('IGNORE')}
                        className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          selectedAction === 'IGNORE'
                            ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-450 border-rose-250 dark:border-rose-900/50 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        Simulate Ignore
                      </button>
                    </div>
                  </div>
                </div>

                {/* Simulation Output Dashboard */}
                <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 p-4 rounded-xl relative space-y-4">
                  {simLoading && (
                    <div className="absolute inset-0 bg-white/75 dark:bg-slate-900/75 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-10">
                      <RefreshCw className="h-5 w-5 text-indigo-500 animate-spin" />
                    </div>
                  )}

                  {simError && (
                    <div className="text-xs text-rose-500 text-center py-4 flex flex-col items-center gap-1">
                      <AlertCircle className="h-5 w-5" />
                      <span>{simError}</span>
                    </div>
                  )}

                  {!simLoading && !simError && simResult && (() => {
                    const currentPct = Math.round(simResult.currentOutlook.successProbability * 100)
                    const simulatedPct = Math.round(simResult.simulatedOutlook.successProbability * 100)
                    const diffPct = simulatedPct - currentPct

                    const currentBand = getSuccessProbabilityLevel(simResult.currentOutlook.successProbability)
                    const simulatedBand = getSuccessProbabilityLevel(simResult.simulatedOutlook.successProbability)

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sandbox Results</h4>
                          
                          {/* TASK 3: Trend Badge */}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-0.5 ${
                            diffPct > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-255 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : diffPct < 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-255 dark:bg-rose-950/20 dark:text-rose-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {diffPct > 0 ? `+${diffPct}% Improvement` : diffPct < 0 ? `${diffPct}% Decline` : '0% No Change'}
                          </span>
                        </div>

                        {/* TASK 3: Comparison progress bars */}
                        <div className="space-y-3">
                          {/* Current Success Rate Bar */}
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-slate-500">Current</span>
                              <span className={`font-black ${currentBand.colorClass}`}>
                                {currentBand.label} ({currentPct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-200/60 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                              <div
                                className="bg-slate-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${currentPct}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Simulated Success Rate Bar */}
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-slate-550">Simulated</span>
                              <span className={`font-black ${simulatedBand.colorClass}`}>
                                {simulatedBand.label} ({simulatedPct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-200/60 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${simulatedPct}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        {/* TASK 3: Context explanation text */}
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/80 pt-3 leading-relaxed">
                          {selectedAction === 'COMPLETE' ? (
                            <span>Completing this commitment improves future outlook because it removes a high-risk deadline from the simulation.</span>
                          ) : (
                            <span>Ignoring this commitment declines future outlook because missing it logs a failure in the reliability simulation.</span>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            ) : (
              // TASK 7: Sandbox Empty State
              <div className="text-center py-8 text-slate-400">
                <HelpCircle className="h-8 w-8 opacity-20 mx-auto mb-2" />
                <p className="text-xs font-semibold">Future Outlook is clear.</p>
                <p className="text-[10px] opacity-75 mt-0.5">No active commitments are currently creating future risk.</p>
              </div>
            )}
          </div>

          {/* TASK 6: ENHANCED RELIABILITY PROFILE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-855 pb-2.5">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Reliability Score Profile</h3>
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">
                Trend: <span className={reliability.trend === 'IMPROVING' ? 'text-emerald-500' : 'text-slate-550'}>{reliability.trend}</span>
              </div>
            </div>

            {/* TASK 6: Dynamic Category insight statement sentence */}
            <div className="bg-indigo-50/45 dark:bg-indigo-950/10 border border-indigo-100/60 dark:border-indigo-900/30 p-4 rounded-xl text-xs text-indigo-850 dark:text-indigo-300 leading-relaxed font-medium">
              &ldquo;{generateReliabilityInsight(reliability.strongestCategory, reliability.weakestCategory)}&rdquo;
            </div>

            {/* Categories horizontal progress grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryKeys.map((category) => {
                const score = reliability.categoryScores[category] ?? 50
                return (
                  <div key={category} className="space-y-1.5 p-3 border border-slate-100 dark:border-slate-850 rounded-xl bg-slate-50/20">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-700 dark:text-slate-355 capitalize">{category}</span>
                      <span className="font-black text-slate-900 dark:text-white">{score}%</span>
                    </div>
                    <div className="w-full bg-slate-150 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
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

            <div className="pt-2 flex items-center justify-between text-[10px] font-bold text-slate-405">
              <span className="flex items-center gap-1">Strongest: <span className="text-emerald-500 uppercase">{reliability.strongestCategory ?? 'N/A'}</span></span>
              <span className="flex items-center gap-1">Weakest: <span className="text-rose-500 uppercase">{reliability.weakestCategory ?? 'N/A'}</span></span>
            </div>
          </div>
        </div>

        {/* TASK 4: COMPRESSED FUTURE TIMELINE GROUPED BY COMMITMENT */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col h-full max-h-[500px] overflow-hidden">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-850 flex-shrink-0">
            <Calendar className="h-5 w-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Future Timeline</h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 pt-4 space-y-4">
            {groupedTimeline.length > 0 ? (
              groupedTimeline.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1.5 border-b border-slate-100 dark:border-slate-850/60 pb-3 last:border-0">
                  {/* Commitment Title Header */}
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {group.commitmentTitle}
                  </h4>

                  {/* Bulleted list of compressed events (TASK 4) */}
                  <ul className="pl-3 space-y-1 mt-1 text-[11px] leading-relaxed">
                    {group.events.map((event, eIdx) => {
                      const dateLabel = formatTimelineDate(event.date)
                      const bulletLabel = getShortenedEventTitle(event, group.commitmentTitle)
                      
                      let dotColor = 'bg-purple-500'
                      if (event.type === 'WARNING') dotColor = 'bg-orange-500'
                      if (event.type === 'DEADLINE') dotColor = 'bg-blue-500'
                      if (event.type === 'CONSEQUENCE') dotColor = 'bg-rose-500'

                      return (
                        <li key={eIdx} className="flex items-center gap-2 text-slate-655 dark:text-slate-400">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`}></span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {bulletLabel}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium lowercase">
                            ({dateLabel})
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))
            ) : (
              // TASK 7: Timeline Empty State
              <div className="text-center py-10 text-slate-400">
                <Calendar className="h-8 w-8 opacity-20 mx-auto mb-2" />
                <p className="text-xs font-semibold">Future Outlook is clear.</p>
                <p className="text-[10px] opacity-75 mt-0.5">No active commitments are currently creating future risk.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
