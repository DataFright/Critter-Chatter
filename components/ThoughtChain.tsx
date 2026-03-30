'use client'

import { useEffect, useRef } from 'react'

interface ThoughtMessage {
  id: string
  number: number
  text: string
}

interface ThoughtChatWindowProps {
  thoughts: ThoughtMessage[]
  isThinking: boolean
  character?: { name: string; avatar: string }
  onStart?: () => void
  onStop?: () => void
}

export function ThoughtChatWindow({ thoughts, isThinking, character, onStart, onStop }: ThoughtChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thoughts, isThinking])

  return (
    <div className="flex flex-col w-full h-full" data-testid="thought-window">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-3 shrink-0">
        <span className="text-xl">{character?.avatar || '🤔'}</span>
        <div>
          <h2 className="text-sm font-bold text-white">{character?.name || 'Unknown'} Thoughts</h2>
          <p className="text-xs text-zinc-500">Internal monologue</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isThinking && (
            <span className="text-xs text-purple-400" data-testid="thought-progress">
              <span className="animate-pulse">●</span> {thoughts.length}/50
            </span>
          )}
          <button
            onClick={isThinking ? onStop : onStart}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              isThinking
                ? 'bg-red-950/40 text-red-300 hover:bg-red-950/60'
                : 'bg-purple-950/40 text-purple-300 hover:bg-purple-950/60'
            }`}
            disabled={!onStart && !onStop}
          >
            {isThinking ? '⏹ Stop' : '▶ Start'}
          </button>
        </div>
      </header>

      {/* Thought Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!isThinking && thoughts.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 text-sm text-center px-4">
            Click "▶ Start" to generate autonomous thoughts
          </div>
        ) : (
          <>
            {thoughts.map((thought) => (
              <div key={thought.id} className="flex gap-2" data-testid="thought-message">
                <span className="text-lg flex-shrink-0 mt-0.5">{character?.avatar || '🤔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="bg-purple-950/30 rounded-lg px-3 py-2 border border-purple-800/40">
                    <div className="text-xs text-purple-300 leading-relaxed break-words">
                      {thought.text}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-600 mt-1">Thought {thought.number}</div>
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex gap-2">
                <span className="text-lg flex-shrink-0 mt-0.5 animate-pulse">{character?.avatar || '🤔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="bg-zinc-800/50 rounded-lg px-3 py-2 border border-zinc-700/40 animate-pulse">
                    <div className="text-xs text-zinc-500">Thinking...</div>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  )
}

