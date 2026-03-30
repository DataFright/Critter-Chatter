describe('ChatBotStep — Characters & Bots', () => {
  function sseResponse(text: string) {
    return [
      `data: ${JSON.stringify({ type: 'content', token: text, content: text })}\n\n`,
      `data: ${JSON.stringify({ type: 'done', content: text, reasoning_details: [] })}\n\n`,
    ].join('')
  }

  beforeEach(() => {
    let callCount = 0
    cy.intercept('POST', '/api/chat', (req) => {
      if (req.body?.mode && req.body.mode !== 'chat') { req.continue(); return }
      callCount += 1
      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' },
        body: sseResponse(`reply ${callCount}`),
      })
    }).as('chat')

    cy.visit('/', {
      onBeforeLoad(win) { win.localStorage.removeItem('chatbot_selectedCharacterId') },
    })
    cy.get('[data-testid="chat-shell"]').should('be.visible')
  })

  it('shows Joe as default with correct subtitle', () => {
    cy.contains('h1', 'Joe').should('be.visible')
    cy.contains('Human helper').should('be.visible')
  })

  it('switching to Jinx updates header and starter', () => {
    cy.get('select[aria-label="Character selector"]').select('jinx')
    cy.contains('h1', 'Chaos Jinx').should('be.visible')
    cy.contains("Name's Chaos Jinx").should('be.visible')
  })

  it('switching to Volt updates header and starter', () => {
    cy.get('select[aria-label="Character selector"]').select('volt')
    cy.contains('h1', 'Volt Fox').should('be.visible')
    cy.contains('Volt Fox online').should('be.visible')
  })

  it('switching to Mabel updates header and starter', () => {
    cy.get('select[aria-label="Character selector"]').select('mabel')
    cy.contains('h1', 'Melancholy Mabel').should('be.visible')
    cy.contains('Mabel here').should('be.visible')
  })

  it('character selector shows all four bots', () => {
    cy.get('select[aria-label="Character selector"] option')
      .then(($opts) => [...$opts].map((o) => (o as HTMLOptionElement).value))
      .should('include.all.members', ['joe', 'jinx', 'volt', 'mabel'])
  })

  it('sending a message with Mabel sends correct characterId', () => {
    cy.get('select[aria-label="Character selector"]').select('mabel')
    cy.get('textarea[aria-label="Message input"]').type('hello mabel{enter}')
    cy.wait('@chat').its('request.body').should('have.property', 'characterId', 'mabel')
  })

  it('switching characters resets chat history to new starter', () => {
    cy.get('textarea[aria-label="Message input"]').type('test msg{enter}')
    cy.wait('@chat')
    cy.contains('test msg').should('be.visible')

    // Switch character — old messages should be gone
    cy.get('select[aria-label="Character selector"]').select('jinx')
    cy.contains('test msg').should('not.exist')
    cy.contains("Name's Chaos Jinx").should('be.visible')
  })

  it('all characters have avatars visible in Characters panel', () => {
    cy.get('[data-testid="tab-characters"]').click()
    cy.contains('🙂').should('be.visible')
    cy.contains('🐒').should('be.visible')
    cy.contains('🦊').should('be.visible')
    cy.contains('🐄').should('be.visible')
  })

  it('Mabel via Characters tab switch works and shows Active badge', () => {
    cy.get('[data-testid="tab-characters"]').click()
    cy.get('[data-testid="character-card-mabel"]').click()
    cy.contains('h1', 'Melancholy Mabel').should('be.visible')
    cy.get('[data-testid="tab-characters"]').click()
    cy.get('[data-testid="character-card-mabel"]').within(() => {
      cy.contains('Active').should('be.visible')
    })
  })

  it('Mabel characterId persists across page reload', () => {
    cy.get('select[aria-label="Character selector"]').select('mabel')
    cy.reload({ log: true })
    cy.get('select[aria-label="Character selector"]').should('have.value', 'mabel')
    cy.contains('h1', 'Melancholy Mabel').should('be.visible')
  })
})
