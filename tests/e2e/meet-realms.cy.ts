describe('ChatBotStep — Meet Realm Shell', () => {
  function makeDialogueSse() {
    return [
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 1, speakerId: 'joe', speakerName: 'Joe', speakerAvatar: '🙂' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_chunk', turn: 1, speakerId: 'joe', speakerName: 'Joe', speakerAvatar: '🙂', chunk: 'Joe opens', content: 'Joe opens' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 1, speakerId: 'joe', speakerName: 'Joe', speakerAvatar: '🙂', content: 'Joe opens' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 2, speakerId: 'jinx', speakerName: 'Chaos Jinx', speakerAvatar: '🐒' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_chunk', turn: 2, speakerId: 'jinx', speakerName: 'Chaos Jinx', speakerAvatar: '🐒', chunk: 'Jinx replies', content: 'Jinx replies' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 2, speakerId: 'jinx', speakerName: 'Chaos Jinx', speakerAvatar: '🐒', content: 'Jinx replies' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 3, speakerId: 'volt', speakerName: 'Volt Fox', speakerAvatar: '🦊' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_chunk', turn: 3, speakerId: 'volt', speakerName: 'Volt Fox', speakerAvatar: '🦊', chunk: 'Volt jumps in', content: 'Volt jumps in' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 3, speakerId: 'volt', speakerName: 'Volt Fox', speakerAvatar: '🦊', content: 'Volt jumps in' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_done', total: 50 })}\n\n`,
    ].join('')
  }

  beforeEach(() => {
    cy.intercept('POST', '/api/chat', (req) => {
      if (req.body?.mode !== 'dialogue') { req.continue(); return }
      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' },
        body: makeDialogueSse(),
      })
    }).as('dialogue')

    cy.visit('/')
    cy.get('[data-testid="conversation-realm"]').should('be.visible')
  })

  it('renders the Meet Realm heading and panel', () => {
    cy.contains('Meet Realm').should('be.visible')
    cy.get('[data-testid="conversation-realm"]').should('be.visible')
  })

  it('does not show add-realm controls anymore', () => {
    cy.get('[data-testid="add-meet-realm"]').should('not.exist')
    cy.get('[data-testid^="meet-realm-tab-"]').should('not.exist')
  })

  it('keeps a single conversation surface visible', () => {
    cy.get('[data-testid="conversation-realm"]').should('have.length', 1)
  })

  it('shows larger layout width and height characteristics', () => {
    cy.get('[data-testid="conversation-realm"]').should(($panel) => {
      const rect = $panel[0].getBoundingClientRect()
      expect(rect.width).to.be.greaterThan(700)
      expect(rect.height).to.be.greaterThan(700)
    })
  })

  it('dialogue still runs on the single realm', () => {
    cy.get('[data-testid="conversation-realm"]').within(() => {
      cy.get('select[aria-label="Conversation second speaker"]').select('jinx')
      cy.get('select[aria-label="Conversation third speaker"]').select('volt')
      cy.contains('▶ Start').click()
    })
    cy.wait('@dialogue')

    cy.get('[data-testid="conversation-realm"]').within(() => {
      cy.get('[data-testid="conversation-message"]').should('have.length', 3)
      cy.contains('Joe opens').should('be.visible')
      cy.contains('Jinx replies').should('be.visible')
      cy.contains('Volt jumps in').should('be.visible')
    })
  })
})
