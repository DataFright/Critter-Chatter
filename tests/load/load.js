import autocannon from 'autocannon'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPORTS_DIR = path.join(__dirname, '../reports/load')
fs.mkdirSync(REPORTS_DIR, { recursive: true })

const BASE_URL = process.env.BASE_URL || 'http://localhost:3010'
const STRESS_EXPECTED_TURNS = Number(process.env.STRESS_EXPECTED_TURNS || 100)
const STRESS_RUNS = Number(process.env.STRESS_RUNS || 6)
const STRESS_CONCURRENCY = Number(process.env.STRESS_CONCURRENCY || 3)

function run(opts) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(opts, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
    autocannon.track(instance, { renderProgressBar: true })
  })
}

function percentile(sorted, p) {
  if (!sorted.length) return 0
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function parseSseEvents(text) {
  return text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => {
      try {
        return JSON.parse(line.slice(6))
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

async function fetchDialogue(url) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'dialogue',
      maxTurns: STRESS_EXPECTED_TURNS,
      speakerIds: ['jinx', 'volt', 'mabel', 'zeke', 'nova', 'velvet', 'tempest', 'luma', 'echo'],
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.text()
}

async function runDialogueFetchLoad({ url, samples = 8 }) {
  const latencies = []
  let errors = 0

  for (let i = 0; i < samples; i += 1) {
    const start = performance.now()
    try {
      await fetchDialogue(url)
      latencies.push(performance.now() - start)
    } catch {
      errors += 1
    }
  }

  const sorted = [...latencies].sort((a, b) => a - b)
  const avg = sorted.length ? sorted.reduce((acc, value) => acc + value, 0) / sorted.length : 0
  const requestsPerSec = avg > 0 ? 1000 / avg : 0

  return {
    requests: { average: requestsPerSec },
    latency: {
      average: avg,
      p90: percentile(sorted, 90),
      p99: percentile(sorted, 99),
    },
    errors,
    non2xx: errors,
  }
}

async function runDialogueStress({ url, runs = 6, concurrency = 3, expectedTurns = STRESS_EXPECTED_TURNS }) {
  const latencies = []
  const turnCounts = []
  const completionTotals = []
  let errors = 0
  let completedRuns = 0

  let nextRunIndex = 0

  async function executeSingleRun() {
    const start = performance.now()
    const text = await fetchDialogue(url)
    const events = parseSseEvents(text)
    const messageEvents = events.filter((event) => event?.type === 'dialogue_message')
    const doneEvent = events.find((event) => event?.type === 'dialogue_done')
    const errorEvent = events.find((event) => event?.type === 'error')

    if (errorEvent) {
      throw new Error(errorEvent.message ?? 'Stress stream error')
    }

    const messageCount = messageEvents.length
    const doneTotal = Number(doneEvent?.total ?? 0)
    const turnNumbers = messageEvents.map((event) => Number(event?.turn ?? 0))

    if (messageCount !== expectedTurns) {
      throw new Error(`Expected ${expectedTurns} dialogue messages, received ${messageCount}`)
    }

    if (doneTotal !== expectedTurns) {
      throw new Error(`Expected dialogue_done total ${expectedTurns}, received ${doneTotal}`)
    }

    for (let expectedTurn = 1; expectedTurn <= expectedTurns; expectedTurn += 1) {
      const actualTurn = turnNumbers[expectedTurn - 1]
      if (actualTurn !== expectedTurn) {
        throw new Error(`Skipped or out-of-order turn detected at ${expectedTurn}, received ${actualTurn}`)
      }
    }

    latencies.push(performance.now() - start)
    turnCounts.push(messageCount)
    completionTotals.push(doneTotal)
    completedRuns += 1
  }

  async function worker() {
    while (nextRunIndex < runs) {
      const currentRun = nextRunIndex
      nextRunIndex += 1

      try {
        await executeSingleRun()
      } catch {
        errors += 1
      }

      if (currentRun >= runs) {
        break
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, runs) }, () => worker()))

  const sortedLatencies = [...latencies].sort((a, b) => a - b)

  return {
    runs,
    completedRuns,
    expectedTurns,
    concurrency,
    requests: {
      average: average(latencies) > 0 ? 1000 / average(latencies) : 0,
    },
    latency: {
      average: average(latencies),
      p90: percentile(sortedLatencies, 90),
      p99: percentile(sortedLatencies, 99),
    },
    turns: {
      average: average(turnCounts),
      min: turnCounts.length ? Math.min(...turnCounts) : 0,
      max: turnCounts.length ? Math.max(...turnCounts) : 0,
    },
    completions: {
      average: average(completionTotals),
      min: completionTotals.length ? Math.min(...completionTotals) : 0,
      max: completionTotals.length ? Math.max(...completionTotals) : 0,
    },
    errors,
    non2xx: errors,
  }
}

console.log('\n🔥 Load test: /api/health')
const healthResult = await run({
  url: `${BASE_URL}/api/health`,
  connections: 10,
  duration: 5,
  title: 'health',
})

console.log('\n🎭 Load test: /api/chat (dialogue mode)')
const dialogueResult = await runDialogueFetchLoad({
  url: `${BASE_URL}/api/chat`,
  samples: 8,
})

console.log(`\n💥 Stress test: /api/chat (${STRESS_EXPECTED_TURNS} turns per run)`) 
const dialogueStressResult = await runDialogueStress({
  url: `${BASE_URL}/api/chat`,
  runs: STRESS_RUNS,
  concurrency: STRESS_CONCURRENCY,
})

const results = {
  timestamp: new Date().toISOString(),
  health: {
    requests: healthResult.requests,
    latency: healthResult.latency,
    errors: healthResult.errors,
    non2xx: healthResult.non2xx,
  },
  dialogue: {
    requests: dialogueResult.requests,
    latency: dialogueResult.latency,
    errors: dialogueResult.errors,
    non2xx: dialogueResult.non2xx,
  },
  dialogueStress: {
    runs: dialogueStressResult.runs,
    completedRuns: dialogueStressResult.completedRuns,
    expectedTurns: dialogueStressResult.expectedTurns,
    concurrency: dialogueStressResult.concurrency,
    requests: dialogueStressResult.requests,
    latency: dialogueStressResult.latency,
    turns: dialogueStressResult.turns,
    completions: dialogueStressResult.completions,
    errors: dialogueStressResult.errors,
    non2xx: dialogueStressResult.non2xx,
  },
}

const outPath = path.join(REPORTS_DIR, 'results.json')
fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
console.log(`\n✅ Load results saved to ${outPath}`)

const totalErrors =
  (results.health.errors ?? 0) +
  (results.dialogue.errors ?? 0) +
  (results.dialogueStress.errors ?? 0)
console.log(`Total errors: ${totalErrors} ${totalErrors === 0 ? '✔' : '✘'}`)
