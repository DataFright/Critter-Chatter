import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { ChatMessage, StreamEvent } from '@/lib/openrouter'
import { ALL_CHARACTERS } from '@/lib/characters'

vi.mock('@/lib/openrouter', () => ({
  streamChat: vi.fn(async (
    _apiKey: string,
    messages: ChatMessage[],
    systemPrompt: string,
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal,
  ) => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const prompt = systemPrompt.toLowerCase()
    let token = 'Reply'

    if (prompt.includes('chaos jinx')) token = 'Jinx line'
    else if (prompt.includes('volt fox')) token = 'Volt line'
    else if (prompt.includes('melancholy mabel')) token = 'Mabel line'
    else if (prompt.includes('zany zeke')) token = 'Zeke line'
    else if (prompt.includes('nova embermind')) token = 'Nova line'
    else if (prompt.includes('velvet whisper')) token = 'Velvet line'
    else if (prompt.includes('iron tempest')) token = 'Tempest line'
    else if (prompt.includes('drift luma')) token = 'Luma line'
    else if (prompt.includes('abyssal echo')) token = 'Echo line'

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
  messages: ChatMessage[],
  systemPrompt: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
) => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const prompt = systemPrompt.toLowerCase()
  let token = 'Reply'

  if (prompt.includes('chaos jinx')) token = 'Jinx line'
  else if (prompt.includes('volt fox')) token = 'Volt line'
  else if (prompt.includes('melancholy mabel')) token = 'Mabel line'
  else if (prompt.includes('zany zeke')) token = 'Zeke line'
  else if (prompt.includes('nova embermind')) token = 'Nova line'
  else if (prompt.includes('velvet whisper')) token = 'Velvet line'
  else if (prompt.includes('iron tempest')) token = 'Tempest line'
  else if (prompt.includes('drift luma')) token = 'Luma line'
  else if (prompt.includes('abyssal echo')) token = 'Echo line'

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
    const res = await POST(makeRequest(JSON.stringify({ mode: 'dialogue' })))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/event-stream; charset=utf-8')
  })

  it('rejects duplicate dialogue speakers', async () => {
    const res = await POST(
      makeRequest(JSON.stringify({ mode: 'dialogue', speakerIds: ['jinx', 'jinx', 'mabel'] })),
    )

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('different')
  })

  it('rejects payloads with fewer than 3 speakers', async () => {
    const res = await POST(
      makeRequest(JSON.stringify({ mode: 'dialogue', speakerIds: ['jinx', 'volt'] })),
    )

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('at least 3')
  })

  it('rejects invalid speaker IDs', async () => {
    const res = await POST(
      makeRequest(JSON.stringify({ mode: 'dialogue', speakerIds: ['jinx', 'volt', 'unknown'] })),
    )

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('invalid')
  })

  it('rejects non-dialogue modes for Meet Realm-only API', async () => {
    const res = await POST(makeRequest(JSON.stringify({ mode: 'thought' })))

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Meet Realm only supports dialogue mode')
  })

  it('streams configured turns before completion when maxTurns is provided', async () => {
    const res = await POST(makeRequest(JSON.stringify({ mode: 'dialogue', maxTurns: 12 })))
    const events = readEvents(await res.text())

    const messageEvents = events.filter((event) => event.type === 'dialogue_message')
    const doneEvent = events.find((event) => event.type === 'dialogue_done')

    expect(messageEvents).toHaveLength(12)
    expect(doneEvent?.total).toBe(12)
  }, 20000)

  it('randomizes the speaking block every 3 turns (unique within each block)', async () => {
    const selectedIds = ['jinx', 'volt', 'mabel', 'zeke', 'nova', 'velvet']
    const res = await POST(makeRequest(JSON.stringify({ mode: 'dialogue', speakerIds: selectedIds, maxTurns: 12 })))
    const events = readEvents(await res.text())

    const messageEvents = events.filter((event) => event.type === 'dialogue_message')

    expect(messageEvents.length).toBe(12)

    for (let start = 0; start < 9; start += 3) {
      const block = messageEvents.slice(start, start + 3)
      const blockIds = block.map((event) => event.speakerId)
      expect(new Set(blockIds).size).toBe(block.length)
      expect(blockIds.every((id) => selectedIds.includes(id))).toBe(true)
    }
  }, 20000)

  it('uses character fallback line when a turn yields no dialogue content', async () => {
    mockStreamChat.mockImplementation(async (_apiKey, _messages, _systemPrompt, onEvent) => {
      onEvent({ type: 'done', content: '' })
    })

    const res = await POST(makeRequest(JSON.stringify({ mode: 'dialogue', maxTurns: 1 })))
    const events = readEvents(await res.text())

    const firstMessage = events.find((event) => event.type === 'dialogue_message' && event.turn === 1)
    const fallbackLines = [
      'My punchline darted sideways.',
      'The spark catches again now.',
      'The silence answered first.',
      'I missed the jump. Rewind me.',
      'The idea flared out. Another pass.',
      'The whisper slipped. Continue.',
      'Control slipped for a second. I am steady now.',
      'The current blurred. Let me drift back in.',
      'The depth answered late. I can speak again.',
    ]

    expect(events.find((event) => event.type === 'error')).toBeUndefined()
    expect(fallbackLines).toContain(firstMessage?.content)
  }, 20000)

  it('defaults to full roster when speakerIds are omitted', async () => {
    const res = await POST(makeRequest(JSON.stringify({ mode: 'dialogue', maxTurns: 9 })))

    const events = readEvents(await res.text())

    expect(events.filter((event) => event.type === 'dialogue_message')).toHaveLength(9)
    expect(events.find((event) => event.type === 'dialogue_done')?.total).toBe(9)
    expect(mockStreamChat).toHaveBeenCalled()
    expect(ALL_CHARACTERS.length).toBeGreaterThanOrEqual(9)
  }, 20000)

  it('emits dialogue_done when maxTurns is provided', async () => {
    const res = await POST(makeRequest(JSON.stringify({ mode: 'dialogue', maxTurns: 3 })))
    const events = readEvents(await res.text())

    expect(events.find((event) => event.type === 'dialogue_done')?.total).toBe(3)
  })
})
