describe('ChatBotStep — Meet Realm', () => {
  const realmSelector = '[data-testid="conversation-realm"]'
  const messageSelector = '[data-testid="conversation-message"]'

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

  function makeJinxMabelVoltDialogueSse() {
    return [
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 1, speakerId: 'jinx', speakerName: 'Chaos Jinx', speakerAvatar: '🐒' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 1, speakerId: 'jinx', speakerName: 'Chaos Jinx', speakerAvatar: '🐒', content: 'I hid the moonbeams.' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 2, speakerId: 'mabel', speakerName: 'Melancholy Mabel', speakerAvatar: '🐄' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 2, speakerId: 'mabel', speakerName: 'Melancholy Mabel', speakerAvatar: '🐄', content: 'They still hum softly.' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 3, speakerId: 'volt', speakerName: 'Volt Fox', speakerAvatar: '🦊' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 3, speakerId: 'volt', speakerName: 'Volt Fox', speakerAvatar: '🦊', content: 'I can carry that tune farther.' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_done', total: 50 })}\n\n`,
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

  it('renders Meet Realm controls and default order text', () => {
    cy.get(realmSelector).within(() => {
      cy.contains('Meet Realm').should('be.visible')
      cy.get('select[aria-label="Conversation first speaker"]').should('be.visible')
      cy.get('select[aria-label="Conversation second speaker"]').should('be.visible')
      cy.get('select[aria-label="Conversation third speaker"]').should('be.visible')
      cy.contains('Order:').should('be.visible')
      cy.contains('Joe opens').should('be.visible')
      cy.contains('Volt Fox follows').should('be.visible')
    })
  })

  it('blocks starting when any selected speakers are identical', () => {
    cy.get(realmSelector).within(() => {
      cy.get('select[aria-label="Conversation first speaker"]').select('joe')
      cy.get('select[aria-label="Conversation second speaker"]').select('joe')
      cy.contains('Select three different bots to start a conversation.').should('be.visible')
      cy.contains('button', '▶ Start').should('be.disabled')
    })
  })

  it('starts dialogue mode and sends speaker ids in payload', () => {
    cy.get(realmSelector).within(() => {
      cy.get('select[aria-label="Conversation first speaker"]').select('joe')
      cy.get('select[aria-label="Conversation second speaker"]').select('jinx')
      cy.get('select[aria-label="Conversation third speaker"]').select('volt')
      cy.contains('button', '▶ Start').click()
    })

    cy.wait('@dialogue').its('request.body').should((body) => {
      expect(body.mode).to.equal('dialogue')
      expect(body.speakerAId).to.equal('joe')
      expect(body.speakerBId).to.equal('jinx')
      expect(body.speakerCId).to.equal('volt')
    })
  })

  it('renders alternating streamed conversation messages', () => {
    cy.get(realmSelector).within(() => {
      cy.contains('button', '▶ Start').click()
    })

    cy.wait('@dialogue')

    cy.get(realmSelector).within(() => {
      cy.get(messageSelector).should('have.length', 3)
      cy.contains('Turn 1').should('be.visible')
      cy.contains('Turn 2').should('be.visible')
      cy.contains('Turn 3').should('be.visible')
      cy.contains('Joe opens').should('be.visible')
      cy.contains('Jinx replies').should('be.visible')
      cy.contains('Volt jumps in').should('be.visible')
    })
  })

  it('switches to Stop while pending and back to Start when stopped', () => {
    cy.intercept('POST', '/api/chat', (req) => {
      if (req.body?.mode !== 'dialogue') {
        req.continue()
        return
      }

      req.reply({
        delay: 800,
        statusCode: 200,
        headers: {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        },
        body: makeDialogueSse(),
      })
    }).as('dialogueSlow')

    cy.get(realmSelector).within(() => {
      cy.contains('button', '▶ Start').click()
      cy.contains('button', '⏹ Stop').should('be.visible').click()
      cy.contains('button', '▶ Start').should('be.visible')
    })
  })

  it('shows real dialogue content and does not render fallback try-again lines', () => {
    cy.get(realmSelector).within(() => {
      cy.contains('button', '▶ Start').click()
    })

    cy.wait('@dialogue')

    cy.get(realmSelector).within(() => {
      cy.contains('Joe opens').should('be.visible')
      cy.contains('Jinx replies').should('be.visible')
      cy.contains('Volt jumps in').should('be.visible')
      cy.contains('Try me again.').should('not.exist')
      cy.contains('try again').should('not.exist')
      cy.contains('Stay with me and try again.').should('not.exist')
    })
  })

  it('renders Jinx, Mabel, and Volt dialogue without fallback copy', () => {
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
        body: makeJinxMabelVoltDialogueSse(),
      })
    }).as('dialogueJinxMabelVolt')

    cy.get(realmSelector).within(() => {
      cy.get('select[aria-label="Conversation first speaker"]').select('jinx')
      cy.get('select[aria-label="Conversation second speaker"]').select('mabel')
      cy.get('select[aria-label="Conversation third speaker"]').select('volt')
      cy.contains('button', '▶ Start').click()
    })

    cy.wait('@dialogueJinxMabelVolt')

    cy.get(realmSelector).within(() => {
      cy.contains('Chaos Jinx').should('be.visible')
      cy.contains('Melancholy Mabel').should('be.visible')
      cy.contains('Volt Fox').should('be.visible')
      cy.contains('I hid the moonbeams.').should('be.visible')
      cy.contains('They still hum softly.').should('be.visible')
      cy.contains('I can carry that tune farther.').should('be.visible')
      cy.contains('Chaos static. Try me again.').should('not.exist')
      cy.contains('The signal turned to static. Stay with me and try again.').should('not.exist')
    })
  })
})
