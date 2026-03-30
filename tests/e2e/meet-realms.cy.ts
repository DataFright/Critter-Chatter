describe('ChatBotStep — Meet Realm Management', () => {
  function makeDialogueSse() {
    return [
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 1, speakerId: 'joe', speakerName: 'Joe', speakerAvatar: '🙂' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_chunk', turn: 1, speakerId: 'joe', speakerName: 'Joe', speakerAvatar: '🙂', chunk: 'Joe opens', content: 'Joe opens' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 1, speakerId: 'joe', speakerName: 'Joe', speakerAvatar: '🙂', content: 'Joe opens' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 2, speakerId: 'jinx', speakerName: 'Chaos Jinx', speakerAvatar: '🐒' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_chunk', turn: 2, speakerId: 'jinx', speakerName: 'Chaos Jinx', speakerAvatar: '🐒', chunk: 'Jinx replies', content: 'Jinx replies' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 2, speakerId: 'jinx', speakerName: 'Chaos Jinx', speakerAvatar: '🐒', content: 'Jinx replies' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_done', total: 2 })}\n\n`,
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

  it('renders Meet Realm tab by default', () => {
    cy.contains('Meet Realm').should('be.visible')
    cy.get('[data-testid="add-meet-realm"]').should('be.visible')
  })

  it('adds a second Meet Realm and switches to it', () => {
    cy.get('[data-testid="add-meet-realm"]').click()
    cy.contains('Meet Realm 2').should('be.visible')
    cy.get('[data-testid="conversation-realm"]').should('be.visible')
  })

  it('adds up to 3 Meet Realms (max limit)', () => {
    cy.get('[data-testid="add-meet-realm"]').click()
    cy.get('[data-testid="add-meet-realm"]').click()
    cy.contains('Meet Realm 2').should('be.visible')
    cy.contains('Meet Realm 3').should('be.visible')
  })

  it('disables add button at 3 Meet Realms', () => {
    cy.get('[data-testid="add-meet-realm"]').click()
    cy.get('[data-testid="add-meet-realm"]').click()
    cy.get('[data-testid="add-meet-realm"]').should('be.disabled')
  })

  it('switches back to Meet Realm 1 from Meet Realm 2', () => {
    cy.get('[data-testid="add-meet-realm"]').click()
    cy.get('[data-testid="meet-realm-tab-1"]').click()
    cy.contains('Meet Realm').should('be.visible')
  })

  it('Meet Realm 2 has its own independent speaker selection', () => {
    // Change speakers in Meet Realm 1
    cy.get('[data-testid="conversation-realm"]').first().within(() => {
      cy.get('select[aria-label="Conversation first speaker"]').select('volt')
    })

    cy.get('[data-testid="add-meet-realm"]').click()

    // Meet Realm 2 should have fresh default speakers
    // The visible realm (Meet Realm 2) is the active one
    cy.get('[data-testid="meet-realm-tab-2"]').should('have.class', 'text-white')
    cy.get('[data-testid="conversation-realm"]').last().within(() => {
      cy.get('select[aria-label="Conversation first speaker"]').should('have.value', 'joe')
    })
  })

  it('each Meet Realm shows its own name in the header', () => {
    cy.get('[data-testid="conversation-realm"]').contains('Meet Realm').should('be.visible')

    cy.get('[data-testid="add-meet-realm"]').click()
    cy.get('[data-testid="conversation-realm"]').contains('Meet Realm 2').should('be.visible')
  })

  it('dialogue runs correctly in Meet Realm 1 after switching and back', () => {
    // Start a dialogue in Meet Realm 1
    cy.get('[data-testid="conversation-realm"]').first().within(() => {
      cy.get('select[aria-label="Conversation second speaker"]').select('jinx')
      cy.contains('▶ Start').click()
    })
    cy.wait('@dialogue')

    // Add Realm 2 and switch to it
    cy.get('[data-testid="add-meet-realm"]').click()
    cy.get('[data-testid="conversation-realm"]').last().within(() => {
      cy.get('[data-testid="conversation-message"]').should('have.length', 0)
    })

    // Switch back to Realm 1 — messages still there
    cy.get('[data-testid="meet-realm-tab-1"]').click()
    cy.get('[data-testid="conversation-realm"]').first().within(() => {
      cy.get('[data-testid="conversation-message"]').should('have.length.at.least', 1)
    })
  })

  it('active Meet Realm tab has selected styling', () => {
    cy.get('[data-testid="meet-realm-tab-1"]').should('have.class', 'text-white')
  })

  it('Meet Realm header label updates in each tab', () => {
    cy.get('[data-testid="add-meet-realm"]').click()
    cy.get('[data-testid="add-meet-realm"]').click()

    cy.get('[data-testid="meet-realm-tab-1"]').click()
    cy.get('[data-testid="conversation-realm"]').contains('Meet Realm').should('be.visible')

    cy.get('[data-testid="meet-realm-tab-2"]').click()
    cy.get('[data-testid="conversation-realm"]').contains('Meet Realm 2').should('be.visible')

    cy.get('[data-testid="meet-realm-tab-3"]').click()
    cy.get('[data-testid="conversation-realm"]').contains('Meet Realm 3').should('be.visible')
  })
})
