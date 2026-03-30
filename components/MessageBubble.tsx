'use client'

import { ReasoningBlock } from './ReasoningBlock'
import type { Message } from '@/hooks/useChatWithReasoning'

interface MessageBubbleProps {
  message: Message
  avatar?: string
}

export function MessageBubble({ message, avatar = '🤔' }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isUser && message.reasoning && (
          <ReasoningBlock reasoning={message.reasoning} avatar={avatar} />
        )}
        <div
          data-testid="chat-bubble"
          data-role={message.role}
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-zinc-800 text-zinc-100 rounded-tl-sm border border-zinc-700'
          }`}
        >
          {message.content || (
            <span className="text-zinc-500 italic">thinking...</span>
          )}
        </div>
      </div>
    </div>
  )
}
