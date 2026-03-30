import autocannon from 'autocannon'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPORTS_DIR = path.join(__dirname, '../reports/load')
fs.mkdirSync(REPORTS_DIR, { recursive: true })

const BASE_URL = process.env.BASE_URL || 'http://localhost:3010'

function run(opts) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(opts, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
    autocannon.track(instance, { renderProgressBar: true })
  })
}

console.log('\n🔥 Load test: /api/health')
const healthResult = await run({
  url: `${BASE_URL}/api/health`,
  connections: 10,
  duration: 5,
  title: 'health',
})

console.log('\n🐒 Load test: /api/chat')
const chatResult = await run({
  url: `${BASE_URL}/api/chat`,
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ messages: [{ role: 'user', content: 'load test' }] }),
  connections: 1,
  duration: 10,
  title: 'chat',
})

const results = {
  timestamp: new Date().toISOString(),
  health: {
    requests: healthResult.requests,
    latency: healthResult.latency,
    errors: healthResult.errors,
    non2xx: healthResult.non2xx,
  },
  chat: {
    requests: chatResult.requests,
    latency: chatResult.latency,
    errors: chatResult.errors,
    non2xx: chatResult.non2xx,
  },
}

const outPath = path.join(REPORTS_DIR, 'results.json')
fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
console.log(`\n✅ Load results saved to ${outPath}`)

const totalErrors = (results.health.errors ?? 0) + (results.chat.errors ?? 0)
console.log(`Total errors: ${totalErrors} ${totalErrors === 0 ? '✔' : '✘'}`)
