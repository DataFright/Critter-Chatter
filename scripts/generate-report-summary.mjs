import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPORTS = path.join(__dirname, '../tests/reports')

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function toRepoPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return 'unknown'
  const normalized = inputPath.replace(/\\/g, '/')
  const marker = '/chatbotstep/'
  const idx = normalized.toLowerCase().indexOf(marker)
  if (idx >= 0) return normalized.slice(idx + 1)
  return normalized
}

// Vitest
const vitest = readJSON(path.join(REPORTS, 'vitest/results.json'))
const vitestPassed = vitest?.numPassedTests ?? 0
const vitestFailed = vitest?.numFailedTests ?? 0
const vitestTotal = vitestPassed + vitestFailed
const vitestTests = vitest?.testResults?.flatMap(file => 
  file.assertionResults?.map(test => ({
    name: test.title,
    status: test.status,
    duration: test.duration,
    file: toRepoPath(file.name)
  })) ?? []
) ?? []

// Cypress mochawesome output. Prefer merged.json when produced by the full test:all flow,
// but fall back to index.json for direct cypress runs that already emit a complete report.
const cypress =
  readJSON(path.join(REPORTS, 'cypress/merged.json')) ??
  readJSON(path.join(REPORTS, 'cypress/index.json'))
const cypressPassed = cypress?.stats?.passes ?? 0
const cypressFailed = cypress?.stats?.failures ?? 0
const cypressPending = cypress?.stats?.pending ?? 0
const cypressTotal = cypressPassed + cypressFailed + cypressPending
const cypressDuration = cypress?.stats?.duration ? (cypress.stats.duration / 1000).toFixed(1) : 'N/A'

// Extract Cypress test names with status — traverse results→suites tree (mochawesome format)
function extractCypressTests(node, fallbackFile = '') {
  const out = []
  const fileRef = toRepoPath(node.fullFile || node.file || fallbackFile)
  if (Array.isArray(node.tests)) {
    for (const t of node.tests) {
      out.push({ name: t.fullTitle, status: t.state, duration: t.duration, file: fileRef })
    }
  }
  if (Array.isArray(node.suites)) {
    for (const s of node.suites) out.push(...extractCypressTests(s, node.fullFile || node.file || fallbackFile))
  }
  return out
}
const cypressTests = cypress?.results?.flatMap(r => extractCypressTests(r)) ?? []

// Code Coverage
const coverage = readJSON(path.join(REPORTS, 'coverage/coverage-final.json'))
// v8 coverage: fields are s (statements), f (functions), b (branches) — no l (lines).
// Avoid NaN by guarding against empty/zero denominators.
function pct(vals) {
  if (!vals.length) return 'N/A'
  return (vals.filter(v => v > 0).length / vals.length * 100).toFixed(1)
}
const coverageData = coverage ? Object.entries(coverage).map(([file, data]) => {
  const stmtVals = Object.values(data.s || {})
  const branchVals = Object.values(data.b || {}).flat()
  const fnVals = Object.values(data.f || {})
  return {
    file: file.split('\\').pop() ?? file,
    statements: pct(stmtVals),
    branches: pct(branchVals),
    functions: pct(fnVals),
    lines: pct(stmtVals),  // v8 has no per-line counts; use statement coverage as proxy
  }
}) : []

function avgMetric(data, key) {
  const vals = data.map(c => parseFloat(c[key])).filter(v => !isNaN(v))
  return vals.length ? (vals.reduce((a, v) => a + v, 0) / vals.length).toFixed(1) : 'N/A'
}
const avgStatements = avgMetric(coverageData, 'statements')
const avgBranches = avgMetric(coverageData, 'branches')
const avgFunctions = avgMetric(coverageData, 'functions')
const avgLines = avgMetric(coverageData, 'lines')

