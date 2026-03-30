'use client'

interface ChatInputProps {
  value: string
  onChange: (v: string) => void
  onSend: (text: string) => void
  disabled: boolean
}

export function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled) onSend(value)
    }
  }

  return (
    <form
      className="flex gap-2 p-3 border-t border-zinc-800 bg-zinc-900"
      onSubmit={(e) => {
        e.preventDefault()
        if (value.trim() && !disabled) onSend(value)
      }}
    >
      <textarea
        className="flex-1 resize-none rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors min-h-[40px] max-h-[120px]"
        placeholder="Say something chaotic..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        aria-label="Message input"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Send message"
      >
        {disabled ? '...' : 'Send'}
      </button>
    </form>
  )
}
