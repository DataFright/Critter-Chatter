/**
 * Hook to track performance of chat operations
 */
'use client'

import { useCallback } from 'react'
import { performanceTracker } from '@/lib/performance'

export function usePerformanceTracking() {
  /**
   * Track an async operation
   */
  const trackAsync = useCallback(
    async <T,>(
      name: string,
      fn: () => Promise<T>,
      category: 'api' | 'ui' | 'render' = 'api',
    ): Promise<T> => {
      performanceTracker.start(name)
      try {
        const result = await fn()
        performanceTracker.end(name, category, 'success')
        return result
      } catch (error) {
        performanceTracker.end(name, category, 'error', { error: String(error) })
        throw error
      }
    },
    [],
  )

  /**
   * Track a sync operation
   */
  const trackSync = useCallback(
    <T,>(
      name: string,
      fn: () => T,
      category: 'api' | 'ui' | 'render' = 'api',
    ): T => {
      performanceTracker.start(name)
      try {
        const result = fn()
        performanceTracker.end(name, category, 'success')
        return result
      } catch (error) {
        performanceTracker.end(name, category, 'error', { error: String(error) })
        throw error
      }
    },
    [],
  )

  /**
   * Get current metrics
   */
  const getMetrics = useCallback(() => performanceTracker.getMetrics(), [])

  /**
   * Get performance stats
   */
  const getStats = useCallback((category?: string) => performanceTracker.getStats(category), [])

  return {
    trackAsync,
    trackSync,
    getMetrics,
    getStats,
  }
}
