'use client'

import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import type { Message } from '@/hooks/useChatWithReasoning'

interface ChatWindowProps {
  messages: Message[]
  isLoading: boolean
  character?: { avatar: string; name: string }
}

export function ChatWindow({ messages, isLoading, character }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1" role="log" aria-live="polite">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} avatar={character?.avatar} />
      ))}
      {isLoading && (
        <div className="flex justify-start mb-3">
          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl rounded-tl-sm px-4 py-2.5">
            <span className="text-zinc-500 text-sm animate-pulse">{character?.avatar || '🤔'} thinking...</span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
