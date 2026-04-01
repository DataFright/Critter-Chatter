'use client'

import { useLayoutEffect, useRef } from 'react'
import type { CharacterDefinition } from '@/lib/characters/types'
import type { ConversationMessage } from '@/hooks/useConversationRealm'

interface ConversationRealmProps {
  realmName?: string
  speakerIds: string[]
  speakers: CharacterDefinition[]
  messages: ConversationMessage[]
  isRunning: boolean
  error: string
  turnCount: number
  maxTurns: number | null
  canStart: boolean
  onStart: () => void
  onStop: () => void
  onRandomize: () => void
}

const SPEAKER_BUBBLE_CLASS_BY_ID: Record<string, string> = {
  jinx: 'bg-fuchsia-900/45 text-fuchsia-50 border border-fuchsia-700/60',
  volt: 'bg-cyan-900/45 text-cyan-50 border border-cyan-700/60',
  mabel: 'bg-amber-900/45 text-amber-50 border border-amber-700/60',
  zeke: 'bg-orange-900/50 text-orange-50 border border-orange-700/60',
  nova: 'bg-violet-900/45 text-violet-50 border border-violet-700/60',
  velvet: 'bg-rose-900/45 text-rose-50 border border-rose-700/60',
  tempest: 'bg-red-900/45 text-red-50 border border-red-700/60',
  luma: 'bg-teal-900/45 text-teal-50 border border-teal-700/60',
  echo: 'bg-blue-900/45 text-blue-50 border border-blue-700/60',
}

export function ConversationRealm({
  realmName = 'Meet Realm',
  speakerIds,
  speakers,
  messages,
  isRunning,
  error,
  turnCount,
  maxTurns,
  canStart,
  onStart,
  onStop,
  onRandomize,
}: ConversationRealmProps) {
  const messagesRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const container = messagesRef.current
    if (!container) return

    // Force scroll to the latest message as soon as new content renders.
    container.scrollTop = container.scrollHeight
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
  }, [messages, isRunning])

  const progressLabel = maxTurns === null ? `${turnCount} live` : `${turnCount}/${maxTurns}`

  return (
    <section
      className="w-full rounded-2xl border border-zinc-700/80 bg-zinc-900 overflow-hidden"
      style={{ height: '760px', boxShadow: '0 0 0 1px rgba(63,63,70,0.4), 0 25px 80px rgba(0,0,0,0.7)' }}
      aria-label={realmName}
      data-testid="conversation-realm"
    >
      <header className="flex items-center gap-3 px-4 py-3 bg-zinc-800/60 border-b border-zinc-700/60">
        <div className="flex gap-1.5 mr-1" aria-hidden="true">
          <div className="w-3 h-3 rounded-full bg-zinc-600/70" />
          <div className="w-3 h-3 rounded-full bg-zinc-600/70" />
          <div className="w-3 h-3 rounded-full bg-zinc-600/70" />
        </div>
        <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 border border-zinc-700 rounded px-2 py-1">
          {realmName}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {(isRunning || turnCount > 0) && (
            <span className="text-xs text-emerald-400" data-testid="conversation-progress">
              <span className="animate-pulse">●</span> {progressLabel}
            </span>
          )}
          <button
            onClick={onRandomize}
            disabled={isRunning}
            className="rounded px-2 py-1 text-xs font-medium transition-colors bg-zinc-800 text-zinc-200 border border-zinc-600 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↻ Reroll
          </button>
          <button
            onClick={isRunning ? onStop : onStart}
            disabled={!isRunning && !canStart}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              isRunning
                ? 'bg-red-950/40 text-red-300 hover:bg-red-950/60'
                : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/60 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {isRunning ? '⏹ Stop' : '▶ Start'}
          </button>
        </div>
      </header>

      <div className="border-b border-zinc-700/60 bg-zinc-800/30 px-4 py-4 space-y-3">
        <div className="rounded-xl border border-zinc-700/70 bg-zinc-950/40 px-3 py-3 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-200">Character Roster:</span>
          <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4" data-testid="random-speaker-list">
            {speakers.map((speaker) => (
              <div key={speaker.id} className="rounded border border-zinc-700 px-2 py-1 text-zinc-300">
                {speaker.avatar} {speaker.name}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-700/70 bg-zinc-950/40 px-3 py-3 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-200">Order:</span> Randomized every 3 turns from the full roster.
        </div>

        {error && (
          <div className="rounded-lg border border-red-800/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            ⚠️ {error}
          </div>
        )}
      </div>

      <div
        ref={messagesRef}
        className="meet-realm-scroll flex-1 overflow-y-auto px-5 py-5 space-y-3 h-[calc(760px-210px)]"
      >
        {messages.length === 0 && !isRunning ? (
          <div className="h-full flex items-center justify-center text-center text-sm text-zinc-500 px-6">
            Start the realm to run a full-roster meetup conversation until you stop it.
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const bubbleClass =
                SPEAKER_BUBBLE_CLASS_BY_ID[message.speakerId] ??
                'bg-zinc-800 text-zinc-100 border border-zinc-700'

              return (
                <div
                  key={message.id}
                  className="flex justify-start"
                  data-testid="conversation-message"
                >
                  <div className="max-w-[82%] items-start flex flex-col">
                    <div className="mb-1 flex items-center gap-2 text-[11px] text-zinc-500">
                      <span className="text-base leading-none">{message.speakerAvatar}</span>
                      <span>{message.speakerName}</span>
                      <span>Turn {message.turn}</span>
                    </div>
                    <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${bubbleClass}`}>
                      {message.content || <span className="text-zinc-500 italic">speaking...</span>}
                    </div>
                  </div>
                </div>
              )
            })}

            {isRunning && messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-center text-sm text-zinc-500 px-6">
                Starting the conversation realm...
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
