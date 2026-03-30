'use client'

import { useState } from 'react'

interface ReasoningBlockProps {
  reasoning: string
  avatar?: string
}

export function ReasoningBlock({ reasoning, avatar = '🤔' }: ReasoningBlockProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="reasoning-block mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        aria-expanded={open}
      >
        <span className="text-base">{avatar}</span>
        <span>{open ? 'hide thinking' : 'show thinking...'}</span>
        <span className="text-purple-500">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-1 rounded border border-purple-800/50 bg-purple-950/30 p-3 text-xs text-purple-300 whitespace-pre-wrap leading-relaxed">
          {reasoning}
        </div>
      )}
    </div>
  )
}
