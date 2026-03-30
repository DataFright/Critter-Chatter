import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/openrouter')

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

describe('Error Handling — POST /api/chat', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
    mockStreamChat.mockClear()
    mockStreamChat.mockImplementation(async (_key, _msgs, _prompt, onEvent) => {
      onEvent({ type: 'done', content: 'ok' })
    })
  })

  describe('Input Validation', () => {
    it('rejects null body', async () => {
      const req = makeRequest('null')
      const res = await POST(req)
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBeTruthy()
    })

    it('rejects body without messages field', async () => {
      const res = await POST(makeRequest(JSON.stringify({ foo: 'bar' })))
      expect(res.status).toBe(400)
    })

    it('rejects messages as non-array', async () => {
      const res = await POST(makeRequest(JSON.stringify({ messages: 'not-array' })))
      expect(res.status).toBe(400)
    })

    it('rejects all messages with invalid role', async () => {
      const res = await POST(
        makeRequest(JSON.stringify({
          messages: [{ role: 'invalid', content: 'hello' }],
        })),
      )
      expect(res.status).toBe(400)
    })

    it('rejects messages with non-string content', async () => {
      const res = await POST(
        makeRequest(JSON.stringify({
          messages: [{ role: 'user', content: 123 }],
        })),
      )
      expect(res.status).toBe(400)
    })

    it('strips messages exceeding limit and keeps last 20', async () => {
      const messages = []
      for (let i = 0; i < 25; i++) {
        messages.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: `msg ${i}` })
      }
      mockStreamChat.mockImplementation(async (_key, msgs, _prompt, onEvent) => {
        expect(msgs).toHaveLength(20)
        onEvent({ type: 'done', content: 'ok' })
      })
      const res = await POST(makeRequest(JSON.stringify({ messages })))
      expect(res.status).toBe(200)
    })
  })

  describe('Error Events', () => {
    it('sends error event when streamChat throws', async () => {
      mockStreamChat.mockImplementation(() => {
        throw new Error('API unreachable')
      })
      const res = await POST(
        makeRequest(JSON.stringify({ messages: [{ role: 'user', content: 'test' }] })),
      )
      const events = await readSSE(res)
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: 'API unreachable',
        }),
      )
    })

    it('sends error event with unknown error', async () => {
      mockStreamChat.mockImplementation(() => {
        throw new Error('Network timeout')
      })
      const res = await POST(
        makeRequest(JSON.stringify({ messages: [{ role: 'user', content: 'test' }] })),
      )
      const events = await readSSE(res)
      expect(events.some((e) => e.type === 'error')).toBe(true)
    })
  })

  describe('Payload Filtering', () => {
    it('filters out messages with synthetic=true', async () => {
      mockStreamChat.mockImplementation(async (_key, msgs, _prompt, onEvent) => {
        expect(msgs).toHaveLength(1)
        expect(msgs[0].content).toBe('real message')
        onEvent({ type: 'done', content: 'ok' })
      })
      const res = await POST(
        makeRequest(JSON.stringify({
          messages: [
            { role: 'assistant', content: 'synthetic', synthetic: true },
            { role: 'user', content: 'real message' },
          ],
        })),
      )
      expect(res.status).toBe(200)
    })

    it('passes reasoning_details if present', async () => {
      mockStreamChat.mockImplementation(async (_key, msgs, _prompt, onEvent) => {
        expect(msgs[0].reasoning_details).toEqual([{ type: 'intent', value: 'ask' }])
        onEvent({ type: 'done', content: 'ok' })
      })
      const res = await POST(
        makeRequest(JSON.stringify({
          messages: [
            {
              role: 'assistant',
              content: 'response',
              reasoning_details: [{ type: 'intent', value: 'ask' }],
            },
          ],
        })),
      )
      expect(res.status).toBe(200)
    })
  })

  describe('API Key Validation', () => {
    it('returns 500 when API key is missing', async () => {
      delete process.env.OPENROUTER_API_KEY
      const res = await POST(
        makeRequest(JSON.stringify({ messages: [{ role: 'user', content: 'test' }] })),
      )
      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toContain('misconfigured')
    })
  })

  describe('Response Headers', () => {
    it('sets correct SSE headers', async () => {
      mockStreamChat.mockImplementation(async (_key, _msgs, _prompt, onEvent) => {
        onEvent({ type: 'done', content: 'response' })
      })
      const res = await POST(
        makeRequest(JSON.stringify({ messages: [{ role: 'user', content: 'test' }] })),
      )
      expect(res.headers.get('content-type')).toContain('text/event-stream')
      expect(res.headers.get('cache-control')).toContain('no-cache')
      expect(res.headers.get('connection')).toBe('keep-alive')
    })
  })

  describe('Character Selection', () => {
    it('uses Joe prompt for explicit joe characterId', async () => {
      const res = await POST(
        makeRequest(
          JSON.stringify({
            characterId: 'joe',
            messages: [{ role: 'user', content: 'test' }],
          }),
        ),
      )
      expect(res.status).toBe(200)
      expect(mockStreamChat).toHaveBeenCalled()
      expect(mockStreamChat.mock.calls[0][2]).toContain('You are Joe')
    })

    it('uses Jinx prompt for explicit jinx characterId', async () => {
      const res = await POST(
        makeRequest(
          JSON.stringify({
            characterId: 'jinx',
            messages: [{ role: 'user', content: 'test' }],
          }),
        ),
      )
      expect(res.status).toBe(200)
      expect(mockStreamChat).toHaveBeenCalled()
      expect(mockStreamChat.mock.calls[0][2]).toContain('You are Chaos Jinx')
    })

    it('uses Volt prompt for explicit volt characterId', async () => {
      const res = await POST(
        makeRequest(
          JSON.stringify({
            characterId: 'volt',
            messages: [{ role: 'user', content: 'test' }],
          }),
        ),
      )
      expect(res.status).toBe(200)
      expect(mockStreamChat).toHaveBeenCalled()
      expect(mockStreamChat.mock.calls[0][2]).toContain('You are Volt Fox')
    })
  })
})
