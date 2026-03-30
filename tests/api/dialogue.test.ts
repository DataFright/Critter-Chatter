import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/openrouter', () => ({
  streamChat: vi.fn(async (
    _apiKey: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPrompt: string,
    onEvent: (event: { type: string; token?: string; content?: string; message?: string }) => void,
    signal?: AbortSignal,
  ) => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const prompt = systemPrompt.toLowerCase()
    let token = 'Reply'

    if (prompt.includes('chaos jinx')) token = 'Jinx line'
    else if (prompt.includes('volt fox')) token = 'Volt line'
    else if (prompt.includes('melancholy mabel')) token = 'Mabel line'
    else if (prompt.includes('joe')) token = 'Joe line'

    if (messages[0]?.content.includes('FORCE_ERROR')) {
      onEvent({ type: 'error', message: 'Dialogue exploded' })
      return
    }

    onEvent({ type: 'content', token, content: token })
    onEvent({ type: 'done', content: token })
  }),
}))

import { POST } from '@/app/api/chat/route'
import * as openrouter from '@/lib/openrouter'

const mockStreamChat = vi.mocked(openrouter.streamChat)

const defaultDialogueMock = async (
  _apiKey: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
  onEvent: (event: { type: string; token?: string; content?: string; message?: string }) => void,
  signal?: AbortSignal,
) => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const prompt = systemPrompt.toLowerCase()
  let token = 'Reply'

  if (prompt.includes('chaos jinx')) token = 'Jinx line'
  else if (prompt.includes('volt fox')) token = 'Volt line'
  else if (prompt.includes('melancholy mabel')) token = 'Mabel line'
  else if (prompt.includes('joe')) token = 'Joe line'

  if (messages[0]?.content.includes('FORCE_ERROR')) {
    onEvent({ type: 'error', message: 'Dialogue exploded' })
    return
  }

  onEvent({ type: 'content', token, content: token })
  onEvent({ type: 'done', content: token })
}

function makeRequest(body: string) {
  return new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
}

function readEvents(text: string) {
  return text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)))
}

describe('POST /api/chat — Dialogue Mode', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
    mockStreamChat.mockReset()
    mockStreamChat.mockImplementation(defaultDialogueMock)
  })

  it('starts dialogue mode with SSE response', async () => {
    const res = await POST(
      makeRequest(JSON.stringify({ mode: 'dialogue', speakerAId: 'joe', speakerBId: 'jinx' })),
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream; charset=utf-8')
  })

  it('rejects identical dialogue speakers', async () => {
    const res = await POST(
      makeRequest(JSON.stringify({ mode: 'dialogue', speakerAId: 'joe', speakerBId: 'joe' })),
    )

    expect(res.status).toBe(400)
  })

  it('rejects dialogue mode when speakers are omitted (defaults to identical)', async () => {
    const res = await POST(makeRequest(JSON.stringify({ mode: 'dialogue' })))

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Select two different characters')
  })

  it('makes the first selected speaker go first', async () => {
    const res = await POST(
      makeRequest(JSON.stringify({ mode: 'dialogue', speakerAId: 'mabel', speakerBId: 'volt' })),
    )
    const text = await res.text()

    expect(text.indexOf('"speakerId":"mabel"')).toBeGreaterThan(-1)
    expect(text.indexOf('"speakerId":"volt"')).toBeGreaterThan(text.indexOf('"speakerId":"mabel"'))
  })

  it('alternates speakers and feeds the previous line into the next turn', async () => {
    const res = await POST(
      makeRequest(JSON.stringify({ mode: 'dialogue', speakerAId: 'joe', speakerBId: 'jinx' })),
    )

    await res.text()

    expect(mockStreamChat).toHaveBeenCalled()
    expect((mockStreamChat.mock.calls[0][2] as string).toLowerCase()).toContain('joe')

    const prompts = mockStreamChat.mock.calls.map((call) => (call[2] as string).toLowerCase())
    const turnInputs = mockStreamChat.mock.calls.map((call) => call[1][0].content)

    expect(prompts.some((prompt) => prompt.includes('chaos jinx'))).toBe(true)
    expect(
      turnInputs.some((content) =>
        content.includes('just said:') && content.includes('Reply directly to that line'),
      ),
    ).toBe(true)
    expect(turnInputs.some((content) => content.includes('Jinx line'))).toBe(true)
  })

  it('streams a dialogue completion event', async () => {
    const res = await POST(
      makeRequest(JSON.stringify({ mode: 'dialogue', speakerAId: 'joe', speakerBId: 'jinx' })),
    )
    const text = await res.text()

    expect(text).toContain('dialogue_done')
  })

  it('emits error events when dialogue streaming fails', async () => {
    mockStreamChat.mockImplementation(async () => {
      throw new Error('Dialogue failed hard')
    })

    const res = await POST(
      makeRequest(JSON.stringify({ mode: 'dialogue', speakerAId: 'joe', speakerBId: 'jinx' })),
    )
    const text = await res.text()

    expect(res.status).toBe(200)
    expect(text).toContain('Dialogue failed hard')
  })

  it('uses character fallback line when a turn yields no dialogue content', async () => {
    mockStreamChat.mockImplementation(async (_apiKey, _messages, _systemPrompt, onEvent) => {
      onEvent({ type: 'done', content: '' })
    })

    const res = await POST(
      makeRequest(JSON.stringify({ mode: 'dialogue', speakerAId: 'joe', speakerBId: 'jinx' })),
    )
    const events = readEvents(await res.text())

    const firstMessage = events.find((event) => event.type === 'dialogue_message' && event.turn === 1)
    expect(events.find((event) => event.type === 'error')).toBeUndefined()
    expect(firstMessage?.content).toBe('Let me answer that clearly.')
  }, 12000)

  it('uses final done content when no incremental dialogue chunks are streamed', async () => {
    mockStreamChat.mockImplementationOnce(async (_apiKey, _messages, _systemPrompt, onEvent) => {
      onEvent({ type: 'done', content: 'Late final line' })
    })

    const res = await POST(
      makeRequest(JSON.stringify({ mode: 'dialogue', speakerAId: 'joe', speakerBId: 'jinx' })),
    )
    const events = readEvents(await res.text())

    const firstMessage = events.find((event) => event.type === 'dialogue_message' && event.turn === 1)
    expect(firstMessage?.content).toBe('Late final line')
  })

  it('retries an empty Jinx turn and uses the later non-empty response', async () => {
    let attempts = 0
    mockStreamChat.mockImplementation(async (_apiKey, _messages, _systemPrompt, onEvent) => {
      attempts += 1
      if (attempts === 1) {
        onEvent({ type: 'done', content: '' })
        return
      }

      onEvent({ type: 'done', content: 'Recovered line' })
    })

    const res = await POST(
      makeRequest(JSON.stringify({ mode: 'dialogue', speakerAId: 'jinx', speakerBId: 'mabel' })),
    )
    const events = readEvents(await res.text())

    const firstMessage = events.find((event) => event.type === 'dialogue_message' && event.turn === 1)
    expect(firstMessage?.content).toBe('Recovered line')
    expect(attempts).toBeGreaterThan(1)
  })
})