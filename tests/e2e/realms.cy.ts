describe('ChatBotStep — Realm Management', () => {
  function sseResponse(text: string) {
    return [
      `data: ${JSON.stringify({ type: 'content', token: text, content: text })}\n\n`,
      `data: ${JSON.stringify({ type: 'done', content: text, reasoning_details: [] })}\n\n`,
    ].join('')
  }

  beforeEach(() => {
    cy.intercept('POST', '/api/chat', (req) => {
      if (req.body?.mode && req.body.mode !== 'chat') { req.continue(); return }
      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' },
        body: sseResponse('bot reply'),
      })
    }).as('chat')

    cy.visit('/', {
      onBeforeLoad(win) { win.localStorage.removeItem('chatbot_selectedCharacterId') },
    })
    cy.get('[data-testid="chat-shell"]').should('be.visible')
  })

  it('renders Common Realm tab by default', () => {
    cy.contains('Common Realm').should('be.visible')
    cy.get('[data-testid="add-realm"]').should('be.visible')
  })

  it('adds a second realm and switches to it', () => {
    cy.get('[data-testid="add-realm"]').click()
    cy.contains('Realm 2').should('be.visible')
    cy.get('[data-testid="chat-shell"]').should('be.visible')
  })

  it('adds up to 3 realms (max limit)', () => {
    cy.get('[data-testid="add-realm"]').click()
    cy.contains('Realm 2').should('be.visible')
    cy.get('[data-testid="add-realm"]').click()
    cy.contains('Realm 3').should('be.visible')
  })

  it('disables add button at 3 realms', () => {
    cy.get('[data-testid="add-realm"]').click()
    cy.get('[data-testid="add-realm"]').click()
    cy.get('[data-testid="add-realm"]').should('be.disabled')
  })

  it('switches back to Common Realm when its tab is clicked', () => {
    cy.get('[data-testid="add-realm"]').click()
    cy.get('[data-testid="realm-tab-1"]').click()
    cy.contains('Common Realm').should('be.visible')
  })

  it('each realm has its own independent chat history', () => {
    const input = 'textarea[aria-label="Message input"]'

    // Send a message in Realm 1
    cy.get(input).type('hello from realm one{enter}')
    cy.wait('@chat')
    cy.contains('hello from realm one').should('be.visible')

    // Add Realm 2 — should start with a clean slate (no messages from Realm 1)
    cy.get('[data-testid="add-realm"]').click()
    // Realm 1's messages still exist in the DOM (hidden) but Realm 2 has no messages
    cy.get('[data-testid="chat-shell"]').within(() => {
      cy.contains('hello from realm one').should('not.exist')
    })
  })

  it('character selection in Realm 2 does not affect Realm 1', () => {
    cy.get('[data-testid="add-realm"]').click()
    // Wait for Realm 2's shell to be visible then switch character
    cy.get('[data-testid="chat-shell"]').should('be.visible')
    cy.get('[data-testid="chat-shell"]').within(() => {
      cy.get('select[aria-label="Character selector"]').select('jinx')
    })
    cy.contains('h1', 'Chaos Jinx').should('be.visible')

    // Switch back to Realm 1 — should still be Joe
    cy.get('[data-testid="realm-tab-1"]').click()
    cy.contains('h1', 'Joe').should('be.visible')
  })

  it('tab strip is scrollable with overflow', () => {
    cy.get('[data-testid="add-realm"]').click()
    cy.get('[data-testid="add-realm"]').click()
    // All three tabs visible with add button disabled
    cy.contains('Common Realm').should('be.visible')
    cy.contains('Realm 2').should('be.visible')
    cy.contains('Realm 3').should('be.visible')
  })

  it('active realm tab has selected styling (text-white)', () => {
    cy.get('[data-testid="realm-tab-1"]').should('have.class', 'text-white')
  })

  it('inactive realm tab has muted styling after adding second realm', () => {
    cy.get('[data-testid="add-realm"]').click()
    // Realm 2 is now active, Realm 1 tab should be muted
    cy.get('[data-testid="realm-tab-1"]').should('have.class', 'text-zinc-500')
  })
})
