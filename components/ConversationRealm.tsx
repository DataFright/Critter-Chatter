'use client'

import { useLayoutEffect, useRef } from 'react'
import type { ConversationMessage } from '@/hooks/useConversationRealm'

interface ConversationRealmProps {
  realmName?: string
  messages: ConversationMessage[]
  isRunning: boolean
  error: string
  onStart: () => void
  onStop: () => void
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

function getReactionVisual(reactionScore: number | undefined) {
  if ((reactionScore ?? 0) >= 6) {
    return {
      tier: 'strong',
      icon: '🔥',
    }
  }

  if ((reactionScore ?? 0) >= 4) {
    return {
      tier: 'warm',
      icon: '✨',
    }
  }

  return {
    tier: 'light',
    icon: '👍',
  }
}

export function ConversationRealm({
  realmName = 'Meet Realm',
  messages,
  isRunning,
  error,
  onStart,
  onStop,
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

  const characterCount = new Set(messages.map((message) => message.speakerId)).size

  return (
    <section
      className="rounded-2xl border border-zinc-700/80 bg-zinc-900 overflow-hidden max-w-4xl mx-auto"
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
          {(isRunning || messages.length > 0) && (
            <span className="text-xs text-emerald-400" data-testid="conversation-progress">
              <span className="animate-pulse">●</span> {characterCount} live
            </span>
          )}
          <button
            onClick={isRunning ? onStop : onStart}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
              isRunning
                ? 'bg-red-950/40 text-red-300 hover:bg-red-950/60'
                : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/60'
            }`}
          >
            {isRunning ? '⏹ Stop' : '▶ Start'}
          </button>
        </div>
      </header>

      <div
        ref={messagesRef}
        className="meet-realm-scroll flex-1 overflow-y-auto pr-5 pl-[105px] py-5 space-y-3 h-[calc(760px-50px)]"
      >
        {error && (
          <div className="rounded-lg border border-red-800/50 bg-red-950/40 px-3 py-2 text-xs text-red-300 mb-3">
            ⚠️ {error}
          </div>
        )}
        {messages.length === 0 && !isRunning ? (
          <div className="h-full flex items-center justify-center text-center text-sm text-zinc-500 px-6">
            Start the realm to run a full-roster meetup conversation until you stop it.
          </div>
        ) : (
          <>
            {messages
              .filter((msg) => msg.kind === 'message')
              .map((message) => {
                const bubbleClass =
                  SPEAKER_BUBBLE_CLASS_BY_ID[message.speakerId] ??
                  'bg-zinc-800 text-zinc-100 border border-zinc-700'

                // Get all reactions for this message
                const messageReactions = messages.filter(
                  (msg) => msg.kind === 'reaction' && msg.targetTurn === message.turn,
                )

                return (
                  <div
                    key={message.id}
                    className="flex justify-start gap-2 items-end"
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

                    {/* Reactions side section */}
                    {messageReactions.length > 0 && (
                      <div
                        className="flex flex-wrap gap-2 items-center justify-start min-w-fit"
                        data-testid="message-reactions"
                      >
                        {messageReactions.map((reaction) => {
                          const reactionVisual = getReactionVisual(reaction.reactionScore)
                          return (
                            <div
                              key={reaction.id}
                              className="text-xl leading-none cursor-help"
                              title={`${reaction.speakerName} reacted: ${reaction.content}`}
                              data-reaction-tier={reactionVisual.tier}
                            >
                              {reactionVisual.icon}
                            </div>
                          )
                        })}
                      </div>
                    )}
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
