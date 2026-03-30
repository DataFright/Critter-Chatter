import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/openrouter', () => ({
  streamChat: vi.fn(async (_apiKey: string, _messages: unknown[], _systemPrompt: string, onEvent: (event: { type: string; token?: string; content?: string }) => void) => {
    onEvent({ type: 'content', token: 'Chaos!', content: 'Chaos!' })
    onEvent({ type: 'done', content: 'Chaos!' })
  }),
}))

import { POST } from '@/app/api/chat/route'
import * as openrouter from '@/lib/openrouter'

const mockStreamChat = vi.mocked(openrouter.streamChat)

function makeRequest(body: string) {
  return new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

async function readSSE(res: Response) {
  const text = await res.text()
  return text
    .split('\n')
    .filter((l) => l.startsWith('data: '))
    .map((l) => JSON.parse(l.slice(6)))
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
    mockStreamChat.mockClear()
  })

  it('rejects missing messages', async () => {
    const res = await POST(makeRequest(JSON.stringify({})))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })

  it('rejects empty messages array', async () => {
    const res = await POST(makeRequest(JSON.stringify({ messages: [] })))
    expect(res.status).toBe(400)
  })

  it('rejects invalid JSON', async () => {
    const res = await POST(makeRequest('not json'))
    expect(res.status).toBe(400)
  })

  it('streams SSE with content-type text/event-stream', async () => {
    const res = await POST(
      makeRequest(JSON.stringify({ messages: [{ role: 'user', content: 'hey jinx' }] })),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
  })

  it('SSE stream contains content and done events', async () => {
    const res = await POST(
      makeRequest(JSON.stringify({ messages: [{ role: 'user', content: 'cause chaos' }] })),
    )
    const events = await readSSE(res)
    const types = events.map((e) => e.type)
    expect(types).toContain('content')
    expect(types).toContain('done')
  })

  it('strips synthetic messages before sending', async () => {
    const res = await POST(
      makeRequest(
        JSON.stringify({
          messages: [
            { role: 'assistant', content: 'synthetic greeting', synthetic: true },
            { role: 'user', content: 'first real message' },
          ],
        }),
      ),
    )
    expect(res.status).toBe(200)
  })

  it('returns 400 when all messages are synthetic', async () => {
    const res = await POST(
      makeRequest(
        JSON.stringify({
          messages: [{ role: 'assistant', content: 'only synthetic', synthetic: true }],
        }),
      ),
    )
    expect(res.status).toBe(400)
  })

  it('uses default Joe prompt when characterId is omitted', async () => {
    const res = await POST(
      makeRequest(JSON.stringify({ messages: [{ role: 'user', content: 'who are you' }] })),
    )
    expect(res.status).toBe(200)
    expect(mockStreamChat).toHaveBeenCalled()
    expect(mockStreamChat.mock.calls[0][2]).toContain('You are Joe')
  })

  it('falls back to Joe prompt for unknown characterId', async () => {
    const res = await POST(
      makeRequest(
        JSON.stringify({
          characterId: 'unknown-character',
          messages: [{ role: 'user', content: 'test fallback' }],
        }),
      ),
    )
    expect(res.status).toBe(200)
    expect(mockStreamChat).toHaveBeenCalled()
    expect(mockStreamChat.mock.calls[0][2]).toContain('You are Joe')
  })

  it('uses Volt prompt for explicit volt characterId', async () => {
    const res = await POST(
      makeRequest(
        JSON.stringify({
          characterId: 'volt',
          messages: [{ role: 'user', content: 'deliver this' }],
        }),
      ),
    )
    expect(res.status).toBe(200)
    expect(mockStreamChat).toHaveBeenCalled()
    expect(mockStreamChat.mock.calls[0][2]).toContain('You are Volt Fox')
  })
})
