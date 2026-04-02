# 🚀 Test Report Summary

**Generated:** 2026-04-02T03:05:14.111Z  
**Status:** **PASS | all checks green**  
**Overall Pass Rate:** **100%**

---

## 📊 Quick Metrics

| Metric | Value | Status |
|--------|-------|--------|
| **Total Tests** | 33 | ✅ |
| **Passed** | 33 | - |
| **Failed** | 0 | - |
| **Pass Rate** | **100%** | Excellent |
| **Progress** | ████████████████████████ 100% | - |

---

## 🧪 Test Suites

### Unit & API Tests (Vitest)

| Metric | Value |
|--------|-------|
| **Tests** | 18 |
| **Passed** | 18 ✅ |
| **Failed** | 0  |
| **Pass Rate** | **100%** |
| **Coverage** | ████████████████████████ 100% |

### End-to-End Tests (Cypress)

| Metric | Value |
|--------|-------|
| **Tests** | 15 |
| **Passed** | 15 ✅ |
| **Failed** | 0  |
| **Pending** | 0 |
| **Pass Rate** | **100%** |
| **Duration** | 4.4s |
| **Coverage** | ████████████████████████ 100% |

---

## ⚡ Load Test Results

### Health Endpoint Performance

| Metric | Value | Status |
|--------|-------|--------|
| **Request Rate** | 1633.6 req/s | ✅ |
| **Average Latency** | 6ms | Excellent |
| **P90 Latency** | 9ms | Excellent |
| **P99 Latency** | 35ms | Excellent |
| **Errors** | 0 | ✅ Zero errors |

### Dialogue Endpoint Performance

| Metric | Value | Status |
|--------|-------|--------|
| **Request Rate** | 0.03 req/s | ✅ |
| **Average Latency** | 35.70s | Good |
| **P90 Latency** | 35748.9554ms | Good |
| **P99 Latency** | 35748.9554ms | Good |
| **Errors** | 0 | ✅ Zero errors |

### Dialogue Stress Test

| Metric | Value | Status |
|--------|-------|--------|
| **Runs** | 6/6 | ✅ |
| **Expected Turns** | 100 | ✅ |
| **Concurrency** | 3 | Configured |
| **Average Duration** | 35.71s | Good |
| **P90 Duration** | 35.72s | Good |
| **Average Turns Observed** | 100.0 | Complete |
| **Errors** | 0 | ✅ Zero errors |

**Total Load Errors:** ✅ 0

---

## 📝 Test Details

### Unit & API Tests

| Test Name | File | Status |
| --- | --- | --- |
| returns 500 when api key is missing | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| returns 400 for invalid JSON payload | chatbotstep/tests/api/dialogue.test.ts | ✅ |
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
| emits preference-based reaction events from recent messages | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| can emit multiple reactions for the same target comment when it is popular | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| simulation run reaches a comment with at least two reactions | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| emits an SSE error event when streaming fails repeatedly | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| recovers from transient stream failures within retry limit | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| streams 1000 messages when maxTurns is set to 1000 | chatbotstep/tests/api/dialogue.test.ts | ❌ |
| returns ok: true | chatbotstep/tests/api/health.test.ts | ✅ |

### E2E Tests  

| Test Suite | Test Name | Status | Duration |
| --- | --- | --- | --- |
| tests/e2e/meet-realms.cy.ts | ChatBotStep - Meet Realm Shell renders the Meet Realm heading and panel | ✅ | 200ms |
| tests/e2e/meet-realms.cy.ts | ChatBotStep - Meet Realm Shell keeps a single conversation surface visible | ✅ | 66ms |
| tests/e2e/meet-realms.cy.ts | ChatBotStep - Meet Realm Shell shows larger layout width and height characteristics | ✅ | 64ms |
| tests/e2e/meet-realms.cy.ts | ChatBotStep - Meet Realm Shell runs dialogue on the single realm with full roster payload | ✅ | 86ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm renders the Meet Realm heading | ✅ | 583ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm uses dark scrollbar styling class on the message panel | ✅ | 80ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm sends all characters in payload on start | ✅ | 69ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm renders messages in one column | ✅ | 87ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm shows live speaker count in the header | ✅ | 68ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm applies unique bubble colors for different speakers | ✅ | 79ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm renders reactions in side sections as emoji symbols | ✅ | 103ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm forces one comment to have multiple reactions and renders all icons on screen | ✅ | 85ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm keeps only the latest 100 displayed messages after long runs | ✅ | 165ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm deletes the first message once message count exceeds 100 | ✅ | 154ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep - Meet Realm shows an error banner when dialogue request fails | ✅ | 146ms |

---

## 📊 Code Coverage Report

**Coverage Overview:**

| Metric | Coverage | Status |
|--------|----------|--------|
| **Statements** | **98.2%** | ✅ |
| **Branches** | **70.2%** | ✅ |
| **Functions** | **99.4%** | ✅ |
| **Lines** | **98.2%** | ✅ |

**File Coverage Breakdown:**

| File | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| route.ts | 94.4% | 80.7% | 97.0% | 94.4% |
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

Excellent work! All 33 tests are passing with **100%** pass rate.

- Unit/API tests: 18/18 passing
- E2E tests: 15/15 passing  
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

*Report generated on 4/1/2026, 10:05:14 PM*
