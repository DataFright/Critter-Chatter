/**
 * Performance metrics tracking for API responses and UI interactions
 */

export interface PerformanceMetrics {
  name: string
  duration: number
  timestamp: number
  category: 'api' | 'ui' | 'render'
  status: 'success' | 'error'
  metadata?: Record<string, unknown>
}

class PerformanceTracker {
  private metrics: PerformanceMetrics[] = []
  private timers: Map<string, number> = new Map()

  /**
   * Start timing a named operation
   */
  start(name: string): void {
    this.timers.set(name, performance.now())
  }

  /**
   * End timing and record metrics
   */
  end(
    name: string,
    category: 'api' | 'ui' | 'render' = 'api',
    status: 'success' | 'error' = 'success',
    metadata?: Record<string, unknown>,
  ): PerformanceMetrics | null {
    const startTime = this.timers.get(name)
    if (!startTime) {
      console.warn(`Timer "${name}" was not started`)
      return null
    }

    const duration = performance.now() - startTime
    this.timers.delete(name)

    const metric: PerformanceMetrics = {
      name,
      duration,
      timestamp: Date.now(),
      category,
      status,
      metadata,
    }

    this.metrics.push(metric)
    return metric
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: string): PerformanceMetrics[] {
    return this.metrics.filter((m) => m.category === category)
  }

  /**
   * Get average duration for a metric name
   */
  getAverageDuration(name: string): number {
    const matching = this.metrics.filter((m) => m.name === name)
    if (matching.length === 0) return 0
    const total = matching.reduce((sum, m) => sum + m.duration, 0)
    return total / matching.length
  }

  /**
   * Get statistics for a category
   */
  getStats(category?: string) {
    const filtered = category ? this.metrics.filter((m) => m.category === category) : this.metrics

    if (filtered.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        successRate: 0,
      }
    }

    const durations = filtered.map((m) => m.duration).sort((a, b) => a - b)
    const total = durations.reduce((sum, d) => sum + d, 0)
    const successes = filtered.filter((m) => m.status === 'success').length

    return {
      count: filtered.length,
      average: total / filtered.length,
      min: durations[0],
      max: durations[durations.length - 1],
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      successRate: (successes / filtered.length) * 100,
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = []
    this.timers.clear()
  }

  /**
   * Export metrics as JSON
   */
  toJSON() {
    return {
      metrics: this.metrics,
      stats: {
        all: this.getStats(),
        byCategory: {
          api: this.getStats('api'),
          ui: this.getStats('ui'),
          render: this.getStats('render'),
        },
      },
    }
  }
}

export const performanceTracker = new PerformanceTracker()
