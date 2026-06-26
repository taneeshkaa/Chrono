'use client'

import React from 'react'

interface ContextCardProps {
  contextName: string
  lastCheckpoint: string | null
  nextAction: string | null
  estimatedTime: number | null
  summary: string | null
  source: string
  lastWorkedAt: string | Date | null
}

function getContextEmoji(name: string): string {
  const normalized = name.toLowerCase()
  if (
    normalized.includes('dsa') ||
    normalized.includes('algo') ||
    normalized.includes('leetcode') ||
    normalized.includes('academic') ||
    normalized.includes('study')
  ) {
    return '📚'
  }
  if (
    normalized.includes('work') ||
    normalized.includes('project') ||
    normalized.includes('java') ||
    normalized.includes('python') ||
    normalized.includes('react') ||
    normalized.includes('next') ||
    normalized.includes('code') ||
    normalized.includes('dev') ||
    normalized.includes('app')
  ) {
    return '💻'
  }
  return '🧠'
}

function formatRelativeTime(dateInput: string | Date | null): string {
  if (!dateInput) return 'Never'
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const diff = Date.now() - date.getTime()
  if (diff < 0) return 'Just now'

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function getPlatformBadgeStyle(source: string): { bg: string; text: string; label: string } {
  const norm = source.toLowerCase()
  if (norm.includes('chatgpt')) {
    return { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'ChatGPT' }
  }
  if (norm.includes('claude')) {
    return { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'Claude' }
  }
  if (norm.includes('gemini')) {
    return { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', label: 'Gemini' }
  }
  return { bg: 'bg-slate-500/10 border-slate-500/20', text: 'text-slate-400', label: source }
}

export default function ContextCard({
  contextName,
  lastCheckpoint,
  nextAction,
  estimatedTime,
  summary,
  source,
  lastWorkedAt,
}: ContextCardProps) {
  const emoji = getContextEmoji(contextName)
  const timeStr = formatRelativeTime(lastWorkedAt)
  const badge = getPlatformBadgeStyle(source)

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm rounded-xl p-5 hover:border-slate-700/60 transition-all flex flex-col justify-between h-full group">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none" role="img" aria-label="context icon">
              {emoji}
            </span>
            <h3 className="font-semibold text-slate-100 group-hover:text-white transition-colors line-clamp-1">
              {contextName}
            </h3>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono tracking-wider font-semibold ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>

        {/* Summary Description */}
        {summary && (
          <p className="text-xs text-slate-400 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
            {summary}
          </p>
        )}

        {/* State */}
        <div className="space-y-2 mb-5">
          {lastCheckpoint && (
            <div className="text-xs">
              <span className="text-slate-500 block mb-0.5">Last worked on</span>
              <span className="text-slate-300 font-medium line-clamp-1">{lastCheckpoint}</span>
            </div>
          )}
          {nextAction && (
            <div className="text-xs">
              <span className="text-slate-500 block mb-0.5">Next up</span>
              <span className="text-slate-200 font-semibold line-clamp-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                {nextAction}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/50 mt-auto">
        <span className="text-xs font-medium text-slate-500 bg-slate-800/20 px-2.5 py-1 rounded-md border border-slate-800/60">
          ~{estimatedTime || 15} min
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-500 font-mono">
          {timeStr}
        </span>
      </div>
    </div>
  )
}
