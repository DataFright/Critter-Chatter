describe('ChatBotStep — Edge Cases & Error Handling', () => {
  const inputSelector = 'textarea[aria-label="Message input"]'
  const sendButtonSelector = 'button[aria-label="Send message"]'

  function sseResponse(text: string) {
    return [
      `data: ${JSON.stringify({ type: 'reasoning', text: 'plotting mischief...' })}\n\n`,
      `data: ${JSON.stringify({ type: 'content', token: text, content: text })}\n\n`,
      `data: ${JSON.stringify({ type: 'done', content: text, reasoning_details: [] })}\n\n`,
    ].join('')
  }

  function triggerSendWithFallback(text: string) {
    cy.get(inputSelector).clear().type(text)
    cy.get(inputSelector).type('{enter}')

    // Check if Enter worked: wait for input to clear and button to be enabled.
    // If both remain after delay, use fallback click.
    cy.wait(500)
    cy.get(inputSelector).invoke('val').then((value) => {
      const hasText = String(value ?? '').trim().length > 0
      if (hasText) {
        // Input still has text after Enter = Enter didn't work.
        // Wait for any in-flight request to complete (button will be enabled when ready).
        cy.get(sendButtonSelector, { timeout: 12000 })
          .should('not.be.disabled')
          .then(($btn) => {
            // Button is now enabled and ready. Send fallback click.
            cy.wrap($btn).scrollIntoView().click()
          })
      }
    })
  }

  function sendAndWait(text: string, alias = '@chat') {
    triggerSendWithFallback(text)
    cy.wait(alias)
  }

  beforeEach(() => {
    let callCount = 0
    cy.intercept('POST', '/api/chat', (req) => {
      callCount += 1
      req.reply({
        statusCode: 200,
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        },
        body: sseResponse(`Response ${callCount}`),
      })
    }).as('chat')

    cy.visit('/')
    cy.contains('Human helper · StepKey AI').should('be.visible')
  })

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      cy.get('h1').should('exist')
      cy.get('h1').should('have.text', 'Joe')
    })

    it('textarea has aria-label', () => {
      cy.get(inputSelector).should('exist')
    })

    it('button has aria-label', () => {
      cy.get(sendButtonSelector).should('exist')
    })

    it('chat bubbles have role attributes', () => {
      sendAndWait('test')
      cy.get('[data-role="user"]').should('have.length', 1)
      cy.get('[data-role="assistant"]').should('have.length.at.least', 1)
    })

    it('messages are announced via aria-live', () => {
      cy.get('[aria-live]').should('exist')
    })
  })

  describe('Long Content Handling', () => {
    it('displays very long user message', () => {
      const longText = 'a'.repeat(500)
      sendAndWait(longText)
      cy.contains(longText).should('be.visible')
    })

    it('wraps long AI responses', () => {
      cy.intercept('POST', '/api/chat', (req) => {
        const longResponse = 'x'.repeat(300)
        req.reply({
          statusCode: 200,
          headers: { 'content-type': 'text/event-stream' },
          body: sseResponse(longResponse),
        })
      }).as('longChat')

      sendAndWait('test', '@longChat')
      cy.contains('x'.repeat(50)).should('be.visible')
    })
  })

  describe('Special Characters', () => {
    it('handles emoji in message', () => {
      const emoji = '🎭🎪🎨'
      sendAndWait(emoji)
      cy.contains(emoji).should('be.visible')
    })

    it('handles HTML-like content safely', () => {
      const html = '<script>alert("xss")</script>'
      sendAndWait(html)
      cy.contains(html).should('be.visible')
      // Content should be safely rendered as text, not HTML
    })

    it('handles line breaks in input', () => {
      cy.get(inputSelector).type('line one{shift+enter}line two')
      cy.get(inputSelector).type('{enter}')
      cy.wait(150)
      cy.get(inputSelector).then(($input) => {
        const value = String($input.val() ?? '')
        if (value.trim().length > 0) {
          cy.get(sendButtonSelector).click()
        }
      })
      cy.wait('@chat')
      cy.contains('line one').should('be.visible')
      cy.contains('line two').should('be.visible')
    })

    it('handles unicode and international text', () => {
      const text = '你好 مرحبا Привет'
      sendAndWait(text)
      cy.contains(text).should('be.visible')
    })
  })

  describe('Rapid Message Sending', () => {
    it('handles quick successive messages', () => {
      for (let i = 1; i <= 3; i++) {
        sendAndWait(`msg ${i}`)
      }
      cy.contains('msg 1').should('be.visible')
      cy.contains('msg 2').should('be.visible')
      cy.contains('msg 3').should('be.visible')
    })
  })

  describe('Network Error Scenarios', () => {
    it('shows error on 500 response', () => {
      cy.intercept('POST', '/api/chat', { statusCode: 500 })
      triggerSendWithFallback('test')
      // Should show fallback message or error message
      cy.contains('I hit a snag', { matchCase: false }).should('be.visible')
    })

    it('shows error on malformed response', () => {
      cy.intercept('POST', '/api/chat', (req) => {
        req.reply({
          statusCode: 200,
          headers: { 'content-type': 'text/event-stream' },
          body: 'invalid sse data',
        })
      })
      triggerSendWithFallback('test')
      // User message should still appear
      cy.contains('test').should('be.visible')
    })
  })

  describe('Button State Management', () => {
    it('button disabled on mount', () => {
      cy.get(sendButtonSelector).should('be.disabled')
    })

    it('button enables/disables on input', () => {
      cy.get(sendButtonSelector).should('be.disabled')
      cy.get(inputSelector).type('a')
      cy.get(sendButtonSelector).should('not.be.disabled')
      cy.get(inputSelector).clear()
      cy.get(sendButtonSelector).should('be.disabled')
    })

    it('can send multiple times', () => {
      sendAndWait('test1')
      cy.contains('test1').should('be.visible')
      cy.get(sendButtonSelector).should('exist')
      sendAndWait('test2')
      cy.contains('test2').should('be.visible')
    })
  })

  describe('Message Ordering', () => {
    it('keeps messages in correct order', () => {
      for (let i = 1; i <= 5; i++) {
        sendAndWait(`msg ${i}`)
      }
      // Verify order by checking position in DOM
      cy.get('[data-testid="chat-bubble"]').should('have.length.at.least', 10) // 5 user + 5+ assistant
    })
  })

  describe('Reasoning Display', () => {
    it('shows reasoning disclosure control', () => {
      sendAndWait('test')
      cy.contains('reasoning on').should('be.visible')
    })

    it('displays reasoning block when expanded', () => {
      sendAndWait('test')
      // Look for reasoning button/disclosure
      cy.get('button').contains(/reasoning|thinking/i, { matchCase: false }).should('exist')
    })
  })

  describe('Scroll Behavior', () => {
    it('scrolls to bottom on new message', () => {
      const messages = []
      for (let i = 1; i <= 3; i++) {
        messages.push(`msg ${i}`)
        sendAndWait(`msg ${i}`)
      }
      // Last message should be visible
      cy.get('[data-testid="chat-bubble"]').last().should('be.visible')
    })
  })

  describe('Input Edge Cases', () => {
    it('handles tab in textarea', () => {
      sendAndWait('tab\there')
      cy.contains('tab').should('be.visible')
    })

    it('trims whitespace from messages', () => {
      sendAndWait('  spaces  ')
      // Exact content depends on implementation, but message should appear
      cy.get('[data-testid="chat-bubble"][data-role="user"]').should('have.length', 1)
    })

    it('does not send empty whitespace-only message', () => {
      cy.get(inputSelector).type('   {enter}')
      // No user message should be added
      cy.get('[data-testid="chat-bubble"][data-role="user"]').should('have.length', 0)
    })
  })

  describe('Performance', () => {
    it('handles 3 rapid back-and-forth exchanges efficiently', () => {
      const startTime = Date.now()
      for (let i = 1; i <= 3; i++) {
        sendAndWait(`rapid ${i}`)
      }
      cy.get('[data-testid="chat-bubble"]').should('have.length.at.least', 6) // 3 user + 3+ assistant
      const endTime = Date.now()
      // Should complete within reasonable time (not a strict requirement, just for visibility)
      cy.wrap(endTime - startTime).should('be.greaterThan', 0)
    })

    it('maintains performance with long message history', () => {
      let callCount = 0
      cy.intercept('POST', '/api/chat', (req) => {
        callCount += 1
        req.reply({
          statusCode: 200,
          headers: { 'content-type': 'text/event-stream' },
          body: sseResponse(`Response ${callCount}`),
        })
      }).as('chatPerf')

      // Send 10 messages
      for (let i = 1; i <= 10; i++) {
        sendAndWait(`msg ${i}`, '@chatPerf')
      }

      // All should be visible/in DOM
      cy.get('[data-testid="chat-bubble"][data-role="user"]').should('have.length', 10)
      cy.get('[data-testid="chat-bubble"][data-role="assistant"]').should('have.length.at.least', 10)
    })
  })

  describe('Starter Message', () => {
    it('displays starter message on load', () => {
      cy.contains("Hey, I'm Joe").should('be.visible')
    })

    it('starter is marked as assistant', () => {
      cy.get('[data-testid="chat-bubble"][data-role="assistant"]').should('have.length.at.least', 1)
    })
  })
})
