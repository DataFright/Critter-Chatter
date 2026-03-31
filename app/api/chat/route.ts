import { NextRequest, NextResponse } from 'next/server'
import { streamChat, type ChatMessage, type StreamEvent } from '@/lib/openrouter'
import {
  buildConversationFallbackLine,
  buildConversationOpeningPrompt,
  buildConversationReplyPrompt,
  buildConversationTurnSystemPrompt,
  getCharacterById,
} from '@/lib/characters'
import type { CharacterDefinition } from '@/lib/characters/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DIALOGUE_MAX_TURNS = 50
const DIALOGUE_DELAY_MS = 350
const DIALOGUE_TURN_MAX_ATTEMPTS = 3
const DIALOGUE_TURN_RETRY_DELAY_MS = 150

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function hasDuplicateCharacterIds(characters: CharacterDefinition[]) {
  return new Set(characters.map((character) => character.id)).size !== characters.length
}

function getDialogueDelayMs() {
  return process.env.NODE_ENV === 'test' ? 0 : DIALOGUE_DELAY_MS
}

function getRetryDelayMs() {
  return process.env.NODE_ENV === 'test' ? 0 : DIALOGUE_TURN_RETRY_DELAY_MS
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Server misconfigured: missing API key' }, { status: 500 })
  }

  let body: {
    speakerAId?: unknown
    speakerBId?: unknown
    speakerCId?: unknown
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

  if (body.mode && body.mode !== 'dialogue') {
    return NextResponse.json({ error: 'Meet Realm only supports dialogue mode' }, { status: 400 })
  }

  const speakerA = getCharacterById(typeof body.speakerAId === 'string' ? body.speakerAId : undefined)
  const speakerB = getCharacterById(typeof body.speakerBId === 'string' ? body.speakerBId : undefined)
  const speakerC = getCharacterById(typeof body.speakerCId === 'string' ? body.speakerCId : undefined)

  const speakers = [speakerA, speakerB, speakerC]

  if (hasDuplicateCharacterIds(speakers)) {
    return NextResponse.json({ error: 'Select three different characters' }, { status: 400 })
  }

  if (process.env.MOCK_AI === '1') {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const events: StreamEvent[] = []

        for (let turn = 0; turn < DIALOGUE_MAX_TURNS; turn += 1) {
          const speaker = speakers[turn % speakers.length]
          const turnNumber = turn + 1

          events.push({
            type: 'dialogue_turn_started',
            turn: turnNumber,
            speakerId: speaker.id,
            speakerName: speaker.name,
            speakerAvatar: speaker.avatar,
          })

          events.push({
            type: 'dialogue_message',
            turn: turnNumber,
            speakerId: speaker.id,
            speakerName: speaker.name,
            speakerAvatar: speaker.avatar,
            content: `${speaker.name} mock turn ${turnNumber}.`,
          })
        }

        events.push({ type: 'dialogue_done', total: DIALOGUE_MAX_TURNS })

        for (const event of events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }

        controller.close()
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

  return handleDialogue(apiKey, speakers, req.signal)
}

async function handleDialogue(
  apiKey: string,
  speakers: CharacterDefinition[],
  signal: AbortSignal,
) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        if (signal.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        let previousLine = ''
        const dialogueDelayMs = getDialogueDelayMs()
        const retryDelayMs = getRetryDelayMs()

        for (let turn = 0; turn < DIALOGUE_MAX_TURNS; turn++) {
          if (signal.aborted) break

          const speaker = speakers[turn % speakers.length]
          const listener = speakers[(turn + 1) % speakers.length]

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
              await sleep(retryDelayMs)
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
            await sleep(dialogueDelayMs)
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
