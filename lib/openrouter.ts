import { MODEL_CHAIN } from './models'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  reasoning_details?: unknown[]
}

export interface StreamEvent {
  type:
    | 'reasoning'
    | 'content'
    | 'done'
    | 'error'
    | 'thought_started'
    | 'thought_chunk'
    | 'thought_done'
    | 'thought_sequence_done'
    | 'dialogue_turn_started'
    | 'dialogue_chunk'
    | 'dialogue_message'
    | 'dialogue_done'
  text?: string
  token?: string
  chunk?: string
  content?: string
  thought?: string
  number?: number
  total?: number
  turn?: number
  speakerId?: string
  speakerName?: string
  speakerAvatar?: string
  reasoning_details?: unknown[]
  message?: string
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const APP_LABEL = process.env.APP_LABEL ?? 'StepKey'
const RETRY_DELAYS_MS = [1000, 2000, 4000]

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    const onAbort = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    if (signal?.aborted) {
      onAbort()
      return
    }

    signal?.addEventListener('abort', onAbort)
  })
}

async function fetchWithRetry(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
  attempt = 0,
): Promise<Response> {
  const payload = {
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    max_tokens: 300,
    stream: true,
    reasoning: { enabled: true },
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': APP_LABEL,
    },
    body: JSON.stringify(payload),
    signal,
  })

  if ((res.status === 429 || res.status >= 500) && attempt < RETRY_DELAYS_MS.length) {
    await abortableDelay(RETRY_DELAYS_MS[attempt], signal)
    return fetchWithRetry(apiKey, model, systemPrompt, messages, signal, attempt + 1)
  }

  return res
}

export async function streamChat(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  let lastError: Error | null = null

  for (const model of MODEL_CHAIN) {
    try {
      const res = await fetchWithRetry(apiKey, model, systemPrompt, messages, signal)

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
        lastError = new Error(data?.error?.message ?? `HTTP ${res.status}`)
        continue
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      const allReasoningDetails: unknown[] = []
      let pending = ''

      while (true) {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        pending += chunk
        const lines = pending.split('\n')
        pending = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') break

          let parsed: {
            choices?: Array<{
              delta?: {
                content?: string
                reasoning?: string
                reasoning_details?: unknown[]
              }
              finish_reason?: string
            }>
          }
          try {
            parsed = JSON.parse(raw)
          } catch {
            continue
          }

          const delta = parsed?.choices?.[0]?.delta
          if (!delta) continue

          // Reasoning tokens (text form)
          if (delta.reasoning) {
            onEvent({ type: 'reasoning', text: delta.reasoning })
          }

          // Reasoning details (structured)
          if (delta.reasoning_details?.length) {
            allReasoningDetails.push(...delta.reasoning_details)
          }

          // Content tokens
          if (delta.content) {
            fullContent += delta.content
            onEvent({ type: 'content', token: delta.content, content: fullContent })
          }
        }
      }

      if (pending.startsWith('data: ')) {
        const raw = pending.slice(6)
        if (raw && raw !== '[DONE]') {
          try {
            const parsed = JSON.parse(raw) as {
              choices?: Array<{
                delta?: {
                  content?: string
                  reasoning?: string
                  reasoning_details?: unknown[]
                }
              }>
            }
            const delta = parsed?.choices?.[0]?.delta
            if (delta?.reasoning) {
              onEvent({ type: 'reasoning', text: delta.reasoning })
            }
            if (delta?.reasoning_details?.length) {
              allReasoningDetails.push(...delta.reasoning_details)
            }
            if (delta?.content) {
              fullContent += delta.content
              onEvent({ type: 'content', token: delta.content, content: fullContent })
            }
          } catch {
            // Ignore trailing partial JSON.
          }
        }
      }

      onEvent({
        type: 'done',
        content: fullContent,
        reasoning_details: allReasoningDetails.length ? allReasoningDetails : undefined,
      })
      return
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (lastError.name === 'AbortError') {
        return
      }
    }
  }

  onEvent({ type: 'error', message: lastError?.message ?? 'All models failed' })
}
