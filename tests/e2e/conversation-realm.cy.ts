describe('ChatBotStep - Meet Realm', () => {
  const realmSelector = '[data-testid="conversation-realm"]'
  const messageSelector = '[data-testid="conversation-message"]'

  function makeDialogueSse() {
    return [
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 1, speakerId: 'jinx', speakerName: 'Chaos Jinx', speakerAvatar: 'M' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 1, speakerId: 'jinx', speakerName: 'Chaos Jinx', speakerAvatar: 'M', content: 'Jinx opens' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 2, speakerId: 'tempest', speakerName: 'Iron Tempest', speakerAvatar: 'B' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 2, speakerId: 'tempest', speakerName: 'Iron Tempest', speakerAvatar: 'B', content: 'Tempest follows' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 3, speakerId: 'luma', speakerName: 'Drift Luma', speakerAvatar: 'F' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 3, speakerId: 'luma', speakerName: 'Drift Luma', speakerAvatar: 'F', content: 'Luma follows' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 4, speakerId: 'echo', speakerName: 'Abyssal Echo', speakerAvatar: 'W' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 4, speakerId: 'echo', speakerName: 'Abyssal Echo', speakerAvatar: 'W', content: 'Echo opens next block' })}\n\n`,
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
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        },
        body: makeDialogueSse(),
      })
    }).as('dialogue')

    cy.visit('/')
    cy.get(realmSelector).should('be.visible')
  })

  it('renders the full roster panel and random-order note', () => {
    cy.get(realmSelector).within(() => {
      cy.contains('Meet Realm').should('be.visible')
      cy.contains('Character Roster:').should('be.visible')
      cy.get('[data-testid="random-speaker-list"]').children().should('have.length.at.least', 9)
      cy.get('[data-testid="random-speaker-list"]')
        .invoke('attr', 'class')
        .should('include', 'grid-cols-2')
        .and('include', 'lg:grid-cols-4')
      cy.contains('Order:').should('be.visible')
      cy.contains('Randomized every 3 turns').should('be.visible')
    })
  })

  it('uses dark scrollbar styling class on the message panel', () => {
    cy.get(realmSelector).find('.meet-realm-scroll').should('exist')
  })

  it('sends all characters in payload on start', () => {
    cy.get(realmSelector).within(() => {
      cy.contains('button', 'Start').click()
    })

    cy.wait('@dialogue').its('request.body').should((body) => {
      expect(body.mode).to.equal('dialogue')
      expect(body.speakerIds).to.be.an('array').and.have.length(9)
      expect(body.speakerIds).to.include.members(['tempest', 'luma', 'echo'])
      expect(new Set(body.speakerIds).size).to.equal(9)
    })
  })

  it('renders messages in one column', () => {
    cy.get(realmSelector).within(() => {
      cy.contains('button', 'Start').click()
    })

    cy.wait('@dialogue')

    cy.get(realmSelector).within(() => {
      cy.get(messageSelector).should('have.length', 4)
      cy.get(messageSelector).each(($message) => {
        cy.wrap($message)
          .invoke('attr', 'class')
          .should('include', 'justify-start')
          .and('not.include', 'justify-end')
          .and('not.include', 'justify-center')
      })
    })
  })

  it('shows live progress without a fixed turn cap', () => {
    cy.get(realmSelector).within(() => {
      cy.contains('button', 'Start').click()
    })

    cy.wait('@dialogue')

    cy.get(realmSelector).within(() => {
      cy.contains('4 live').should('be.visible')
    })
  })

  it('applies unique bubble colors for different speakers', () => {
    cy.get(realmSelector).within(() => {
      cy.contains('button', 'Start').click()
    })

    cy.wait('@dialogue')

    cy.contains('Jinx opens').invoke('attr', 'class').should('include', 'border-fuchsia-700/60')
    cy.contains('Tempest follows').invoke('attr', 'class').should('include', 'border-red-700/60')
    cy.contains('Luma follows').invoke('attr', 'class').should('include', 'border-teal-700/60')
    cy.contains('Echo opens next block').invoke('attr', 'class').should('include', 'border-blue-700/60')
  })
})
