# ChatBotStep — Meet Realm

Meet Realm is a dialogue-focused Next.js app where three characters rotate through short, in-character turns.

## What This App Includes

- Single Meet Realm interface
- Three-character rotating dialogue streaming from `/api/chat`
- Turn-by-turn SSE events (`dialogue_turn_started`, `dialogue_chunk`, `dialogue_message`, `dialogue_done`)
- Retry handling for empty model turns with character-specific fallback lines
- Stress coverage for full 50-turn conversations

## Requirements

- Node.js 20+
- npm

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Set `OPENROUTER_API_KEY` in `.env.local`:

```env
OPENROUTER_API_KEY=your_key_here
```

## Test Commands

```bash
npm run test:run        # Vitest
npm run test:e2e        # Cypress against production build
npm run test:load       # Autocannon load checks
npm run test:stress     # Full 50-turn stress runs with mock SSE output
npm run test:all        # Full pipeline + summary reports
```

## Reports

After test runs, reports are generated under `tests/reports/`:

- `tests/reports/vitest/index.html`
- `tests/reports/cypress/index.html`
- `tests/reports/summary.md`
- `tests/reports/summary.json`
