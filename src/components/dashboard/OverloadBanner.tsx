'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

type RoadmapData = {
  overloaded: boolean
  overloadMessage: string | null
  postponeSuggestions: {
    commitmentId: string
    commitmentTitle: string
    reason: string
    suggestion: string
  }[]
}

export default function OverloadBanner() {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [hiddenSuggestions, setHiddenSuggestions] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Check localStorage for dismissal
    const isDismissed = localStorage.getItem('overloadBannerDismissed') === 'true'
    setDismissed(isDismissed)

    // Fetch roadmap data
    async function fetchRoadmap() {
      try {
        const response = await fetch('/api/ai/roadmap')
        const data = await response.json()

        if (data.exists && data.data) {
          setRoadmap(data.data)
          
          // Reset dismissal if new roadmap generated
          const lastGeneratedAt = localStorage.getItem('lastRoadmapGeneratedAt')
          if (lastGeneratedAt !== data.generatedAt) {
            localStorage.setItem('lastRoadmapGeneratedAt', data.generatedAt)
            localStorage.removeItem('overloadBannerDismissed')
            setDismissed(false)
            setHiddenSuggestions(new Set())
          }
        }
      } catch (error) {
        console.error('Failed to fetch roadmap:', error)
      }
    }

    fetchRoadmap()
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('overloadBannerDismissed', 'true')
  }

  const handleHideSuggestion = (commitmentId: string) => {
    setHiddenSuggestions(prev => new Set([...prev, commitmentId]))
  }

  if (!roadmap || !roadmap.overloaded || dismissed) {
    return null
  }

  const visibleSuggestions = roadmap.postponeSuggestions.filter(
    suggestion => !hiddenSuggestions.has(suggestion.commitmentId)
  )

  return (
    <div className="mb-6 space-y-3">
      {/* Main Overload Banner */}
      {roadmap.overloadMessage && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-rose-900 dark:text-rose-100 flex-1">{roadmap.overloadMessage}</p>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-800/50 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </button>
        </div>
      )}

      {/* Postpone Suggestions */}
      {visibleSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visibleSuggestions.map((suggestion) => (
            <div
              key={suggestion.commitmentId}
              className="inline-flex items-center space-x-2 px-3 py-2 bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg text-sm"
            >
              <span className="text-rose-900 dark:text-rose-100">
                <strong>Consider {suggestion.suggestion}:</strong> {suggestion.commitmentTitle}
              </span>
              <button
                onClick={() => handleHideSuggestion(suggestion.commitmentId)}
                className="p-0.5 hover:bg-rose-200 dark:hover:bg-rose-800/50 rounded transition-colors"
                aria-label="Hide suggestion"
              >
                <X className="h-3.5 w-3.5 text-rose-700 dark:text-rose-300" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
