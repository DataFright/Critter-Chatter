'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ALL_CHARACTERS,
  DEFAULT_CHARACTER_ID,
  getCharacterById,
  isCharacterId,
} from '@/lib/characters'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  reasoning_details?: unknown[]
  synthetic?: boolean
}

interface Thought {
  number: number
  text: string
}

function uid() {
  return Math.random().toString(36).slice(2)
}

const CHARACTER_STORAGE_KEY = 'chatbot_selectedCharacterId'

function buildStarterMessage(characterId: string): Message {
  return {
    id: 'starter',
    role: 'assistant',
    content: getCharacterById(characterId).starterMessage,
    synthetic: true,
  }
}

export function useChatWithReasoning() {
  const [characterId, setCharacterId] = useState(DEFAULT_CHARACTER_ID)
  const [messages, setMessages] = useState<Message[]>([buildStarterMessage(DEFAULT_CHARACTER_ID)])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<Message[]>([buildStarterMessage(DEFAULT_CHARACTER_ID)])
  const characterIdRef = useRef<string>(DEFAULT_CHARACTER_ID)

  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const thoughtAbortRef = useRef<AbortController | null>(null)

  const selectedCharacter = getCharacterById(characterId)

  useEffect(() => {
    characterIdRef.current = characterId
  }, [characterId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(CHARACTER_STORAGE_KEY)
    if (!stored || !isCharacterId(stored) || stored === DEFAULT_CHARACTER_ID) return

    setCharacterId(stored)
    const starter = buildStarterMessage(stored)
    setMessages(starter.synthetic ? [starter] : [])
    messagesRef.current = starter.synthetic ? [starter] : []
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(CHARACTER_STORAGE_KEY, characterId)
  }, [characterId])

  const setMessagesAndSync = useCallback((updater: Message[] | ((prev: Message[]) => Message[])) => {
    setMessages((prev) => {
      const next = typeof updater === 'function' ? (updater as (prev: Message[]) => Message[])(prev) : updater
      messagesRef.current = next
      return next
    })
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      const userMsg: Message = { id: uid(), role: 'user', content: trimmed }

      setMessagesAndSync((prev) => [...prev, userMsg])
      setInput('')
      setIsLoading(true)
      setError('')

      let activeController = new AbortController()
      abortRef.current = activeController

      // Build API messages: exclude synthetic, include reasoning_details from prior turns
      const apiMessages = [...messagesRef.current, userMsg]
        .filter((m) => !m.synthetic)
        .map(({ role, content, reasoning_details }) => ({
          role,
          content,
          ...(reasoning_details ? { reasoning_details } : {}),
        }))

      const assistantId = uid()
      let reasoningText = ''
      let contentText = ''

      try {
        const requestBody = JSON.stringify({ messages: apiMessages, characterId: characterIdRef.current })
        const requestInit: RequestInit = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        }

        const fetchChat = async (signal: AbortSignal) =>
          fetch('/api/chat', { ...requestInit, signal })

        let res: Response
        try {
          res = await fetchChat(activeController.signal)
        } catch (err) {
          const msg = err instanceof Error ? err.message.toLowerCase() : ''
          const isAbort = err instanceof Error && err.name === 'AbortError'
          const isTransientNetwork =
            !isAbort && (msg.includes('fetch failed') || msg.includes('network'))

          if (!isTransientNetwork) {
            throw err
          }

          // One short retry for transient network interruptions.
          await new Promise((resolve) => setTimeout(resolve, 300))
          activeController = new AbortController()
          abortRef.current = activeController
          res = await fetchChat(activeController.signal)
        }

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error ?? `HTTP ${res.status}`)
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let pending = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          pending += chunk
          const lines = pending.split('\n')
          pending = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            let parsed: { type: string; text?: string; token?: string; content?: string; reasoning_details?: unknown[]; message?: string }
            try {
              parsed = JSON.parse(line.slice(6))
            } catch {
              continue
            }

            if (parsed.type === 'reasoning' && parsed.text) {
              reasoningText += parsed.text
              setMessagesAndSync((prev) => {
                const existing = prev.find((m) => m.id === assistantId)
                if (existing) {
                  return prev.map((m) =>
                    m.id === assistantId ? { ...m, reasoning: reasoningText } : m,
                  )
                }
                return [
                  ...prev,
                  { id: assistantId, role: 'assistant', content: '', reasoning: reasoningText },
                ]
              })
            }

            if (parsed.type === 'content' && parsed.token) {
              contentText += parsed.token
              setMessagesAndSync((prev) => {
                const existing = prev.find((m) => m.id === assistantId)
                if (existing) {
                  return prev.map((m) =>
                    m.id === assistantId ? { ...m, content: contentText } : m,
                  )
                }
                return [...prev, { id: assistantId, role: 'assistant', content: contentText }]
              })
            }

            if (parsed.type === 'done') {
              const rd = parsed.reasoning_details
              setMessagesAndSync((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, reasoning_details: rd, content: contentText }
                    : m,
                ),
              )
            }

            if (parsed.type === 'error') {
              throw new Error(parsed.message ?? 'Stream error')
            }
          }
        }

        if (pending.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(pending.slice(6)) as {
              type: string
              text?: string
              token?: string
              content?: string
              reasoning_details?: unknown[]
              message?: string
            }
            if (parsed.type === 'content' && parsed.token) {
              contentText += parsed.token
              setMessagesAndSync((prev) => {
                const existing = prev.find((m) => m.id === assistantId)
                if (existing) {
                  return prev.map((m) =>
                    m.id === assistantId ? { ...m, content: contentText } : m,
                  )
                }
                return [...prev, { id: assistantId, role: 'assistant', content: contentText }]
              })
            }
          } catch {
            // Ignore trailing partial JSON.
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        const msg = err instanceof Error ? err.message : 'Something went wrong'
        setError(msg)
        // Keep the conversation moving with a visible assistant fallback on failures.
        setMessagesAndSync((prev) => {
          const assistant = prev.find((m) => m.id === assistantId)
          if (assistant && !assistant.content) {
            return prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: getCharacterById(characterIdRef.current).errorFallbackMessage }
                : m,
            )
          }
          if (!assistant) {
            return [...prev, { id: assistantId, role: 'assistant', content: getCharacterById(characterIdRef.current).errorFallbackMessage }]
          }
          return prev
        })
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
    },
    [isLoading, setMessagesAndSync],
  )

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const changeCharacter = useCallback(
    (nextCharacterId: string) => {
      const normalized = isCharacterId(nextCharacterId) ? nextCharacterId : DEFAULT_CHARACTER_ID
      abortRef.current?.abort()
      setIsLoading(false)
      setError('')
      setInput('')
      setCharacterId(normalized)

      const starter = buildStarterMessage(normalized)
      setMessagesAndSync([starter])
    },
    [setMessagesAndSync],
  )

  const startThoughtChain = useCallback(async () => {
    if (isThinking || isLoading) return

    setThoughts([])
    setIsThinking(true)
    setError('')

    let activeController = new AbortController()
    thoughtAbortRef.current = activeController

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'thought',
          characterId: characterIdRef.current,
        }),
        signal: activeController.signal,
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i]
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))

              if (event.type === 'thought_done') {
                setThoughts((prev) => [
                  ...prev,
                  {
                    number: event.number,
                    text: event.thought,
                  },
                ])
              } else if (event.type === 'thought_sequence_done') {
                setIsThinking(false)
              } else if (event.type === 'error') {
                setError(event.message)
                setIsThinking(false)
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }

        buffer = lines[lines.length - 1]
      }

      setIsThinking(false)
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
      setIsThinking(false)
    }
  }, [isThinking, isLoading])

  const stopThoughtChain = useCallback(() => {
    if (thoughtAbortRef.current) {
      thoughtAbortRef.current.abort()
    }
    setIsThinking(false)
    setThoughts([])
  }, [])

  // Wrap sendMessage to interrupt thoughts on user input
  const _sendMessage = sendMessage
  const sendMessageWithThoughtInterrupt = useCallback(
    async (text: string) => {
      if (isThinking) {
        stopThoughtChain()
      }
      await _sendMessage(text)
    },
    [isThinking, stopThoughtChain, _sendMessage],
  )

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    sendMessage: sendMessageWithThoughtInterrupt,
    abort,
    characterId,
    selectedCharacter,
    setCharacterId: changeCharacter,
    characters: ALL_CHARACTERS,
    thoughts,
    isThinking,
    startThoughtChain,
    stopThoughtChain,
  }
}
