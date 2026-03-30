describe('ChatBotStep — Tab Switching', () => {
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

  it('Chat tab is active by default', () => {
    cy.get('[data-testid="tab-chat"]').should('have.class', 'border-indigo-500')
    cy.get('textarea[aria-label="Message input"]').should('be.visible')
  })

  it('clicking Thought tab shows the thought window', () => {
    cy.get('[data-testid="tab-thought"]').click()
    cy.contains('Internal monologue').should('be.visible')
    cy.get('textarea[aria-label="Message input"]').should('not.exist')
  })

  it('clicking Characters tab shows character selection', () => {
    cy.get('[data-testid="tab-characters"]').click()
    cy.get('[data-testid="characters-panel"]').should('be.visible')
    cy.contains('Select Character').should('be.visible')
  })

  it('Characters tab lists all four bots', () => {
    cy.get('[data-testid="tab-characters"]').click()
    cy.get('[data-testid="character-card-joe"]').should('exist')
    cy.get('[data-testid="character-card-jinx"]').should('exist')
    cy.get('[data-testid="character-card-volt"]').should('exist')
    cy.get('[data-testid="character-card-mabel"]').should('exist')
  })

  it('active character shows Active badge in Characters tab', () => {
    cy.get('[data-testid="tab-characters"]').click()
    cy.get('[data-testid="character-card-joe"]').within(() => {
      cy.contains('Active').should('be.visible')
    })
  })

  it('selecting a character from Characters tab switches to Chat tab', () => {
    cy.get('[data-testid="tab-characters"]').click()
    cy.get('[data-testid="character-card-jinx"]').click()
    cy.get('[data-testid="tab-chat"]').should('have.class', 'border-indigo-500')
    cy.contains('h1', 'Chaos Jinx').should('be.visible')
  })

  it('selecting a character from Characters tab shows new starter message', () => {
    cy.get('[data-testid="tab-characters"]').click()
    cy.get('[data-testid="character-card-volt"]').click()
    cy.contains('Volt Fox online').should('be.visible')
  })

  it('clicking back to Chat tab from Thought restores chat input', () => {
    cy.get('[data-testid="tab-thought"]').click()
    cy.get('[data-testid="tab-chat"]').click()
    cy.get('textarea[aria-label="Message input"]').should('be.visible')
  })

  it('Thought tab shows pulsing indicator when thinking is active', () => {
    cy.get('[data-testid="tab-thought"]').click()
    cy.contains('▶ Start').click()
    cy.get('[data-testid="tab-chat"]').click()
    // Should show the pulse dot on the Thought tab button
    cy.get('[data-testid="tab-thought"]').find('.animate-pulse').should('exist')
  })

  it('character trait description visible in Characters panel', () => {
    cy.get('[data-testid="tab-characters"]').click()
    cy.get('[data-testid="character-card-joe"]').within(() => {
      cy.contains('Joe').should('be.visible')
    })
    // Joe's personality description should be visible
    cy.get('[data-testid="characters-panel"]').contains('Friendly and normal').should('be.visible')
  })
})
