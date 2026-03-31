'use client'

import { useEffect, useRef } from 'react'
import type { CharacterDefinition } from '@/lib/characters/types'
import type { ConversationMessage } from '@/hooks/useConversationRealm'

interface ConversationRealmProps {
  realmName?: string
  characters: CharacterDefinition[]
  speakerAId: string
  speakerBId: string
  speakerCId: string
  setSpeakerAId: (value: string) => void
  setSpeakerBId: (value: string) => void
  setSpeakerCId: (value: string) => void
  speakerA: CharacterDefinition
  speakerB: CharacterDefinition
  speakerC: CharacterDefinition
  messages: ConversationMessage[]
  isRunning: boolean
  error: string
  turnCount: number
  maxTurns: number
  canStart: boolean
  onStart: () => void
  onStop: () => void
}

export function ConversationRealm({
  realmName = 'Meet Realm',
  characters,
  speakerAId,
  speakerBId,
  speakerCId,
  setSpeakerAId,
  setSpeakerBId,
  setSpeakerCId,
  speakerA,
  speakerB,
  speakerC,
  messages,
  isRunning,
  error,
  turnCount,
  maxTurns,
  canStart,
  onStart,
  onStop,
}: ConversationRealmProps) {
  const messagesRef = useRef<HTMLDivElement>(null)
  const hasDuplicateSpeakers = new Set([speakerAId, speakerBId, speakerCId]).size !== 3
  const speakerOrder = [speakerA, speakerB, speakerC]

  useEffect(() => {
    const container = messagesRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages, isRunning])

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
          {isRunning && (
            <span className="text-xs text-emerald-400" data-testid="conversation-progress">
              <span className="animate-pulse">●</span> {turnCount}/{maxTurns}
            </span>
          )}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            First Speaker
            <select
              aria-label="Conversation first speaker"
              value={speakerAId}
              onChange={(event) => setSpeakerAId(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
              disabled={isRunning}
            >
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Second Speaker
            <select
              aria-label="Conversation second speaker"
              value={speakerBId}
              onChange={(event) => setSpeakerBId(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
              disabled={isRunning}
            >
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Third Speaker
            <select
              aria-label="Conversation third speaker"
              value={speakerCId}
              onChange={(event) => setSpeakerCId(event.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:outline-none"
              disabled={isRunning}
            >
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-xl border border-zinc-700/70 bg-zinc-950/40 px-3 py-3 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-200">Order:</span> {speakerOrder.map((speaker, index) => `${speaker.avatar} ${speaker.name}${index === 0 ? ' opens' : ' follows'}`).join(', then ')}.
        </div>

        {hasDuplicateSpeakers && (
          <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
            Select three different bots to start a conversation.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-800/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            ⚠️ {error}
          </div>
        )}
      </div>

      <div
        ref={messagesRef}
        className="flex-1 overflow-y-auto px-5 py-5 space-y-3 h-[calc(760px-168px)]"
      >
        {messages.length === 0 && !isRunning ? (
          <div className="h-full flex items-center justify-center text-center text-sm text-zinc-500 px-6">
            Choose three bots and start the realm to watch them rotate through the conversation.
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const speakerIndex = [speakerAId, speakerBId, speakerCId].indexOf(message.speakerId)
              const alignClass =
                speakerIndex === 1 ? 'justify-end' : speakerIndex === 2 ? 'justify-center' : 'justify-start'
              const itemClass =
                speakerIndex === 1 ? 'items-end' : speakerIndex === 2 ? 'items-center' : 'items-start'
              const bubbleClass =
                speakerIndex === 1
                  ? 'bg-emerald-900/50 text-emerald-50 rounded-tr-sm border border-emerald-700/60'
                  : speakerIndex === 2
                    ? 'bg-amber-900/40 text-amber-50 border border-amber-700/60'
                    : 'bg-zinc-800 text-zinc-100 rounded-tl-sm border border-zinc-700'

              return (
                <div
                  key={message.id}
                  className={`flex ${alignClass}`}
                  data-testid="conversation-message"
                >
                  <div className={`max-w-[82%] ${itemClass} flex flex-col`}>
                    <div className="mb-1 flex items-center gap-2 text-[11px] text-zinc-500">
                      <span className="text-base leading-none">{message.speakerAvatar}</span>
                      <span>{message.speakerName}</span>
                      <span>Turn {message.turn}</span>
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${bubbleClass}`}
                    >
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