// Load
const load = readJSON(path.join(REPORTS, 'load/results.json'))
const healthRps = load?.health?.requests?.average?.toFixed(1) ?? 'N/A'
const healthAvgMs = load?.health?.latency?.average?.toFixed(2) ?? 'N/A'
const healthP90 = load?.health?.latency?.p90 ?? 'N/A'
const healthP99 = load?.health?.latency?.p99 ?? 'N/A'
const healthErrors = load?.health?.errors ?? 0
const dialogue = load?.dialogue ?? load?.chat
const dialogueRps = dialogue?.requests?.average?.toFixed(2) ?? 'N/A'
const dialogueAvgMs = dialogue?.latency?.average?.toFixed(2) ?? 'N/A'
const dialogueP90 = dialogue?.latency?.p90 ?? 'N/A'
const dialogueP99 = dialogue?.latency?.p99 ?? 'N/A'
const dialogueErrors = dialogue?.errors ?? 0
const dialogueStress = load?.dialogueStress
const dialogueStressRuns = dialogueStress?.runs ?? 0
const dialogueStressCompletedRuns = dialogueStress?.completedRuns ?? 0
const dialogueStressExpectedTurns = dialogueStress?.expectedTurns ?? 'N/A'
const dialogueStressConcurrency = dialogueStress?.concurrency ?? 'N/A'
const dialogueStressAvgMs = dialogueStress?.latency?.average?.toFixed(2) ?? 'N/A'
const dialogueStressP90 = dialogueStress?.latency?.p90 ?? 'N/A'
const dialogueStressTurnsAvg = dialogueStress?.turns?.average?.toFixed?.(1) ?? 'N/A'
const dialogueStressErrors = dialogueStress?.errors ?? 0
const totalLoadErrors = healthErrors + dialogueErrors + dialogueStressErrors

const totalTests = vitestTotal + cypressTotal
const totalPassed = vitestPassed + cypressPassed
const totalFailed = vitestFailed + cypressFailed
const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(0) : '0'
const overallStatus = totalFailed === 0 && totalLoadErrors === 0 ? 'PASS' : 'FAIL'
const statusBadge = overallStatus === 'PASS' ? 'PASS | all checks green' : 'FAIL | action needed'
const generatedAt = new Date().toISOString()

const table = (rows) =>
  '| Metric | Value |\n| --- | --- |\n' + rows.map(([k, v]) => `| ${k} | ${v} |`).join('\n')

function progressBar(passed, total, width = 24) {
  if (!total) return `${'-'.repeat(width)} 0%`
  const ratio = Math.max(0, Math.min(1, passed / total))
  const filled = Math.round(ratio * width)
  return `${'█'.repeat(filled)}${'░'.repeat(width - filled)} ${Math.round(ratio * 100)}%`
}

