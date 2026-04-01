'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ALL_CHARACTERS, getCharacterById } from '@/lib/characters'

const INITIAL_SPEAKER_IDS = ALL_CHARACTERS.map((character) => character.id)

export interface ConversationMessage {
  id: string
  turn: number
  speakerId: string
  speakerName: string
  speakerAvatar: string
  content: string
}

function makeMessageId(turn: number, speakerId: string) {
  return `conversation-${turn}-${speakerId}`
}

function shuffleSpeakerIds(): string[] {
  const ids = ALL_CHARACTERS.map((character) => character.id)

  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }

  return ids
}

export function useConversationRealm() {
  const [speakerIds, setSpeakerIds] = useState<string[]>(INITIAL_SPEAKER_IDS)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState('')
  const [turnCount, setTurnCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const speakers = useMemo(() => speakerIds.map((id) => getCharacterById(id)), [speakerIds])

  useEffect(() => {
    setSpeakerIds(shuffleSpeakerIds())
  }, [])

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

  const randomizeSpeakers = useCallback(() => {
    if (isRunning) {
      stopConversation()
    }
    resetConversation()
    setSpeakerIds(shuffleSpeakerIds())
  }, [isRunning, resetConversation, stopConversation])

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
  }, [appendOrUpdateMessage, isRunning, resetConversation, speakerIds])

  return {
    characters: ALL_CHARACTERS,
    speakerIds,
    speakers,
    messages,
    isRunning,
    error,
    turnCount,
    maxTurns: null,
    canStart: !isRunning,
    startConversation,
    stopConversation,
    resetConversation,
    randomizeSpeakers,
  }
}
