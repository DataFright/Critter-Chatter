
'use client'

import { ConversationRealm } from '@/components/ConversationRealm'
import { useConversationRealm } from '@/hooks/useConversationRealm'

function MeetRealmPane({ realmName }: { realmName: string }) {
  const meetRealm = useConversationRealm()
  return (
    <div>
      <ConversationRealm
        realmName={realmName}
        speakerIds={meetRealm.speakerIds}
        speakers={meetRealm.speakers}
        messages={meetRealm.messages}
        isRunning={meetRealm.isRunning}
        error={meetRealm.error}
        turnCount={meetRealm.turnCount}
        maxTurns={meetRealm.maxTurns}
        canStart={meetRealm.canStart}
        onStart={meetRealm.startConversation}
        onStop={meetRealm.stopConversation}
        onRandomize={meetRealm.randomizeSpeakers}
      />
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 md:p-14">
      <div className="w-full max-w-[1120px]">
        <header className="mb-5 px-1">
          <h1 className="text-2xl font-semibold text-zinc-100">Meet Realm</h1>
          <p className="text-sm text-zinc-400">Full-roster dialogue studio with 3-turn randomized order</p>
        </header>

        <MeetRealmPane realmName="Meet Realm" />
      </div>
    </div>
  )
}
