'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Clock, Calendar, AlertTriangle } from 'lucide-react'

type PriorityItem = {
  id: string
  type: 'commitment' | 'context'
  title: string
  action: string
  estimatedTime: number
  urgency: 'today' | 'this-week' | 'later'
}

type RoadmapDay = {
  day: string
  tasks: {
    title: string
    duration: number
    type: 'commitment' | 'context'
  }[]
}

type RoadmapData = {
  overloaded: boolean
  overloadMessage: string | null
  postponeSuggestions: {
    commitmentId: string
    commitmentTitle: string
    reason: string
    suggestion: string
  }[]
  priorityList: PriorityItem[]
  roadmap: RoadmapDay[]
  generalAdvice: string
}

export default function RoadmapClient() {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [exists, setExists] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  const fetchRoadmap = async () => {
    try {
      const response = await fetch('/api/ai/roadmap')
      const data = await response.json()

      if (data.exists) {
        setRoadmap(data.data)
        setExists(true)
        setGeneratedAt(data.generatedAt)
      } else {
        setExists(false)
        setRoadmap(null)
      }
    } catch (error) {
      console.error('Failed to fetch roadmap:', error)
    } finally {
      setLoading(false)
    }
  }

  const regenerateRoadmap = async () => {
    setRegenerating(true)
    try {
      const response = await fetch('/api/ai/roadmap', {
        method: 'POST',
      })
      const data = await response.json()

      if (data.error) {
        alert('Failed to generate roadmap: ' + data.error)
      } else {
        setRoadmap(data)
        setExists(true)
        setGeneratedAt(new Date().toISOString())
      }
    } catch (error) {
      console.error('Failed to regenerate roadmap:', error)
      alert('Failed to regenerate roadmap. Please try again.')
    } finally {
      setRegenerating(false)
    }
  }

  useEffect(() => {
    fetchRoadmap()
  }, [])

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'today':
        return 'border-l-4 border-l-rose-500 bg-rose-50 dark:bg-rose-900/20'
      case 'this-week':
        return 'border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/20'
      default:
        return 'border-l-4 border-l-slate-300 bg-slate-50 dark:bg-slate-800'
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'today':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
      case 'this-week':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading roadmap...</p>
        </div>
      </div>
    )
  }

  if (!exists || !roadmap) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            No Roadmap Generated Yet
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Generate an AI-powered roadmap based on your commitments and active contexts.
          </p>
          <button
            onClick={regenerateRoadmap}
            disabled={regenerating}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-medium transition-colors inline-flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
            <span>{regenerating ? 'Generating...' : 'Generate Roadmap'}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">AI Roadmap</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            AI-generated plan based on your commitments and contexts
            {generatedAt && (
              <span className="text-sm ml-2">
                • Generated {new Date(generatedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={regenerateRoadmap}
          disabled={regenerating}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 rounded-xl font-medium transition-colors inline-flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
          <span>Regenerate</span>
        </button>
      </div>

      {/* General Advice */}
      {roadmap.generalAdvice && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-blue-900 dark:text-blue-100">{roadmap.generalAdvice}</p>
        </div>
      )}

      {/* Overload Warning */}
      {roadmap.overloaded && roadmap.overloadMessage && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-rose-900 dark:text-rose-100">{roadmap.overloadMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION A: Priority List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">YOUR PRIORITY LIST</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Ordered by urgency and importance
            </p>
          </div>

          <div className="space-y-3">
            {roadmap.priorityList
              .sort((a, b) => {
                const urgencyOrder = { today: 0, 'this-week': 1, later: 2 }
                return urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
              })
              .map((item, index) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border border-slate-200 dark:border-slate-700 ${getUrgencyColor(item.urgency)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white flex-1">
                      {index + 1}. {item.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${getUrgencyBadge(item.urgency)}`}
                      >
                        {item.urgency.replace('-', ' ').toUpperCase()}
                      </span>
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300">
                        {item.type}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{item.action}</p>
                  <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>~{item.estimatedTime} min</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* SECTION B: 7-Day Roadmap */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">7-DAY ROADMAP</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Daily breakdown of tasks
            </p>
          </div>

          <div className="space-y-4">
            {roadmap.roadmap.map((day, index) => (
              <div
                key={index}
                className="border border-slate-200 dark:border-slate-700 rounded-xl p-4"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>{day.day}</span>
                </h3>

                {day.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {day.tasks.map((task, taskIndex) => (
                      <div
                        key={taskIndex}
                        className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {task.title}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {task.duration} min
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                              {task.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                    No tasks scheduled
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
