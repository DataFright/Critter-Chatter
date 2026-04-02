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
const DIALOGUE_REACTION_LOOKBACK = 8
const DIALOGUE_REACTION_MIN_SCORE = 2
const DIALOGUE_REACTION_MULTI_MIN_SCORE = 4
const DIALOGUE_REACTION_POPULARITY_BONUS_CAP = 3
const DIALOGUE_REACTION_MAX_PER_TURN = 3

interface DialogueHistoryEntry {
  turn: number
  speakerId: string
  speakerName: string
  content: string
}

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

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3)
}

function getPositivePreferenceTokens(character: CharacterDefinition) {
  return new Set(
    tokenize(
      [
        ...character.traits.likes,
        ...character.traits.characteristics,
        character.traits.personality,
      ].join(' '),
    ),
  )
}

function getNegativePreferenceTokens(character: CharacterDefinition) {
  return new Set(tokenize(character.traits.dislikes.join(' ')))
}

function scoreReactionForMessage(
  reactor: CharacterDefinition,
  target: DialogueHistoryEntry,
  recencyRank: number,
) {
  const tokens = new Set(tokenize(target.content))
  if (tokens.size === 0) return 0

  const positiveTokens = getPositivePreferenceTokens(reactor)
  const negativeTokens = getNegativePreferenceTokens(reactor)

  let positiveMatches = 0
  let negativeMatches = 0

  for (const token of tokens) {
    if (positiveTokens.has(token)) {
      positiveMatches += 1
    }
    if (negativeTokens.has(token)) {
      negativeMatches += 1
    }
  }

  if (positiveMatches === 0) {
    return 0
  }

  const recencyBonus = Math.max(0, 2 - recencyRank)
  return positiveMatches * 2 + recencyBonus - negativeMatches * 2
}

function buildReactionLine(reactor: CharacterDefinition, targetSpeakerName: string, score: number) {
  if (score >= 6) {
    return `${reactor.avatar} loves this from ${targetSpeakerName}`
  }

  if (score >= 4) {
    return `${reactor.avatar} is into ${targetSpeakerName}'s take`
  }

  return `${reactor.avatar} nods at ${targetSpeakerName}`
}

function pickReactionEvents(
  speakers: CharacterDefinition[],
  latestSpeakerId: string,
  history: DialogueHistoryEntry[],
  reactionCountByTurn: Map<number, number>,
): StreamEvent[] {
  if (history.length === 0) {
    return []
  }

  const recent = history.slice(-DIALOGUE_REACTION_LOOKBACK)
  const candidates: Array<{
    reactor: CharacterDefinition
    target: DialogueHistoryEntry
    score: number
    recencyRank: number
  }> = []

  for (const reactor of speakers) {
    if (reactor.id === latestSpeakerId) {
      continue
    }

    let bestForReactor:
      | {
          target: DialogueHistoryEntry
          score: number
          recencyRank: number
        }
      | null = null

    for (let index = recent.length - 1; index >= 0; index -= 1) {
      const target = recent[index]
      if (target.speakerId === reactor.id) {
        continue
      }

      const recencyRank = recent.length - 1 - index
      const baseScore = scoreReactionForMessage(reactor, target, recencyRank)
      const popularityBonus = Math.min(
        DIALOGUE_REACTION_POPULARITY_BONUS_CAP,
        reactionCountByTurn.get(target.turn) ?? 0,
      )
      const score = baseScore + popularityBonus

      if (!bestForReactor || score > bestForReactor.score) {
        bestForReactor = { target, score, recencyRank }
      }
    }

    if (bestForReactor) {
      candidates.push({ reactor, ...bestForReactor })
    }
  }

  const multiReactions = candidates
    .filter((candidate) => candidate.score >= DIALOGUE_REACTION_MULTI_MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.recencyRank - b.recencyRank)
    .slice(0, DIALOGUE_REACTION_MAX_PER_TURN)

  const selected = multiReactions.length > 0
    ? multiReactions
    : candidates
        .filter((candidate) => candidate.score >= DIALOGUE_REACTION_MIN_SCORE)
        .sort((a, b) => b.score - a.score || a.recencyRank - b.recencyRank)
        .slice(0, 1)

  if (selected.length === 0) {
    return []
  }

  return selected.map((item) => ({
    type: 'dialogue_reaction',
    turn: item.target.turn,
    targetTurn: item.target.turn,
    speakerId: item.reactor.id,
    speakerName: item.reactor.name,
    speakerAvatar: item.reactor.avatar,
    targetSpeakerId: item.target.speakerId,
    targetSpeakerName: item.target.speakerName,
    reactionScore: item.score,
    content: buildReactionLine(item.reactor, item.target.speakerName, item.score),
  }))
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
        const history: DialogueHistoryEntry[] = []
        const reactionCountByTurn = new Map<number, number>()

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
            content: `${speaker.name} mock turn ${turnNumber}. I like speed and strategy.`,
          })}\n\n`))

          history.push({
            turn: turnNumber,
            speakerId: speaker.id,
            speakerName: speaker.name,
            content: `${speaker.name} mock turn ${turnNumber}. I like speed and strategy.`,
          })

          const reactionEvents = pickReactionEvents(speakers, speaker.id, history, reactionCountByTurn)
          for (const reactionEvent of reactionEvents) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(reactionEvent)}\n\n`))
            reactionCountByTurn.set(
              reactionEvent.targetTurn ?? 0,
              (reactionCountByTurn.get(reactionEvent.targetTurn ?? 0) ?? 0) + 1,
            )
          }

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
        const history: DialogueHistoryEntry[] = []
        const reactionCountByTurn = new Map<number, number>()

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

          history.push({
            turn: turn + 1,
            speakerId: speaker.id,
            speakerName: speaker.name,
            content: finalLine,
          })

          const reactionEvents = pickReactionEvents(speakers, speaker.id, history, reactionCountByTurn)
          for (const reactionEvent of reactionEvents) {
            send(reactionEvent)
            reactionCountByTurn.set(
              reactionEvent.targetTurn ?? 0,
              (reactionCountByTurn.get(reactionEvent.targetTurn ?? 0) ?? 0) + 1,
            )
          }

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
          try {
            send({ type: 'error', message: err.message })
          } catch {
            // Ignore failures to emit an error event when stream is already closing.
          }
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
