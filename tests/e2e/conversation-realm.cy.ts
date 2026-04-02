describe('ChatBotStep - Meet Realm', () => {
  const realmSelector = '[data-testid="conversation-realm"]'
  const messageSelector = '[data-testid="conversation-message"]'

  function makeLongDialogueSse(totalTurns = 120) {
    const speakers = [
      { id: 'jinx', name: 'Chaos Jinx', avatar: 'M' },
      { id: 'tempest', name: 'Iron Tempest', avatar: 'B' },
      { id: 'luma', name: 'Drift Luma', avatar: 'F' },
      { id: 'echo', name: 'Abyssal Echo', avatar: 'W' },
    ]

    const events: string[] = []

    for (let turn = 1; turn <= totalTurns; turn += 1) {
      const speaker = speakers[(turn - 1) % speakers.length]
      events.push(
        `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn, speakerId: speaker.id, speakerName: speaker.name, speakerAvatar: speaker.avatar })}\n\n`,
      )
      events.push(
        `data: ${JSON.stringify({ type: 'dialogue_message', turn, speakerId: speaker.id, speakerName: speaker.name, speakerAvatar: speaker.avatar, content: `Long message ${turn}` })}\n\n`,
      )
    }

    return events.join('')
  }

  function makeDialogueSse() {
    return [
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 1, speakerId: 'jinx', speakerName: 'Chaos Jinx', speakerAvatar: 'M' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 1, speakerId: 'jinx', speakerName: 'Chaos Jinx', speakerAvatar: 'M', content: 'Jinx opens' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_reaction', speakerId: 'tempest', speakerName: 'Iron Tempest', speakerAvatar: 'B', targetTurn: 1, targetSpeakerId: 'jinx', targetSpeakerName: 'Chaos Jinx', reactionScore: 4, content: 'B is into Chaos Jinx\'s take' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_reaction', speakerId: 'luma', speakerName: 'Drift Luma', speakerAvatar: 'F', targetTurn: 1, targetSpeakerId: 'jinx', targetSpeakerName: 'Chaos Jinx', reactionScore: 5, content: 'F thinks this is interesting' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_reaction', speakerId: 'volt', speakerName: 'Static Volt', speakerAvatar: 'Z', targetTurn: 1, targetSpeakerId: 'jinx', targetSpeakerName: 'Chaos Jinx', reactionScore: 6, content: 'Z absolutely loves it' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_turn_started', turn: 2, speakerId: 'tempest', speakerName: 'Iron Tempest', speakerAvatar: 'B' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_message', turn: 2, speakerId: 'tempest', speakerName: 'Iron Tempest', speakerAvatar: 'B', content: 'Tempest follows' })}\n\n`,
      `data: ${JSON.stringify({ type: 'dialogue_reaction', speakerId: 'echo', speakerName: 'Abyssal Echo', speakerAvatar: 'W', targetTurn: 2, targetSpeakerId: 'tempest', targetSpeakerName: 'Iron Tempest', reactionScore: 6, content: 'W loves this from Iron Tempest' })}\n\n`,
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
    cy.wait('@dialogue')
  })

  it('renders the Meet Realm heading', () => {
    cy.get(realmSelector).within(() => {
      cy.contains('Meet Realm').should('be.visible')
    })
  })

  it('uses dark scrollbar styling class on the message panel', () => {
    cy.get(realmSelector).find('.meet-realm-scroll').should('exist')
  })

  it('sends all characters in payload on start', () => {
    cy.get('@dialogue').its('request.body').should((body) => {
      expect(body.mode).to.equal('dialogue')
      expect(body.speakerIds).to.be.an('array').and.have.length(9)
      expect(body.speakerIds).to.include.members(['tempest', 'luma', 'echo'])
      expect(new Set(body.speakerIds).size).to.equal(9)
    })
  })

  it('renders messages in one column', () => {
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

  it('shows live speaker count in the header', () => {
    cy.get(realmSelector).within(() => {
      cy.get('[data-testid="conversation-progress"]').should('contain', '5 live')
    })
  })

  it('applies unique bubble colors for different speakers', () => {
    cy.contains('Jinx opens').invoke('attr', 'class').should('include', 'border-fuchsia-700/60')
    cy.contains('Tempest follows').invoke('attr', 'class').should('include', 'border-red-700/60')
    cy.contains('Luma follows').invoke('attr', 'class').should('include', 'border-teal-700/60')
    cy.contains('Echo opens next block').invoke('attr', 'class').should('include', 'border-blue-700/60')
  })

  it('renders reactions in side sections as emoji symbols', () => {
    // Should have 2 message reactions sections (one for Turn 1 with 3 reactions, one for Turn 2 with 1 reaction)
    cy.get('[data-testid="message-reactions"]').should('have.length', 2)
    
    // First message (Turn 1: Jinx opens) should have 3 reactions from different people
    cy.get(messageSelector).first().within(() => {
      cy.get('[data-testid="message-reactions"]').within(() => {
        // Should have 3 emoji reactions total
        cy.get('[data-reaction-tier]').should('have.length', 3)
        // Should include warm reactions (✨) and a strong reaction (🔥)
        cy.get('[data-reaction-tier="warm"]').should('have.length', 2)
        cy.get('[data-reaction-tier="strong"]').should('have.length', 1)
      })
    })

    // Second message (Turn 2: Tempest follows) should have 1 strong reaction (🔥)
    cy.get(messageSelector).eq(1).within(() => {
      cy.get('[data-testid="message-reactions"]').within(() => {
        cy.get('[data-reaction-tier="strong"]').should('contain', '🔥')
        cy.get('[data-reaction-tier]').should('have.length', 1)
      })
    })

    // Verify tooltips contain reaction details
    cy.get('[data-testid="message-reactions"]').first().within(() => {
      cy.get('[data-reaction-tier="warm"]').first().should(
        'have.attr',
        'title',
        "Iron Tempest reacted: B is into Chaos Jinx's take",
      )
      cy.get('[data-reaction-tier="warm"]').eq(1).should(
        'have.attr',
        'title',
        'Drift Luma reacted: F thinks this is interesting',
      )
      cy.get('[data-reaction-tier="strong"]').should(
        'have.attr',
        'title',
        'Static Volt reacted: Z absolutely loves it',
      )
    })
  })

  it('forces one comment to have multiple reactions and renders all icons on screen', () => {
    cy.contains('Jinx opens').should('be.visible')

    cy.get(messageSelector).first().within(() => {
      cy.get('[data-testid="message-reactions"]').should('be.visible')
      cy.get('[data-testid="message-reactions"] [data-reaction-tier]').should('have.length', 3)
      cy.get('[data-testid="message-reactions"] [data-reaction-tier="warm"]').should('have.length', 2)
      cy.get('[data-testid="message-reactions"] [data-reaction-tier="strong"]').should('have.length', 1)
      cy.contains('✨').should('be.visible')
      cy.contains('🔥').should('be.visible')
    })
  })

  it('keeps only the latest 100 displayed messages after long runs', () => {
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
        body: makeLongDialogueSse(120),
      })
    }).as('dialogueLong')

    cy.contains('button', '▶ Start').click()
    cy.wait('@dialogueLong')

    cy.get(messageSelector).should('have.length', 100)
    cy.contains(/^Long message 1$/).should('not.exist')
    cy.contains(/^Long message 21$/).should('exist')
    cy.contains(/^Long message 120$/).should('exist')
  })

  it('deletes the first message once message count exceeds 100', () => {
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
        body: makeLongDialogueSse(101),
      })
    }).as('dialogue101')

    cy.contains('button', '▶ Start').click()
    cy.wait('@dialogue101')

    cy.get(messageSelector).should('have.length', 100)
    cy.contains(/^Long message 1$/).should('not.exist')
    cy.contains(/^Long message 2$/).should('exist')
    cy.contains(/^Long message 101$/).should('exist')
  })

  it('shows an error banner when dialogue request fails', () => {
    cy.intercept('POST', '/api/chat', (req) => {
      if (req.body?.mode !== 'dialogue') {
        req.continue()
        return
      }

      req.reply({
        statusCode: 500,
        headers: { 'content-type': 'application/json' },
        body: { error: 'Server misconfigured: missing API key' },
      })
    }).as('dialogueFailure')

    cy.contains('button', '▶ Start').click()
    cy.wait('@dialogueFailure')

    cy.contains('⚠️ Server misconfigured: missing API key').should('be.visible')
  })
})
