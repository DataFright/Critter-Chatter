'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { ALL_CHARACTERS, DEFAULT_CHARACTER_ID, getCharacterById, isCharacterId } from '@/lib/characters'

const DIALOGUE_MAX_TURNS = 12

export interface ConversationMessage {
  id: string
  turn: number
  speakerId: string
  speakerName: string
  speakerAvatar: string
  content: string
}

const DEFAULT_SPEAKER_A_ID = DEFAULT_CHARACTER_ID
const DEFAULT_SPEAKER_B_ID =
  ALL_CHARACTERS.find((character) => character.id !== DEFAULT_SPEAKER_A_ID)?.id ?? DEFAULT_SPEAKER_A_ID

function makeMessageId(turn: number, speakerId: string) {
  return `conversation-${turn}-${speakerId}`
}

export function useConversationRealm() {
  const [speakerAId, setSpeakerAIdState] = useState(DEFAULT_SPEAKER_A_ID)
  const [speakerBId, setSpeakerBIdState] = useState(DEFAULT_SPEAKER_B_ID)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState('')
  const [turnCount, setTurnCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const speakerA = useMemo(() => getCharacterById(speakerAId), [speakerAId])
  const speakerB = useMemo(() => getCharacterById(speakerBId), [speakerBId])

  const resetConversation = useCallback(() => {
    setMessages([])
    setTurnCount(0)
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
          return prev.map((message) =>
            message.id === id ? { ...message, content } : message,
          )
        }

        return [
          ...prev,
          {
            id,
            turn,
            speakerId,
            speakerName,
            speakerAvatar,
            content,
          },
        ]
      })
    },
    [],
  )

  const startConversation = useCallback(async () => {
    if (isRunning || speakerAId === speakerBId) return

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
          speakerAId,
          speakerBId,
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
              setTurnCount(event.turn)
            }

            if (event.type === 'dialogue_done') {
              if (event.total) {
                setTurnCount(event.total)
              }
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
  }, [appendOrUpdateMessage, isRunning, resetConversation, speakerAId, speakerBId])

  const setSpeakerAId = useCallback(
    (value: string) => {
      const nextId = isCharacterId(value) ? value : DEFAULT_SPEAKER_A_ID
      if (isRunning) {
        stopConversation()
      }
      resetConversation()
      setSpeakerAIdState(nextId)
    },
    [isRunning, resetConversation, stopConversation],
  )

  const setSpeakerBId = useCallback(
    (value: string) => {
      const nextId = isCharacterId(value) ? value : DEFAULT_SPEAKER_B_ID
      if (isRunning) {
        stopConversation()
      }
      resetConversation()
      setSpeakerBIdState(nextId)
    },
    [isRunning, resetConversation, stopConversation],
  )

  return {
    characters: ALL_CHARACTERS,
    speakerA,
    speakerAId,
    setSpeakerAId,
    speakerB,
    speakerBId,
    setSpeakerBId,
    messages,
    isRunning,
    error,
    turnCount,
    maxTurns: DIALOGUE_MAX_TURNS,
    canStart: speakerAId !== speakerBId && !isRunning,
    startConversation,
    stopConversation,
    resetConversation,
  }
}