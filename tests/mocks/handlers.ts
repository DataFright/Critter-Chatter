import { http, HttpResponse } from 'msw'

// Fake SSE stream that sends: reasoning chunk → content chunk → done
function makeFakeStream(reasoning = 'thinking about mischief...', content = 'Stolen it already.') {
  const encoder = new TextEncoder()
  const events = [
    `data: ${JSON.stringify({ type: 'reasoning', text: reasoning })}\n\n`,
    `data: ${JSON.stringify({ type: 'content', token: content, content })}\n\n`,
    `data: ${JSON.stringify({ type: 'done', content, reasoning_details: [] })}\n\n`,
  ]

  let index = 0
  return new ReadableStream({
    pull(controller) {
      if (index < events.length) {
        controller.enqueue(encoder.encode(events[index++]))
      } else {
        controller.close()
      }
    },
  })
}

export const handlers = [
  http.get('/api/health', () => {
    return HttpResponse.json({ ok: true, label: 'StepKey', model: 'stepfun/step-3.5-flash:free' })
  }),

  http.post('/api/chat', async ({ request }) => {
    const body = (await request.json()) as { messages?: unknown[] }

    if (!Array.isArray(body?.messages) || body.messages.length === 0) {
      return HttpResponse.json({ error: 'messages is required' }, { status: 400 })
    }

    return new HttpResponse(makeFakeStream(), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }),
]
