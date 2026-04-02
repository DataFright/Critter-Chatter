'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ALL_CHARACTERS } from '@/lib/characters'

const INITIAL_SPEAKER_IDS = ALL_CHARACTERS.map((character) => character.id)
const MAX_DISPLAY_MESSAGES = 100

export interface ConversationMessage {
  id: string
  kind: 'message' | 'reaction'
  turn: number
  speakerId: string
  speakerName: string
  speakerAvatar: string
  content: string
  targetTurn?: number
  targetSpeakerId?: string
  targetSpeakerName?: string
  reactionScore?: number
}

function makeMessageId(turn: number, speakerId: string) {
  return `conversation-${turn}-${speakerId}`
}

function makeReactionId(targetTurn: number, reactorId: string) {
  return `reaction-${targetTurn}-${reactorId}`
}

function shuffleSpeakerIds(): string[] {
  const ids = ALL_CHARACTERS.map((character) => character.id)

  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }

  return ids
}

function capDisplayedMessages(messages: ConversationMessage[]) {
  const orderedTurns = messages
    .filter((message) => message.kind === 'message')
    .map((message) => message.turn)
    .sort((a, b) => a - b)

  if (orderedTurns.length <= MAX_DISPLAY_MESSAGES) {
    return messages
  }

  const turnsToDrop = new Set(orderedTurns.slice(0, orderedTurns.length - MAX_DISPLAY_MESSAGES))

  return messages.filter((message) => {
    if (message.kind === 'message') {
      return !turnsToDrop.has(message.turn)
    }

    return !turnsToDrop.has(message.targetTurn ?? -1)
  })
}

export function useConversationRealm() {
  const [speakerIds, setSpeakerIds] = useState<string[]>(INITIAL_SPEAKER_IDS)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const autoStartedRef = useRef(false)

  useEffect(() => {
    setSpeakerIds(shuffleSpeakerIds())
  }, [])

  const resetConversation = useCallback(() => {
    setMessages([])
    setError('')
  }, [])

  const stopConversation = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsRunning(false)
  }, [])

  const appendOrUpdateMessage = useCallback(
    (turn: number, speakerId: string, speakerName: string, speakerAvatar: string, content: string) => {
      const id = makeMessageId(turn, speakerId)

      setMessages((prev) => {
        const existing = prev.find((message) => message.id === id)
        if (existing) {
          const updated = prev.map((message) =>
            message.id === id ? { ...message, content } : message,
          )
          return capDisplayedMessages(updated)
        }

        const updated = [
          ...prev,
          {
            id,
            kind: 'message' as const,
            turn,
            speakerId,
            speakerName,
            speakerAvatar,
            content,
          },
        ]

        return capDisplayedMessages(updated)
      })
    },
    [],
  )

  const appendOrUpdateReaction = useCallback(
    (
      reactorId: string,
      reactorName: string,
      reactorAvatar: string,
      targetTurn: number,
      targetSpeakerId: string,
      targetSpeakerName: string,
      content: string,
      reactionScore?: number,
    ) => {
      const id = makeReactionId(targetTurn, reactorId)

      setMessages((prev) => {
        const hasTargetMessage = prev.some(
          (message) => message.kind === 'message' && message.turn === targetTurn,
        )

        if (!hasTargetMessage) {
          return prev
        }

        const existing = prev.find((message) => message.id === id)
        if (existing) {
          const updated = prev.map((message) =>
            message.id === id
              ? { ...message, content, reactionScore }
              : message,
          )
          return capDisplayedMessages(updated)
        }

        const updated = [
          ...prev,
          {
            id,
            kind: 'reaction' as const,
            turn: targetTurn,
            speakerId: reactorId,
            speakerName: reactorName,
            speakerAvatar: reactorAvatar,
            content,
            targetTurn,
            targetSpeakerId,
            targetSpeakerName,
            reactionScore,
          },
        ]

        return capDisplayedMessages(updated)
      })
    },
    [],
  )

  const startConversation = useCallback(async () => {
    if (isRunning) return

    const selectedSpeakerIds = speakerIds.length ? speakerIds : INITIAL_SPEAKER_IDS
    resetConversation()
    setIsRunning(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'dialogue',
          speakerIds: selectedSpeakerIds,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')

        for (let index = 0; index < lines.length - 1; index++) {
          const line = lines[index]
          if (!line.startsWith('data: ')) continue

          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string
              turn?: number
              total?: number
              speakerId?: string
              speakerName?: string
              speakerAvatar?: string
              targetTurn?: number
              targetSpeakerId?: string
              targetSpeakerName?: string
              reactionScore?: number
              chunk?: string
              content?: string
              message?: string
            }

            if (
              event.type === 'dialogue_turn_started' &&
              event.turn &&
              event.speakerId &&
              event.speakerName &&
              event.speakerAvatar
            ) {
              appendOrUpdateMessage(
                event.turn,
                event.speakerId,
                event.speakerName,
                event.speakerAvatar,
                '',
              )
            }

            if (
              event.type === 'dialogue_chunk' &&
              event.turn &&
              event.speakerId &&
              event.speakerName &&
              event.speakerAvatar
            ) {
              appendOrUpdateMessage(
                event.turn,
                event.speakerId,
                event.speakerName,
                event.speakerAvatar,
                event.content ?? event.chunk ?? '',
              )
            }

            if (
              event.type === 'dialogue_message' &&
              event.turn &&
              event.speakerId &&
              event.speakerName &&
              event.speakerAvatar
            ) {
              appendOrUpdateMessage(
                event.turn,
                event.speakerId,
                event.speakerName,
                event.speakerAvatar,
                event.content ?? '',
              )
            }

            if (
              event.type === 'dialogue_reaction' &&
              event.speakerId &&
              event.speakerName &&
              event.speakerAvatar &&
              event.targetTurn &&
              event.targetSpeakerId &&
              event.targetSpeakerName
            ) {
              appendOrUpdateReaction(
                event.speakerId,
                event.speakerName,
                event.speakerAvatar,
                event.targetTurn,
                event.targetSpeakerId,
                event.targetSpeakerName,
                event.content ?? '',
                event.reactionScore,
              )
            }

            if (event.type === 'dialogue_done') {
              setIsRunning(false)
            }

            if (event.type === 'error') {
              setError(event.message ?? 'Conversation failed')
              setIsRunning(false)
            }
          } catch {
            // Ignore malformed events.
          }
        }

        buffer = lines[lines.length - 1]
      }

      setIsRunning(false)
      abortRef.current = null
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
      setIsRunning(false)
      abortRef.current = null
    }
  }, [appendOrUpdateMessage, appendOrUpdateReaction, isRunning, resetConversation, speakerIds])

  useEffect(() => {
    if (autoStartedRef.current) return

    autoStartedRef.current = true
    void startConversation()
  }, [startConversation])

  return {
    messages,
    isRunning,
    error,
    startConversation,
    stopConversation,
  }
}
