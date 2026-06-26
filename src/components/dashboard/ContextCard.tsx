'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'

interface ContextCardProps {
  id: string
  contextName: string
  lastCheckpoint: string | null
  nextAction: string | null
  estimatedTime: number | null
  summary: string | null
  source: string
  lastWorkedAt: string | Date | null
  onDelete: (id: string) => Promise<void> | void
}

function getContextEmoji(name: string): string {
  const normalized = name.toLowerCase()
  if (
    normalized.includes('dsa') ||
    normalized.includes('algorithm') ||
    normalized.includes('leetcode') ||
    normalized.includes('coding') ||
    normalized.includes('programming')
  ) {
    return '📚'
  }
  if (
    normalized.includes('chronoai') ||
    normalized.includes('dashboard') ||
    normalized.includes('ui') ||
    normalized.includes('project') ||
    normalized.includes('app') ||
    normalized.includes('web')
  ) {
    return '💻'
  }
  if (
    normalized.includes('java') ||
    normalized.includes('python') ||
    normalized.includes('react') ||
    normalized.includes('next') ||
    normalized.includes('typescript') ||
    normalized.includes('language')
  ) {
    return '🖥️'
  }
  if (
    normalized.includes('design') ||
    normalized.includes('figma') ||
    normalized.includes('ui/ux')
  ) {
    return '🎨'
  }
  if (
    normalized.includes('personal') ||
    normalized.includes('finance') ||
    normalized.includes('bank') ||
    normalized.includes('life')
  ) {
    return '🏠'
  }
  return '🧠'
}

function formatRelativeTime(dateInput: string | Date | null): string {
  if (!dateInput) return 'Never'
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const diff = Date.now() - date.getTime()
  if (diff < 0) return 'just now'

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function getPlatformBadgeStyle(source: string): { bg: string; text: string; border: string; label: string } {
  const norm = source.toLowerCase()
  if (norm.includes('chatgpt')) {
    return {
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      border: 'border border-green-500/20',
      label: 'ChatGPT',
    }
  }
  if (norm.includes('claude')) {
    return {
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      border: 'border border-orange-500/20',
      label: 'Claude',
    }
  }
  if (norm.includes('gemini')) {
    return {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border border-blue-500/20',
      label: 'Gemini',
    }
  }
  return {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    border: 'border border-zinc-500/20',
    label: source,
  }
}

export default function ContextCard({
  id,
  contextName,
  lastCheckpoint,
  nextAction,
  estimatedTime,
  summary,
  source,
  lastWorkedAt,
  onDelete,
}: ContextCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const emoji = getContextEmoji(contextName)
  const timeStr = formatRelativeTime(lastWorkedAt)
  const badge = getPlatformBadgeStyle(source)

  const est = estimatedTime !== null ? estimatedTime : 45
  const formattedTimeEstimate = est > 120
    ? `⏱ ~${Math.round(est / 60)}h`
    : `⏱ ~${est} min`

  const confirmDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(id)
    } finally {
      setIsDeleting(false)
      setIsConfirmingDelete(false)
    }
  }

  return (
    <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all flex flex-col justify-between h-full group text-left">
      <div>
        {/* Top Row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none" role="img" aria-label="context icon">
              {emoji}
            </span>
            <h3 className="font-semibold text-white text-lg line-clamp-1">
              {contextName}
            </h3>
          </div>
          <div className="relative flex items-center gap-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text} ${badge.border}`}>
              {badge.label}
            </span>
            <button
              type="button"
              aria-label={`Remove ${contextName} context`}
              disabled={isDeleting}
              onClick={() => setIsConfirmingDelete(true)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-zinc-500 hover:bg-white/10 hover:text-white disabled:opacity-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {isConfirmingDelete && (
              <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-white/10 bg-zinc-950 p-3 shadow-xl">
                <p className="mb-2 text-xs font-medium text-zinc-200">Remove this context?</p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setIsConfirmingDelete(false)}
                    className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={confirmDelete}
                    className="rounded bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/25 disabled:opacity-50"
                  >
                    {isDeleting ? 'Removing...' : 'Yes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Description */}
        {summary && (
          <p className="text-xs text-zinc-450 dark:text-zinc-400 leading-relaxed mb-4 line-clamp-2">
            {summary}
          </p>
        )}

        {/* Middle Section */}
        <div className="mt-4 space-y-3">
          {lastCheckpoint && (
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-wide block">Last worked on</span>
              <span className="text-sm text-zinc-300 mt-0.5 block break-words">
                {lastCheckpoint}
              </span>
            </div>
          )}
          {nextAction && (
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-wide block">Next up</span>
              <span className="text-sm text-white font-medium mt-0.5 block break-words">
                {nextAction}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
        <span className="text-xs text-zinc-500">
          {formattedTimeEstimate}
        </span>
        <span className="text-xs text-zinc-500">
          {timeStr}
        </span>
      </div>
    </div>
  )
}
