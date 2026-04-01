# 🚀 Test Report Summary

**Generated:** 2026-03-31T21:26:59.355Z  
**Status:** **PASS | all checks green**  
**Overall Pass Rate:** **100%**

---

## 📊 Quick Metrics

| Metric | Value | Status |
|--------|-------|--------|
| **Total Tests** | 21 | ✅ |
| **Passed** | 21 | - |
| **Failed** | 0 | - |
| **Pass Rate** | **100%** | Excellent |
| **Progress** | ████████████████████████ 100% | - |

---

## 🧪 Test Suites

### Unit & API Tests (Vitest)

| Metric | Value |
|--------|-------|
| **Tests** | 11 |
| **Passed** | 11 ✅ |
| **Failed** | 0  |
| **Pass Rate** | **100%** |
| **Coverage** | ████████████████████████ 100% |

### End-to-End Tests (Cypress)

| Metric | Value |
|--------|-------|
| **Tests** | 10 |
| **Passed** | 10 ✅ |
| **Failed** | 0  |
| **Pending** | 0 |
| **Pass Rate** | **100%** |
| **Duration** | 4.0s |
| **Coverage** | ████████████████████████ 100% |

---

## ⚡ Load Test Results

### Health Endpoint Performance

| Metric | Value | Status |
|--------|-------|--------|
| **Request Rate** | 1633.6 req/s | ✅ |
| **Average Latency** | 6ms | Excellent |
| **P90 Latency** | 7ms | Excellent |
| **P99 Latency** | 38ms | Excellent |
| **Errors** | 0 | ✅ Zero errors |

### Dialogue Endpoint Performance

| Metric | Value | Status |
|--------|-------|--------|
| **Request Rate** | 0.03 req/s | ✅ |
| **Average Latency** | 35.49s | Good |
| **P90 Latency** | 35533.80459999999ms | Good |
| **P99 Latency** | 35533.80459999999ms | Good |
| **Errors** | 0 | ✅ Zero errors |

### Dialogue Stress Test

| Metric | Value | Status |
|--------|-------|--------|
| **Runs** | 6/6 | ✅ |
| **Expected Turns** | 100 | ✅ |
| **Concurrency** | 3 | Configured |
| **Average Duration** | 35.47s | Good |
| **P90 Duration** | 35.52s | Good |
| **Average Turns Observed** | 100.0 | Complete |
| **Errors** | 0 | ✅ Zero errors |

**Total Load Errors:** ✅ 0

---

## 📝 Test Details

### Unit & API Tests

| Test Name | File | Status |
| --- | --- | --- |
| starts dialogue mode with SSE response | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| rejects duplicate dialogue speakers | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| rejects payloads with fewer than 3 speakers | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| rejects invalid speaker IDs | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| rejects non-dialogue modes for Meet Realm-only API | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| streams configured turns before completion when maxTurns is provided | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| randomizes the speaking block every 3 turns (unique within each block) | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| uses character fallback line when a turn yields no dialogue content | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| defaults to full roster when speakerIds are omitted | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| emits dialogue_done when maxTurns is provided | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| returns ok: true | chatbotstep/tests/api/health.test.ts | ✅ |

### E2E Tests  

| Test Suite | Test Name | Status | Duration |
| --- | --- | --- | --- |
| tests/e2e/meet-realms.cy.ts | ChatBotStep - Meet Realm Shell renders the Meet Realm heading and panel | ✅ | 189ms |
| tests/e2e/meet-realms.cy.ts | ChatBotStep - Meet Realm Shell keeps a single conversation surface visible | ✅ | 45ms |
| tests/e2e/meet-realms.cy.ts | ChatBotStep - Meet Realm Shell shows larger layout width and height characteristics | ✅ | 45ms |
| tests/e2e/meet-realms.cy.ts | ChatBotStep - Meet Realm Shell runs dialogue on the single realm with full roster payload | ✅ | 168ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm renders the full roster panel and random-order note | ✅ | 596ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm uses dark scrollbar styling class on the message panel | ✅ | 61ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm sends all characters in payload on start | ✅ | 151ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm renders messages in one column | ✅ | 154ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm shows live progress without a fixed turn cap | ✅ | 129ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm applies unique bubble colors for different speakers | ✅ | 153ms |

---

## 📊 Code Coverage Report

**Coverage Overview:**

| Metric | Coverage | Status |
|--------|----------|--------|
| **Statements** | **96.9%** | ✅ |
| **Branches** | **65.6%** | ⚠️ |
| **Functions** | **99.0%** | ✅ |
| **Lines** | **96.9%** | ✅ |

**File Coverage Breakdown:**

| File | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| route.ts | 75.9% | 62.5% | 95.2% | 75.9% |
| route.ts | 100.0% | 100.0% | 100.0% | 100.0% |
| conversation.ts | 100.0% | 50.0% | 100.0% | 100.0% |
| echo.ts | 100.0% | N/A | N/A | 100.0% |
| index.ts | 80.0% | 50.0% | 100.0% | 80.0% |
| jinx.ts | 100.0% | N/A | N/A | 100.0% |
| luma.ts | 100.0% | N/A | N/A | 100.0% |
| mabel.ts | 100.0% | N/A | N/A | 100.0% |
| nova.ts | 100.0% | N/A | N/A | 100.0% |
| prompt.ts | 100.0% | N/A | 100.0% | 100.0% |
| tempest.ts | 100.0% | N/A | N/A | 100.0% |
| velvet.ts | 100.0% | N/A | N/A | 100.0% |
| volt.ts | 100.0% | N/A | N/A | 100.0% |
| zeke.ts | 100.0% | N/A | N/A | 100.0% |

---


### ✅ All Tests Passing!

Excellent work! All 21 tests are passing with **100%** pass rate.

- Unit/API tests: 11/11 passing
- E2E tests: 10/10 passing  
- Load errors: 0 total
  

---

## 📁 Report Artifacts

| Report | Location | Purpose |
|--------|----------|---------|
| **Unit Tests** | `tests/reports/vitest/index.html` | Detailed Vitest results with code coverage |
| **E2E Tests** | `tests/reports/cypress/index.html` | Detailed Cypress test execution results |
| **Code Coverage** | `tests/reports/coverage/index.html` | Statement, branch, and function coverage |
| **Load Results** | `tests/reports/load/results.json` | Raw load testing metrics |
| **Summary Data** | `tests/reports/summary.json` | Machine-readable summary |

---

## 🔍 Next Steps

1. Verify load test performance meets requirements
2. Review code coverage reports
3. Consider adding more tests for edge cases

---

*Report generated on 3/31/2026, 4:26:59 PM*
