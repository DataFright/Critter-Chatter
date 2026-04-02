
'use client'

import { ConversationRealm } from '@/components/ConversationRealm'
import { useConversationRealm } from '@/hooks/useConversationRealm'

function MeetRealmPane({ realmName }: { realmName: string }) {
  const meetRealm = useConversationRealm()
  return (
    <div>
      <ConversationRealm
        realmName={realmName}
        messages={meetRealm.messages}
        isRunning={meetRealm.isRunning}
        error={meetRealm.error}
        onStart={meetRealm.startConversation}
        onStop={meetRealm.stopConversation}
      />
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 md:p-14">
      <div className="w-full max-w-[1120px]">
        <MeetRealmPane realmName="Meet Realm" />
      </div>
    </div>
  )
}
