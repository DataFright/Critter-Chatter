import { NextRequest, NextResponse } from 'next/server'
import { streamChat, type ChatMessage, type StreamEvent } from '@/lib/openrouter'
import {
  ALL_CHARACTERS,
  buildConversationFallbackLine,
  buildConversationOpeningPrompt,
  buildConversationReplyPrompt,
  buildConversationTurnSystemPrompt,
  getCharacterById,
  isCharacterId,
} from '@/lib/characters'
import type { CharacterDefinition } from '@/lib/characters/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DIALOGUE_RANDOM_BLOCK_SIZE = 3
const DIALOGUE_MIN_SPEAKER_COUNT = 3
const DIALOGUE_DELAY_MS = 350
const DIALOGUE_TURN_MAX_ATTEMPTS = 3
const DIALOGUE_TURN_RETRY_DELAY_MS = 150

function shuffleCharacters(characters: CharacterDefinition[]) {
  const shuffled = [...characters]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return shuffled
}

function pickRandomSpeakerBlock(speakers: CharacterDefinition[]) {
  return shuffleCharacters(speakers).slice(0, Math.min(DIALOGUE_RANDOM_BLOCK_SIZE, speakers.length))
}

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

function parseSpeakerIds(body: {
  speakerIds?: unknown
  speakerAId?: unknown
  speakerBId?: unknown
  speakerCId?: unknown
  speakerDId?: unknown
}) {
  if (Array.isArray(body.speakerIds)) {
    return body.speakerIds.filter((value): value is string => typeof value === 'string')
  }

  return [body.speakerAId, body.speakerBId, body.speakerCId, body.speakerDId].filter(
    (value): value is string => typeof value === 'string',
  )
}

function parseMaxTurns(body: { maxTurns?: unknown }) {
  if (typeof body.maxTurns !== 'number' || !Number.isInteger(body.maxTurns)) {
    return null
  }

  return body.maxTurns > 0 ? body.maxTurns : null
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Server misconfigured: missing API key' }, { status: 500 })
  }

  let body: {
    speakerIds?: unknown
    speakerAId?: unknown
    speakerBId?: unknown
    speakerCId?: unknown
    speakerDId?: unknown
    maxTurns?: unknown
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

  const parsedSpeakerIds = parseSpeakerIds(body)
  const maxTurns = parseMaxTurns(body)
  const speakerIds =
    parsedSpeakerIds.length > 0
      ? parsedSpeakerIds
      : ALL_CHARACTERS.map((character) => character.id)

  if (speakerIds.length < DIALOGUE_MIN_SPEAKER_COUNT) {
    return NextResponse.json(
      { error: `Select at least ${DIALOGUE_MIN_SPEAKER_COUNT} characters` },
      { status: 400 },
    )
  }

  if (!speakerIds.every((id) => isCharacterId(id))) {
    return NextResponse.json({ error: 'One or more selected characters are invalid' }, { status: 400 })
  }

  const speakers = speakerIds.map((id) => getCharacterById(id))

  if (hasDuplicateCharacterIds(speakers)) {
    return NextResponse.json({ error: 'Select different characters' }, { status: 400 })
  }

  if (process.env.MOCK_AI === '1') {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let activeBlock = pickRandomSpeakerBlock(speakers)
        let turn = 0

        while (!req.signal.aborted && (maxTurns === null || turn < maxTurns)) {
          if (turn > 0 && turn % DIALOGUE_RANDOM_BLOCK_SIZE === 0) {
            activeBlock = pickRandomSpeakerBlock(speakers)
          }

          const blockTurnIndex = turn % DIALOGUE_RANDOM_BLOCK_SIZE
          const speaker = activeBlock[Math.min(blockTurnIndex, activeBlock.length - 1)]
          const turnNumber = turn + 1

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'dialogue_turn_started',
            turn: turnNumber,
            speakerId: speaker.id,
            speakerName: speaker.name,
            speakerAvatar: speaker.avatar,
          })}\n\n`))

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'dialogue_message',
            turn: turnNumber,
            speakerId: speaker.id,
            speakerName: speaker.name,
            speakerAvatar: speaker.avatar,
            content: `${speaker.name} mock turn ${turnNumber}.`,
          })}\n\n`))

          turn += 1
          await sleep(getDialogueDelayMs())
        }

        if (maxTurns !== null && !req.signal.aborted) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'dialogue_done', total: maxTurns })}\n\n`))
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

  return handleDialogue(apiKey, speakers, req.signal, maxTurns)
}

async function handleDialogue(
  apiKey: string,
  speakers: CharacterDefinition[],
  signal: AbortSignal,
  maxTurns: number | null,
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
        let activeBlock = pickRandomSpeakerBlock(speakers)

        let turn = 0

        while (!signal.aborted && (maxTurns === null || turn < maxTurns)) {

          if (turn > 0 && turn % DIALOGUE_RANDOM_BLOCK_SIZE === 0) {
            activeBlock = pickRandomSpeakerBlock(speakers)
          }

          const blockTurnIndex = turn % DIALOGUE_RANDOM_BLOCK_SIZE
          const speaker = activeBlock[Math.min(blockTurnIndex, activeBlock.length - 1)]
          const listener = activeBlock[(blockTurnIndex + 1) % activeBlock.length]

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

          turn += 1

          if (!signal.aborted && (maxTurns === null || turn < maxTurns)) {
            await sleep(dialogueDelayMs)
          }
        }

        if (maxTurns !== null && !signal.aborted) {
          send({ type: 'dialogue_done', total: maxTurns })
        }
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
