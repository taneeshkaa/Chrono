'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, BarChart2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import FutureOutlook from '@/components/dashboard/FutureOutlook'
import type { SimulationResult } from '@/types/simulation'

export default function AnalyticsClient() {
  const router = useRouter()
  const [simulationData, setSimulationData] = useState<SimulationResult | null>(null)
  const [simulationLoading, setSimulationLoading] = useState(true)
  const [simulationError, setSimulationError] = useState(false)

  const fetchSimulation = useCallback(async () => {
    setSimulationLoading(true)
    setSimulationError(false)
    try {
      const res = await fetch('/api/simulation')
      if (!res.ok) {
        throw new Error('Simulation endpoint returned non-OK status')
      }
      const data = await res.json()
      setSimulationData(data)
    } catch (error) {
      console.error('Failed to fetch simulation data:', error)
      setSimulationError(true)
    } finally {
      setSimulationLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSimulation()
  }, [fetchSimulation])

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-8 overflow-y-auto">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8 border-b border-slate-200 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 text-xs text-slate-450 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Memory Bank
            </button>
          </div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900 dark:text-slate-150 flex items-center gap-3">
            <BarChart2 className="h-7 w-7 text-slate-400 dark:text-slate-500 font-light" />
            Predictive Analytics Engine
          </h1>
          <p className="text-sm text-slate-450 dark:text-slate-500 font-light mt-1.5">
            Continuous simulation sandbox and commitment risk projections
          </p>
        </div>

        <button
          onClick={fetchSimulation}
          disabled={simulationLoading}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 rounded-lg transition-all text-xs font-medium cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-450 dark:text-slate-550 ${simulationLoading ? 'animate-spin' : ''}`} />
          {simulationLoading ? 'Simulating...' : 'Recalculate Projections'}
        </button>
      </div>

      {/* Main Sandbox / Projection display */}
      <div className="flex-1 max-w-7xl w-full mx-auto">
        <FutureOutlook
          data={simulationData}
          loading={simulationLoading}
          error={simulationError}
          onRetry={fetchSimulation}
        />
      </div>
    </div>
  )
}