function formatMs(ms) {
  if (!Number.isFinite(ms)) return 'N/A'
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function statusByThreshold(value, threshold) {
  if (!Number.isFinite(value)) return 'N/A'
  return value < threshold ? 'Excellent' : 'Good'
}

const md = `# 🚀 Test Report Summary

**Generated:** ${generatedAt}  
**Status:** **${statusBadge}**  
**Overall Pass Rate:** **${passRate}%**

---

## 📊 Quick Metrics

| Metric | Value | Status |
|--------|-------|--------|
| **Total Tests** | ${totalTests} | ${totalFailed === 0 ? '✅' : '❌'} |
| **Passed** | ${totalPassed} | - |
| **Failed** | ${totalFailed} | - |
| **Pass Rate** | **${passRate}%** | ${totalFailed === 0 ? 'Excellent' : 'Review needed'} |
| **Progress** | ${progressBar(totalPassed, totalTests)} | - |

---

## 🧪 Test Suites

### Unit & API Tests (Vitest)

| Metric | Value |
|--------|-------|
| **Tests** | ${vitestTotal} |
| **Passed** | ${vitestPassed} ✅ |
| **Failed** | ${vitestFailed} ${vitestFailed > 0 ? '❌' : ''} |
| **Pass Rate** | **${vitestTotal > 0 ? ((vitestPassed / vitestTotal) * 100).toFixed(0) : 0}%** |
| **Coverage** | ${progressBar(vitestPassed, vitestTotal)} |

### End-to-End Tests (Cypress)

| Metric | Value |
|--------|-------|
| **Tests** | ${cypressTotal} |
| **Passed** | ${cypressPassed} ✅ |
| **Failed** | ${cypressFailed} ${cypressFailed > 0 ? '❌' : ''} |
| **Pending** | ${cypressPending} |
| **Pass Rate** | **${cypressTotal > 0 ? ((cypressPassed / cypressTotal) * 100).toFixed(0) : 0}%** |
| **Duration** | ${cypressDuration}s |
| **Coverage** | ${progressBar(cypressPassed, cypressTotal)} |

---

## ⚡ Load Test Results

### Health Endpoint Performance

| Metric | Value | Status |
|--------|-------|--------|
| **Request Rate** | ${healthRps} req/s | ${healthErrors === 0 ? '✅' : '⚠️'} |
| **Average Latency** | ${formatMs(parseFloat(healthAvgMs))} | ${parseFloat(healthAvgMs) < 100 ? 'Excellent' : 'Good'} |
| **P90 Latency** | ${healthP90}ms | ${healthP90 < 150 ? 'Excellent' : 'Good'} |
| **P99 Latency** | ${healthP99}ms | ${healthP99 < 500 ? 'Excellent' : 'Good'} |
| **Errors** | ${healthErrors} | ${healthErrors === 0 ? '✅ Zero errors' : '❌ ' + healthErrors + ' errors'} |

### Dialogue Endpoint Performance

| Metric | Value | Status |
|--------|-------|--------|
| **Request Rate** | ${dialogueRps} req/s | ${dialogueErrors === 0 ? '✅' : '⚠️'} |
| **Average Latency** | ${formatMs(parseFloat(dialogueAvgMs))} | ${statusByThreshold(parseFloat(dialogueAvgMs), 500)} |
| **P90 Latency** | ${dialogueP90}ms | ${statusByThreshold(Number(dialogueP90), 1000)} |
| **P99 Latency** | ${dialogueP99}ms | ${statusByThreshold(Number(dialogueP99), 2000)} |
| **Errors** | ${dialogueErrors} | ${dialogueErrors === 0 ? '✅ Zero errors' : '❌ ' + dialogueErrors + ' errors'} |

### Dialogue Stress Test

| Metric | Value | Status |
|--------|-------|--------|
| **Runs** | ${dialogueStressCompletedRuns}/${dialogueStressRuns} | ${dialogueStressErrors === 0 ? '✅' : '⚠️'} |
| **Expected Turns** | ${dialogueStressExpectedTurns} | ${Number(dialogueStressExpectedTurns) > 0 ? '✅' : '⚠️'} |
| **Concurrency** | ${dialogueStressConcurrency} | ${dialogueStressConcurrency === 'N/A' ? 'N/A' : 'Configured'} |
| **Average Duration** | ${formatMs(parseFloat(dialogueStressAvgMs))} | ${statusByThreshold(parseFloat(dialogueStressAvgMs), 3000)} |
| **P90 Duration** | ${Number.isFinite(Number(dialogueStressP90)) ? formatMs(Number(dialogueStressP90)) : 'N/A'} | ${statusByThreshold(Number(dialogueStressP90), 5000)} |
| **Average Turns Observed** | ${dialogueStressTurnsAvg} | ${Number(dialogueStressTurnsAvg) === Number(dialogueStressExpectedTurns) ? 'Complete' : 'Incomplete'} |
| **Errors** | ${dialogueStressErrors} | ${dialogueStressErrors === 0 ? '✅ Zero errors' : '❌ ' + dialogueStressErrors + ' errors'} |

**Total Load Errors:** ${totalLoadErrors === 0 ? '✅ ' + totalLoadErrors : '❌ ' + totalLoadErrors}

---

## 📝 Test Details

### Unit & API Tests

${vitestTests.length > 0 ? '| Test Name | File | Status |\n| --- | --- | --- |\n' + vitestTests.map(t => `| ${t.name} | ${t.file} | ${t.status === 'passed' ? '✅' : '❌'} |`).join('\n') : 'No tests found'}

### E2E Tests  

${cypressTests.length > 0 ? '| Test Suite | Test Name | Status | Duration |\n| --- | --- | --- | --- |\n' + cypressTests.slice(0, 15).map(t => `| ${t.file} | ${t.name} | ${t.status === 'passed' ? '✅' : t.status === 'failed' ? '❌' : '⏭️'} | ${t.duration}ms |`).join('\n') + (cypressTests.length > 15 ? '\n\n*... and ' + (cypressTests.length - 15) + ' more tests*' : '') : 'No tests found'}

---

## 📊 Code Coverage Report

**Coverage Overview:**

| Metric | Coverage | Status |
|--------|----------|--------|
| **Statements** | **${avgStatements === 'N/A' ? 'N/A' : avgStatements + '%'}** | ${parseFloat(avgStatements) >= 70 ? '✅' : '⚠️'} |
| **Branches** | **${avgBranches === 'N/A' ? 'N/A' : avgBranches + '%'}** | ${parseFloat(avgBranches) >= 70 ? '✅' : '⚠️'} |
| **Functions** | **${avgFunctions === 'N/A' ? 'N/A' : avgFunctions + '%'}** | ${parseFloat(avgFunctions) >= 70 ? '✅' : '⚠️'} |
| **Lines** | **${avgLines === 'N/A' ? 'N/A' : avgLines + '%'}** | ${parseFloat(avgLines) >= 70 ? '✅' : '⚠️'} |

**File Coverage Breakdown:**

${coverageData.length > 0 ? '| File | Statements | Branches | Functions | Lines |\n| --- | --- | --- | --- | --- |\n' + coverageData.map(f => `| ${f.file} | ${f.statements === 'N/A' ? 'N/A' : f.statements + '%'} | ${f.branches === 'N/A' ? 'N/A' : f.branches + '%'} | ${f.functions === 'N/A' ? 'N/A' : f.functions + '%'} | ${f.lines === 'N/A' ? 'N/A' : f.lines + '%'} |`).join('\n') : 'No coverage data available'}

---

${
  overallStatus === 'PASS'
    ? `
### ✅ All Tests Passing!

Excellent work! All ${totalTests} tests are passing with **${passRate}%** pass rate.

- Unit/API tests: ${vitestPassed}/${vitestTotal} passing
- E2E tests: ${cypressPassed}/${cypressTotal} passing  
- Load errors: ${totalLoadErrors} total
  `
    : `
### ⚠️ Issues Found

Please address the following:

- Failed tests: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(0)}% of suite)
- Load errors: ${totalLoadErrors}

