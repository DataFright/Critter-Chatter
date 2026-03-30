import { NextRequest, NextResponse } from 'next/server'
import { streamChat, type ChatMessage, type StreamEvent } from '@/lib/openrouter'
import {
  getCharacterById,
  buildThoughtChainSystemPrompt,
  getRandomInitialThought,
  buildConversationFallbackLine,
  buildConversationOpeningPrompt,
  buildConversationReplyPrompt,
  buildConversationTurnSystemPrompt,
} from '@/lib/characters'
import type { CharacterDefinition } from '@/lib/characters/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const THOUGHT_CHAIN_MAX = 50
const THOUGHT_CHAIN_DELAY_MS = 300
const DIALOGUE_MAX_TURNS = 12
const DIALOGUE_DELAY_MS = 350
const DIALOGUE_TURN_MAX_ATTEMPTS = 3
const DIALOGUE_TURN_RETRY_DELAY_MS = 150

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Server misconfigured: missing API key' }, { status: 500 })
  }

  let body: {
    messages?: unknown[]
    characterId?: unknown
    speakerAId?: unknown
    speakerBId?: unknown
    mode?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const mode =
    body.mode === 'thought' ? 'thought' : body.mode === 'dialogue' ? 'dialogue' : 'chat'

  if (mode === 'chat') {
    if (!Array.isArray(body?.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: 'messages is required' }, { status: 400 })
    }
  }

  const character = getCharacterById(typeof body.characterId === 'string' ? body.characterId : undefined)

  if (mode === 'thought') {
    return await handleThoughtChain(apiKey, character, req.signal)
  }

  if (mode === 'dialogue') {
    const speakerA = getCharacterById(typeof body.speakerAId === 'string' ? body.speakerAId : undefined)
    const speakerB = getCharacterById(typeof body.speakerBId === 'string' ? body.speakerBId : undefined)

    if (speakerA.id === speakerB.id) {
      return NextResponse.json({ error: 'Select two different characters' }, { status: 400 })
    }

    return await handleDialogue(apiKey, speakerA, speakerB, req.signal)
  }

  const messages: ChatMessage[] = (body.messages as Array<Record<string, unknown>>)
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        !m.synthetic,
    )
    .slice(-20)
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content as string,
      ...(Array.isArray(m.reasoning_details) ? { reasoning_details: m.reasoning_details } : {}),
    }))

  if (messages.length === 0) {
    return NextResponse.json({ error: 'No valid messages' }, { status: 400 })
  }

  if (process.env.MOCK_AI === '1') {
    const encoder = new TextEncoder()
    const mockContent = `Mock response from ${character.name}.`
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'content', token: mockContent, content: mockContent })}\n\n`),
        )
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', content: mockContent })}\n\n`))
        controller.close()
      },
    })

    return new Response(mockStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        if (req.signal.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }
        const encoded = encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        const desiredSize = controller.desiredSize ?? 1
        if (desiredSize < 0) {
          throw new Error('Stream backpressure exceeded')
        }
        controller.enqueue(encoded)
      }

      try {
        await streamChat(apiKey, messages, character.systemPrompt, send, req.signal)
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          send({ type: 'error', message: err.message })
        }
      } finally {
        if (!req.signal.aborted) {
          controller.close()
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

async function handleThoughtChain(apiKey: string, character: CharacterDefinition, signal: AbortSignal) {
  const encoder = new TextEncoder()
  const thoughtChainPrompt = buildThoughtChainSystemPrompt(character.name, character.traits)

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        if (signal.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }
        const encoded = encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        controller.enqueue(encoded)
      }

      try {
        let previousThought = getRandomInitialThought(character.name)

        for (let i = 0; i < THOUGHT_CHAIN_MAX; i++) {
          if (signal.aborted) break

          // Send thought_started event to indicate beginning of thought
          send({ type: 'thought_started' as const, number: i + 1 })

          // Build messages for this thought iteration
          const thoughtMessages: ChatMessage[] = [
            {
              role: 'assistant',
              content: previousThought,
            },
          ]

          let currentThought = ''

          // Stream this thought
          const collectThought = (event: StreamEvent) => {
            if (event.type === 'content' && (event.token || event.content)) {
              const chunk = event.token || event.content || ''
              currentThought += chunk
              send({ type: 'thought_chunk' as const, chunk, number: i + 1 })
            }

            if (event.type === 'done' && event.content && !currentThought.trim()) {
              currentThought = event.content
            }
          }

          await streamChat(apiKey, thoughtMessages, thoughtChainPrompt, collectThought, signal)

          if (currentThought) {
            previousThought = currentThought
            send({ type: 'thought_done' as const, thought: currentThought, number: i + 1 })
          }

          // Delay before next thought to avoid rate limiting
          if (i < THOUGHT_CHAIN_MAX - 1) {
            await sleep(THOUGHT_CHAIN_DELAY_MS)
          }
        }

        // Send completion event
        send({ type: 'thought_sequence_done' as const, total: THOUGHT_CHAIN_MAX })
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          send({ type: 'error', message: err.message })
        }
      } finally {
        if (!signal.aborted) {
          controller.close()
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

async function handleDialogue(
  apiKey: string,
  speakerA: CharacterDefinition,
  speakerB: CharacterDefinition,
  signal: AbortSignal,
) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        if (signal.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }
        const encoded = encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        controller.enqueue(encoded)
      }

      try {
        let previousLine = ''

        for (let turn = 0; turn < DIALOGUE_MAX_TURNS; turn++) {
          if (signal.aborted) break

          const speaker = turn % 2 === 0 ? speakerA : speakerB
          const listener = turn % 2 === 0 ? speakerB : speakerA

          const turnPrompt =
            turn === 0
              ? buildConversationOpeningPrompt(speaker, listener)
              : buildConversationReplyPrompt(speaker, listener, previousLine)

          const turnSystemPrompt = buildConversationTurnSystemPrompt(speaker, listener)

          send({
            type: 'dialogue_turn_started',
            turn: turn + 1,
            speakerId: speaker.id,
            speakerName: speaker.name,
            speakerAvatar: speaker.avatar,
          })

          let currentLine = ''
          let finalTurnError: Error | null = null

          for (let attempt = 0; attempt < DIALOGUE_TURN_MAX_ATTEMPTS; attempt++) {
            currentLine = ''
            let streamError: Error | null = null
            const turnMessages: ChatMessage[] = [
              {
                role: 'user',
                content:
                  attempt === 0
                    ? turnPrompt
                    : `${turnPrompt} Reply now with one short spoken line in character. Never leave the response empty. Do not mention errors, static, signals, or asking to try again.`,
              },
            ]

            try {
              await streamChat(
                apiKey,
                turnMessages,
                turnSystemPrompt,
                (event) => {
                  if (event.type === 'content' && (event.token || event.content)) {
                    const chunk = event.token || event.content || ''
                    currentLine += chunk
                    send({
                      type: 'dialogue_chunk',
                      turn: turn + 1,
                      speakerId: speaker.id,
                      speakerName: speaker.name,
                      speakerAvatar: speaker.avatar,
                      chunk,
                      content: currentLine,
                    })
                  }

                  if (event.type === 'done' && event.content && !currentLine.trim()) {
                    currentLine = event.content
                  }

                  if (event.type === 'error') {
                    streamError = new Error(event.message ?? 'Dialogue stream error')
                  }
                },
                signal,
              )
            } catch (err) {
              const error = err instanceof Error ? err : new Error(String(err))
              if (error.name === 'AbortError') {
                throw error
              }
              finalTurnError = error
            }

            if (streamError) {
              finalTurnError = streamError
            }

            if (currentLine.trim()) {
              finalTurnError = null
              break
            }

            if (signal.aborted) {
              break
            }

            if (attempt < DIALOGUE_TURN_MAX_ATTEMPTS - 1) {
              await sleep(DIALOGUE_TURN_RETRY_DELAY_MS)
            }
          }

          if (finalTurnError && !currentLine.trim()) {
            throw finalTurnError
          }

          const finalLine = currentLine.trim() || buildConversationFallbackLine(speaker)
          previousLine = finalLine

          send({
            type: 'dialogue_message',
            turn: turn + 1,
            speakerId: speaker.id,
            speakerName: speaker.name,
            speakerAvatar: speaker.avatar,
            content: finalLine,
          })

          if (turn < DIALOGUE_MAX_TURNS - 1) {
            await sleep(DIALOGUE_DELAY_MS)
          }
        }

        send({ type: 'dialogue_done', total: DIALOGUE_MAX_TURNS })
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          send({ type: 'error', message: err.message })
        }
      } finally {
        if (!signal.aborted) {
          controller.close()
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
