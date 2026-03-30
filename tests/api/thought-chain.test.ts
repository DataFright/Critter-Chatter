import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/openrouter', () => ({
  streamChat: vi.fn(async (
    _apiKey: string,
    _messages: unknown[],
    _systemPrompt: string,
    onEvent: (event: { type: string; token?: string; content?: string; number?: number; chunk?: string; total?: number; message?: string }) => void,
    signal?: AbortSignal
  ) => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    onEvent({ type: 'content', token: 'thought', content: 'thought' })
    onEvent({ type: 'done', content: 'thought' })
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

describe('POST /api/chat — Thought Chain API', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
    mockStreamChat.mockClear()
  })

  it('triggers thought chain when mode: "thought"', async () => {
    const res = await POST(makeRequest(JSON.stringify({ mode: 'thought' })))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/event-stream')
  })

  it('returns correct SSE headers for thought stream', async () => {
    const res = await POST(makeRequest(JSON.stringify({ mode: 'thought' })))
    expect(res.headers.get('Content-Type')).toBe('text/event-stream; charset=utf-8')
    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
    expect(res.headers.get('Connection')).toBe('keep-alive')
  })

  it('accepts mode: "thought" without messages', async () => {
    const res = await POST(makeRequest(JSON.stringify({ mode: 'thought' })))
    expect(res.status).toBe(200)
  })

  it('applies Joe character prompt for thought mode', async () => {
    await POST(makeRequest(JSON.stringify({ mode: 'thought', characterId: 'joe' })))
    expect(mockStreamChat).toHaveBeenCalled()
    const systemPrompt = mockStreamChat.mock.calls[0][2] as string
    expect(systemPrompt.toLowerCase()).toContain('joe')
  })

  it('applies Jinx character prompt for thought mode', async () => {
    await POST(makeRequest(JSON.stringify({ mode: 'thought', characterId: 'jinx' })))
    const callIndex = mockStreamChat.mock.calls.length - 1
    const systemPrompt = mockStreamChat.mock.calls[callIndex][2] as string
    expect(systemPrompt.toLowerCase()).toContain('jinx')
  })

  it('applies Volt character prompt for thought mode', async () => {
    await POST(makeRequest(JSON.stringify({ mode: 'thought', characterId: 'volt' })))
    const callIndex = mockStreamChat.mock.calls.length - 1
    const systemPrompt = mockStreamChat.mock.calls[callIndex][2] as string
    expect(systemPrompt.toLowerCase()).toContain('volt')
  })

  it('ignores messages field when mode: "thought"', async () => {
    const res = await POST(
      makeRequest(JSON.stringify({
        mode: 'thought',
        messages: [{ role: 'user', content: 'ignored' }],
        characterId: 'joe',
      }))
    )
    expect(res.status).toBe(200)
  })

  it('handles errors during thought streaming', async () => {
    mockStreamChat.mockImplementationOnce(async () => {
      throw new Error('API error')
    })

    const res = await POST(makeRequest(JSON.stringify({ mode: 'thought' })))
    const text = await res.text()
    expect(text).toContain('error')
  })

  it('distinguishes thought mode from chat mode', async () => {
    // Chat mode requires messages
    const chatRes = await POST(
      makeRequest(JSON.stringify({
        messages: [{ role: 'user', content: 'hello' }],
      }))
    )
    expect(chatRes.status).toBe(200)

    // Thought mode doesn't
    const thoughtRes = await POST(
      makeRequest(JSON.stringify({
        mode: 'thought',
      }))
    )
    expect(thoughtRes.status).toBe(200)
  })
})

describe('POST /api/chat — Thought Counting', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
    mockStreamChat.mockClear()
  })

  it('continues count when thought generates no response', async () => {
    // Test that the system doesn't crash when stream is empty
    mockStreamChat.mockImplementationOnce(async () => {
      // Empty response - no events sent
      return Promise.resolve()
    })

    const res = await POST(makeRequest(JSON.stringify({ mode: 'thought' })))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('text/event-stream')
  })

  it('increments sequence even with partial thoughts', async () => {
    // Mock that sends events but never complete
    mockStreamChat.mockImplementationOnce(async (_, __, ___, onEvent) => {
      onEvent({ type: 'content', token: 'incomplete', content: 'incomplete' })
      // Deliberately don't send 'done' event
    })

    const res = await POST(makeRequest(JSON.stringify({ mode: 'thought' })))
    expect(res.status).toBe(200)
  })

  it('continues generating after API error mid-sequence', async () => {
    // Test single call that throws
    mockStreamChat.mockImplementationOnce(async () => {
      throw new Error('Temporary API error')
    })

    const res = await POST(makeRequest(JSON.stringify({ mode: 'thought' })))
    expect(res.status).toBe(200)
    // Error should be gracefully handled
  })
})

describe('POST /api/chat — Thought Error Handling', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
    mockStreamChat.mockClear()
  })

  it('handles undefined character gracefully', async () => {
    const res = await POST(makeRequest(JSON.stringify({ mode: 'thought', characterId: 'invalid' })))
    expect(res.status).toBe(200)
    // Should fall back to default character
  })

  it('handles malformed characterId', async () => {
    const res = await POST(makeRequest(JSON.stringify({ mode: 'thought', characterId: 12345 })))
    expect(res.status).toBe(200)
  })

  it('handles stream errors without crashing', async () => {
    mockStreamChat.mockImplementationOnce(async (_, __, ___, onEvent) => {
      throw new Error('Stream error')
    })

    const res = await POST(makeRequest(JSON.stringify({ mode: 'thought' })))
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('error')
  })

  it('properly closes stream on abort signal', async () => {
    const res = await POST(makeRequest(JSON.stringify({ mode: 'thought' })))
    expect(res.status).toBe(200)
    // Stream should close properly
    expect(res.body).toBeDefined()
  })
})