Check the detailed reports below for more information.
  `
}

---

## 📁 Report Artifacts

| Report | Location | Purpose |
|--------|----------|---------|
| **Unit Tests** | \`tests/reports/vitest/index.html\` | Detailed Vitest results with code coverage |
| **E2E Tests** | \`tests/reports/cypress/index.html\` | Detailed Cypress test execution results |
| **Code Coverage** | \`tests/reports/coverage/index.html\` | Statement, branch, and function coverage |
| **Load Results** | \`tests/reports/load/results.json\` | Raw load testing metrics |
| **Summary Data** | \`tests/reports/summary.json\` | Machine-readable summary |

---

## 🔍 Next Steps

${
  totalFailed > 0
    ? '1. Review failed tests in the detailed reports above\n2. Check test logs for error messages\n3. Run individual tests for debugging: `npm run test:ui`'
    : '1. Verify load test performance meets requirements\n2. Review code coverage reports\n3. Consider adding more tests for edge cases'
}

---

*Report generated on ${new Date(generatedAt).toLocaleString()}*
`

const summaryJson = {
  timestamp: new Date().toISOString(),
  status: overallStatus,
  totals: { tests: totalTests, passed: totalPassed, failed: totalFailed, passRate: passRate + '%' },
  vitest: { tests: vitestTotal, passed: vitestPassed, failed: vitestFailed, testDetails: vitestTests },
  cypress: { tests: cypressTotal, passed: cypressPassed, failed: cypressFailed, testDetails: cypressTests },
  coverage: { statements: avgStatements === 'N/A' ? 'N/A' : avgStatements + '%', branches: avgBranches === 'N/A' ? 'N/A' : avgBranches + '%', functions: avgFunctions === 'N/A' ? 'N/A' : avgFunctions + '%', lines: avgLines === 'N/A' ? 'N/A' : avgLines + '%', files: coverageData },
  load: {
    healthErrors,
    dialogueErrors,
    dialogueStressErrors,
    dialogueStressRuns,
    dialogueStressCompletedRuns,
    dialogueStressExpectedTurns,
    totalLoadErrors,
  },
}

fs.mkdirSync(REPORTS, { recursive: true })
fs.writeFileSync(path.join(REPORTS, 'summary.json'), JSON.stringify(summaryJson, null, 2))
fs.writeFileSync(path.join(REPORTS, 'summary.md'), md)
console.log('Generated: ' + path.join(REPORTS, 'summary.json'))
console.log('Generated: ' + path.join(REPORTS, 'summary.md'))
console.log(`Total errors: ${totalFailed + totalLoadErrors} ${totalFailed + totalLoadErrors === 0 ? '✔' : '✘'}`)
