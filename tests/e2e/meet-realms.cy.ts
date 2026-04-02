describe('ChatBotStep - Meet Realm Shell', () => {
  function makeDialogueSse() {
    return [
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 1, speakerId: 'tempest', speakerName: 'Iron Tempest', speakerAvatar: 'B' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 1, speakerId: 'tempest', speakerName: 'Iron Tempest', speakerAvatar: 'B', content: 'Tempest opens' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 2, speakerId: 'echo', speakerName: 'Abyssal Echo', speakerAvatar: 'W' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 2, speakerId: 'echo', speakerName: 'Abyssal Echo', speakerAvatar: 'W', content: 'Echo follows' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 3, speakerId: 'luma', speakerName: 'Drift Luma', speakerAvatar: 'F' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 3, speakerId: 'luma', speakerName: 'Drift Luma', speakerAvatar: 'F', content: 'Luma follows' })}\n\n`,
    ].join('')
  }

  beforeEach(() => {
    cy.intercept('POST', '/api/chat', (req) => {
      if (req.body?.mode !== 'dialogue') {
        req.continue()
        return
      }

      req.reply({
        statusCode: 200,
        headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' },
        body: makeDialogueSse(),
      })
    }).as('dialogue')

    cy.visit('/')
    cy.wait('@dialogue')
  })

  it('renders the Meet Realm heading and panel', () => {
    cy.contains('Meet Realm').should('be.visible')
    cy.get('[data-testid="conversation-realm"]').should('be.visible')
  })

  it('keeps a single conversation surface visible', () => {
    cy.get('[data-testid="conversation-realm"]').should('have.length', 1)
  })

  it('shows larger layout width and height characteristics', () => {
    cy.get('[data-testid="conversation-realm"]').should('have.css', 'height', '760px')
    cy.get('main, body').then(() => {
      cy.get('[data-testid="conversation-realm"]').should('be.visible')
    })
  })

  it('runs dialogue on the single realm with full roster payload', () => {
    cy.get('@dialogue').its('request.body').should((body) => {
      expect(body.mode).to.equal('dialogue')
      expect(body.speakerIds).to.be.an('array').and.have.length(9)
      expect(body.speakerIds).to.include.members(['tempest', 'luma', 'echo'])
    })

    cy.get('[data-testid="conversation-realm"]').within(() => {
      cy.get('[data-testid="conversation-message"]').should('have.length', 3)
      cy.contains('Tempest opens').should('be.visible')
      cy.contains('Echo follows').should('be.visible')
      cy.contains('Luma follows').should('be.visible')
      cy.contains('3 live').should('be.visible')
    })
  })
})
