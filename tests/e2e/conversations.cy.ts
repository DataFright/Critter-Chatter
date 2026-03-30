describe('ChatBotStep — Conversations Extended', () => {
  function sseResponse(text: string) {
    return [
      `data: ${JSON.stringify({ type: 'content', token: text, content: text })}\n\n`,
      `data: ${JSON.stringify({ type: 'done', content: text, reasoning_details: [] })}\n\n`,
    ].join('')
  }

  function errorSseResponse(message: string) {
    return `data: ${JSON.stringify({ type: 'error', message })}\n\n`
  }

  function triggerSend(text: string) {
    cy.get('textarea[aria-label="Message input"]').clear().type(text)
    cy.get('textarea[aria-label="Message input"]').type('{enter}')
    cy.wait(300)
    cy.get('textarea[aria-label="Message input"]').invoke('val').then((val) => {
      if (String(val ?? '').trim().length > 0) {
        cy.get('button[aria-label="Send message"]').should('not.be.disabled').click()
      }
    })
  }

  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) { win.localStorage.removeItem('chatbot_selectedCharacterId') },
    })
    cy.get('[data-testid="chat-shell"]').should('be.visible')
  })

  it('shows error banner when API returns 500', () => {
    cy.intercept('POST', '/api/chat', { statusCode: 500, body: { error: 'Server error' } }).as('err')
    triggerSend('test message')
    cy.wait('@err')
    cy.contains('Server error').should('be.visible')
  })

  it('shows error banner when SSE stream sends error event', () => {
    cy.intercept('POST', '/api/chat', {
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
      body: errorSseResponse('stream exploded'),
    }).as('streamErr')
    triggerSend('trigger error')
    cy.wait('@streamErr')
    cy.contains('stream exploded').should('be.visible')
  })

  it('can send more messages after an error (recovery)', () => {
    let failing = true
    cy.intercept('POST', '/api/chat', (req) => {
      if (failing) {
        req.reply({ statusCode: 500, body: { error: 'temp fail' } })
        failing = false
      } else {
        req.reply({
          statusCode: 200,
          headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
          body: sseResponse('recovered!'),
        })
      }
    }).as('mixed')

    triggerSend('first message')
    cy.wait('@mixed')
    cy.contains('temp fail').should('be.visible')

    triggerSend('second message')
    cy.wait('@mixed')
    cy.contains('recovered!').should('be.visible')
  })

  it('reasoning block renders and is collapsible', () => {
    cy.intercept('POST', '/api/chat', {
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
      body: [
        `data: ${JSON.stringify({ type: 'reasoning', text: 'my internal reasoning text' })}\n\n`,
        `data: ${JSON.stringify({ type: 'content', token: 'final answer', content: 'final answer' })}\n\n`,
        `data: ${JSON.stringify({ type: 'done', content: 'final answer', reasoning_details: [{ text: 'my internal reasoning text' }] })}\n\n`,
      ].join(''),
    }).as('withReasoning')

    triggerSend('what are you thinking')
    cy.wait('@withReasoning')

    cy.contains('final answer').should('be.visible')
    // Reasoning toggle button should appear
    cy.contains(/show thinking|hide thinking/i).should('be.visible')
  })

  it('message input is disabled while waiting for response', () => {
    cy.intercept('POST', '/api/chat', (req) => {
      req.reply({ delay: 1000, statusCode: 200, headers: { 'content-type': 'text/event-stream' }, body: sseResponse('delayed') })
    }).as('slowReq')
    triggerSend('slow request')
    cy.get('button[aria-label="Send message"]').should('be.disabled')
  })

  it('messages appear in correct user-then-assistant order', () => {
    cy.intercept('POST', '/api/chat', {
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
      body: sseResponse('bot answer'),
    }).as('chat')

    triggerSend('ordering test')
    cy.wait('@chat')

    cy.get('[data-testid="chat-bubble"]').then(($bubbles) => {
      const roles = [...$bubbles].map((b) => b.getAttribute('data-role'))
      // Find ordering test message: should be user then assistant
      const userIdx = roles.findIndex((_, i) => $bubbles[i].textContent?.includes('ordering test'))
      expect(roles[userIdx]).to.equal('user')
      expect(roles[userIdx + 1]).to.equal('assistant')
    })
  })

  it('long AI response text wraps correctly without overflow', () => {
    const longText = 'word '.repeat(200)
    cy.intercept('POST', '/api/chat', {
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
      body: sseResponse(longText),
    }).as('long')

    triggerSend('give long answer')
    cy.wait('@long')
    cy.get('[data-testid="chat-bubble"][data-role="assistant"]').last().then(($el) => {
      expect($el[0].scrollWidth).to.be.lte($el[0].offsetWidth + 5)
    })
  })

  it('subsequent messages show incremented user and assistant counts', () => {
    cy.intercept('POST', '/api/chat', {
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
      body: sseResponse('reply'),
    }).as('chat')

    triggerSend('msg one')
    cy.wait('@chat')
    triggerSend('msg two')
    cy.wait('@chat')

    cy.get('[data-testid="chat-bubble"][data-role="user"]').should('have.length', 2)
    cy.get('[data-testid="chat-bubble"][data-role="assistant"]').should('have.length.at.least', 2)
  })
})
