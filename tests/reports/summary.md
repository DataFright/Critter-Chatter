# 🚀 Test Report Summary

**Generated:** 2026-03-31T19:29:02.948Z  
**Status:** **PASS | all checks green**  
**Overall Pass Rate:** **100%**

---

## 📊 Quick Metrics

| Metric | Value | Status |
|--------|-------|--------|
| **Total Tests** | 24 | ✅ |
| **Passed** | 24 | - |
| **Failed** | 0 | - |
| **Pass Rate** | **100%** | Excellent |
| **Progress** | ████████████████████████ 100% | - |

---

## 🧪 Test Suites

### Unit & API Tests (Vitest)

| Metric | Value |
|--------|-------|
| **Tests** | 12 |
| **Passed** | 12 ✅ |
| **Failed** | 0  |
| **Pass Rate** | **100%** |
| **Coverage** | ████████████████████████ 100% |

### End-to-End Tests (Cypress)

| Metric | Value |
|--------|-------|
| **Tests** | 12 |
| **Passed** | 12 ✅ |
| **Failed** | 0  |
| **Pending** | 0 |
| **Pass Rate** | **100%** |
| **Duration** | 5.6s |
| **Coverage** | ████████████████████████ 100% |

---

## ⚡ Load Test Results

### Health Endpoint Performance

| Metric | Value | Status |
|--------|-------|--------|
| **Request Rate** | 1631.4 req/s | ✅ |
| **Average Latency** | 6ms | Excellent |
| **P90 Latency** | 7ms | Excellent |
| **P99 Latency** | 37ms | Excellent |
| **Errors** | 0 | ✅ Zero errors |

### Dialogue Endpoint Performance

| Metric | Value | Status |
|--------|-------|--------|
| **Request Rate** | 144.42 req/s | ✅ |
| **Average Latency** | 7ms | Excellent |
| **P90 Latency** | 35.74109999999928ms | Excellent |
| **P99 Latency** | 35.74109999999928ms | Excellent |
| **Errors** | 0 | ✅ Zero errors |

### Dialogue Stress Test

| Metric | Value | Status |
|--------|-------|--------|
| **Runs** | 6/6 | ✅ |
| **Expected Turns** | 50 | ✅ |
| **Concurrency** | 3 | Configured |
| **Average Duration** | 4ms | Excellent |
| **P90 Duration** | 6ms | Excellent |
| **Average Turns Observed** | 50.0 | Complete |
| **Errors** | 0 | ✅ Zero errors |

**Total Load Errors:** ✅ 0

---

## 📝 Test Details

### Unit & API Tests

| Test Name | File | Status |
| --- | --- | --- |
| starts dialogue mode with SSE response | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| rejects duplicate dialogue speakers | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| rejects dialogue mode when speakers are omitted (defaults to duplicates) | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| rejects non-dialogue modes for Meet Realm-only API | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| makes the first selected speaker go first | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| rotates speakers and feeds the previous line into the next turn | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| streams 50 turns before completion | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| streams a dialogue completion event | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| emits error events when dialogue streaming fails | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| uses character fallback line when a turn yields no dialogue content | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| uses final done content when no incremental dialogue chunks are streamed | chatbotstep/tests/api/dialogue.test.ts | ✅ |
| retries an empty Jinx turn and uses the later non-empty response | chatbotstep/tests/api/dialogue.test.ts | ✅ |

### E2E Tests  

| Test Suite | Test Name | Status | Duration |
| --- | --- | --- | --- |
| tests/e2e/meet-realms.cy.ts | ChatBotStep — Meet Realm Shell renders the Meet Realm heading and panel | ✅ | 173ms |
| tests/e2e/meet-realms.cy.ts | ChatBotStep — Meet Realm Shell does not show add-realm controls anymore | ✅ | 51ms |
| tests/e2e/meet-realms.cy.ts | ChatBotStep — Meet Realm Shell keeps a single conversation surface visible | ✅ | 44ms |
| tests/e2e/meet-realms.cy.ts | ChatBotStep — Meet Realm Shell shows larger layout width and height characteristics | ✅ | 48ms |
| tests/e2e/meet-realms.cy.ts | ChatBotStep — Meet Realm Shell dialogue still runs on the single realm | ✅ | 430ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep — Meet Realm renders Meet Realm controls and default order text | ✅ | 306ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep — Meet Realm blocks starting when any selected speakers are identical | ✅ | 335ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep — Meet Realm starts dialogue mode and sends speaker ids in payload | ✅ | 576ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep — Meet Realm renders alternating streamed conversation messages | ✅ | 175ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep — Meet Realm switches to Stop while pending and back to Start when stopped | ✅ | 222ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep — Meet Realm shows real dialogue content and does not render fallback try-again lines | ✅ | 143ms |
| tests/e2e/conversation-realm.cy.ts | ChatBotStep — Meet Realm renders Jinx, Mabel, and Volt dialogue without fallback copy | ✅ | 592ms |

---

## 📊 Code Coverage Report

**Coverage Overview:**

| Metric | Coverage | Status |
|--------|----------|--------|
| **Statements** | **93.6%** | ✅ |
| **Branches** | **69.0%** | ⚠️ |
| **Functions** | **87.5%** | ✅ |
| **Lines** | **93.6%** | ✅ |

**File Coverage Breakdown:**

| File | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| route.ts | 82.4% | 76.1% | 87.5% | 82.4% |
| route.ts | 100.0% | 100.0% | 100.0% | 100.0% |
| conversation.ts | 100.0% | 50.0% | 100.0% | 100.0% |
| index.ts | 60.0% | 50.0% | 50.0% | 60.0% |
| jinx.ts | 100.0% | N/A | N/A | 100.0% |
| joe.ts | 100.0% | N/A | N/A | 100.0% |
| mabel.ts | 100.0% | N/A | N/A | 100.0% |
| prompt.ts | 100.0% | N/A | 100.0% | 100.0% |
| volt.ts | 100.0% | N/A | N/A | 100.0% |

---


### ✅ All Tests Passing!

Excellent work! All 24 tests are passing with **100%** pass rate.

- Unit/API tests: 12/12 passing
- E2E tests: 12/12 passing  
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

*Report generated on 3/31/2026, 2:29:02 PM*
