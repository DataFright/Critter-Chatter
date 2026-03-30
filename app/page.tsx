
'use client'

import { useState } from 'react'
import { ChatWindow } from '@/components/ChatWindow'
import { ChatInput } from '@/components/ChatInput'
import { ConversationRealm } from '@/components/ConversationRealm'
import { ThoughtChatWindow } from '@/components/ThoughtChain'
import { useChatWithReasoning } from '@/hooks/useChatWithReasoning'
import { useConversationRealm } from '@/hooks/useConversationRealm'

type TabId = 'chat' | 'thought' | 'characters'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'thought', label: 'Thought', icon: '🧠' },
  { id: 'characters', label: 'Characters', icon: '🎭' },
]

function getRealmName(index: number) {
  return index === 0 ? 'Common Realm' : `Realm ${index + 1}`
}

function RealmPane({ realmName, active }: { realmName: string; active: boolean }) {
  const [activeTab, setActiveTab] = useState<TabId>('chat')

  const {
    messages,
    input,
    setInput,
    isLoading,
    error,
    sendMessage,
    characterId,
    selectedCharacter,
    setCharacterId,
    characters,
    thoughts,
    isThinking,
    startThoughtChain,
    stopThoughtChain,
  } = useChatWithReasoning()

  const thoughtMessages = thoughts.map((t) => ({
    id: `thought-${t.number}`,
    number: t.number,
    text: t.text,
  }))

  return (
    <div className={`${active ? 'flex' : 'hidden'} h-full flex-col`}>
      <div
        data-testid={active ? 'chat-shell' : undefined}
        className="w-full flex flex-col rounded-2xl border border-zinc-700/80 bg-zinc-900 overflow-hidden"
        style={{ height: '680px', boxShadow: '0 0 0 1px rgba(63,63,70,0.4), 0 25px 80px rgba(0,0,0,0.7)' }}
      >
        {/* Window title bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800/60 border-b border-zinc-700/60 shrink-0">
          <div className="flex gap-1.5 mr-1" aria-hidden="true">
            <div className="w-3 h-3 rounded-full bg-zinc-600/70" />
            <div className="w-3 h-3 rounded-full bg-zinc-600/70" />
            <div className="w-3 h-3 rounded-full bg-zinc-600/70" />
          </div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 border border-zinc-700 rounded px-2 py-1">
            {realmName}
          </span>
          <span className="text-lg select-none">{selectedCharacter.avatar}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-white truncate leading-tight">{selectedCharacter.name}</h1>
            <p className="text-xs text-zinc-500 truncate">{selectedCharacter.subtitle}</p>
          </div>
          <span className="text-xs text-purple-400 font-mono bg-purple-950/40 border border-purple-800/50 rounded px-2 py-0.5 shrink-0">
            reasoning on
          </span>
        </div>
        {/* Character quick-switch — kept here for keyboard access & test selectors */}
        <div className="px-4 pb-2 shrink-0">
          <select
            aria-label="Character selector"
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          >
            {characters.map((char) => (
              <option key={char.id} value={char.id}>
                {char.avatar} {char.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-700/60 bg-zinc-800/40 shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-white bg-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.id === 'thought' && isThinking && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* Chat tab */}
          {activeTab === 'chat' && (
            <>
              <ChatWindow messages={messages} isLoading={isLoading} character={selectedCharacter} />
              {error && (
                <div className="mx-3 mb-2 rounded-lg bg-red-950/60 border border-red-800/50 px-4 py-2 text-xs text-red-300">
                  ⚠️ {error}
                </div>
              )}
              <ChatInput value={input} onChange={setInput} onSend={sendMessage} disabled={isLoading} />
            </>
          )}

          {/* Thought tab */}
          {activeTab === 'thought' && (
            <ThoughtChatWindow
              thoughts={thoughtMessages}
              isThinking={isThinking}
              character={selectedCharacter}
              onStart={startThoughtChain}
              onStop={stopThoughtChain}
            />
          )}

          {/* Characters tab */}
          {activeTab === 'characters' && (
            <div className="flex-1 overflow-y-auto p-5" data-testid="characters-panel">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Select Character
              </p>
              <div className="space-y-3">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => {
                      setCharacterId(char.id)
                      setActiveTab('chat')
                    }}
                      data-testid={`character-card-${char.id}`}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                      characterId === char.id
                        ? 'border-indigo-500/80 bg-indigo-950/30 ring-1 ring-indigo-500/20'
                        : 'border-zinc-700/80 bg-zinc-800/40 hover:border-zinc-600 hover:bg-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl select-none">{char.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white">{char.name}</div>
                        <div className="text-xs text-zinc-500">{char.subtitle}</div>
                      </div>
                      {characterId === char.id && (
                        <span className="text-xs text-indigo-400 bg-indigo-950/40 border border-indigo-800/50 rounded px-2 py-0.5 shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                      {char.traits.personality}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function getMeetRealmName(index: number) {
  return index === 0 ? 'Meet Realm' : `Meet Realm ${index + 1}`
}

function MeetRealmPane({ realmName, active }: { realmName: string; active: boolean }) {
  const meetRealm = useConversationRealm()
  return (
    <div className={active ? 'block' : 'hidden'}>
      <ConversationRealm
        realmName={realmName}
        characters={meetRealm.characters}
        speakerAId={meetRealm.speakerAId}
        speakerBId={meetRealm.speakerBId}
        setSpeakerAId={meetRealm.setSpeakerAId}
        setSpeakerBId={meetRealm.setSpeakerBId}
        speakerA={meetRealm.speakerA}
        speakerB={meetRealm.speakerB}
        messages={meetRealm.messages}
        isRunning={meetRealm.isRunning}
        error={meetRealm.error}
        turnCount={meetRealm.turnCount}
        maxTurns={meetRealm.maxTurns}
        canStart={meetRealm.canStart}
        onStart={meetRealm.startConversation}
        onStop={meetRealm.stopConversation}
      />
    </div>
  )
}

export default function Home() {
  const [realmIds, setRealmIds] = useState<number[]>([1])
  const [activeRealmId, setActiveRealmId] = useState<number>(1)
  const [meetRealmIds, setMeetRealmIds] = useState<number[]>([1])
  const [activeMeetRealmId, setActiveMeetRealmId] = useState<number>(1)

  const canAddRealm = realmIds.length < 3
  const canAddMeetRealm = meetRealmIds.length < 3

  function addRealm() {
    if (!canAddRealm) return
    const nextId = Math.max(...realmIds) + 1
    setRealmIds((prev) => [...prev, nextId])
    setActiveRealmId(nextId)
  }

  function addMeetRealm() {
    if (!canAddMeetRealm) return
    const nextId = Math.max(...meetRealmIds) + 1
    setMeetRealmIds((prev) => [...prev, nextId])
    setActiveMeetRealmId(nextId)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row lg:items-start lg:justify-start gap-6 lg:gap-8">
        <div className="w-full max-w-4xl">
          <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
            {realmIds.map((realmId, index) => (
              <button
                key={realmId}
                onClick={() => setActiveRealmId(realmId)}
                data-testid={`realm-tab-${realmId}`}
                className={`rounded-t-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  activeRealmId === realmId
                    ? 'border-zinc-700 bg-zinc-900 text-white'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {getRealmName(index)}
              </button>
            ))}

            <button
              onClick={addRealm}
              disabled={!canAddRealm}
              data-testid="add-realm"
              className="rounded-t-xl border border-zinc-800 bg-zinc-900/20 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              + New Realm
            </button>
          </div>

          {realmIds.map((realmId, index) => (
            <RealmPane
              key={realmId}
              realmName={getRealmName(index)}
              active={activeRealmId === realmId}
            />
          ))}
        </div>

        <div className="shrink-0">
          <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
            {meetRealmIds.map((meetRealmId, index) => (
              <button
                key={meetRealmId}
                onClick={() => setActiveMeetRealmId(meetRealmId)}
                data-testid={`meet-realm-tab-${meetRealmId}`}
                className={`rounded-t-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  activeMeetRealmId === meetRealmId
                    ? 'border-zinc-700 bg-zinc-900 text-white'
                    : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {getMeetRealmName(index)}
              </button>
            ))}

            <button
              onClick={addMeetRealm}
              disabled={!canAddMeetRealm}
              data-testid="add-meet-realm"
              className="rounded-t-xl border border-zinc-800 bg-zinc-900/20 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              + New Meet Realm
            </button>
          </div>

          {meetRealmIds.map((meetRealmId, index) => (
            <MeetRealmPane
              key={meetRealmId}
              realmName={getMeetRealmName(index)}
              active={activeMeetRealmId === meetRealmId}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
