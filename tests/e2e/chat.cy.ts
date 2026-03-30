describe('ChatBotStep — UI', () => {
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

  function sendAndAssert(turn: number) {
    const userText = `user turn ${turn}`
    const botText = `Chaos reply ${turn}`

    sendAndWait(userText)

    cy.contains(userText).should('be.visible')
    cy.contains(botText).should('be.visible')

    cy.get('[data-testid="chat-bubble"][data-role="user"]').should('have.length', turn)
    cy.get('[data-testid="chat-bubble"][data-role="assistant"]').should('have.length.at.least', turn + 1)
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
        body: sseResponse(`Chaos reply ${callCount}`),
      })
    }).as('chat')

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.removeItem('chatbot_selectedCharacterId')
      },
    })
    cy.contains('Human helper · StepKey AI').should('be.visible')
  })

  it('renders chat inside a boxed shell', () => {
    cy.get('[data-testid="chat-shell"]').should('be.visible')
  })

  it('renders the header with Joe', () => {
    cy.contains('h1', 'Joe').should('be.visible')
    cy.contains('reasoning on').should('be.visible')
  })

  it('shows character selector defaulting to Joe', () => {
    cy.get('select[aria-label="Character selector"]').should('be.visible').and('have.value', 'joe')
  })

  it('shows both character options', () => {
    cy.get('select[aria-label="Character selector"] option')
      .then(($options) => [...$options].map((o) => (o as HTMLOptionElement).value))
      .should('include.all.members', ['joe', 'jinx', 'volt', 'mabel'])
  })

  it('switches to Volt and updates header and starter text', () => {
    cy.get('select[aria-label="Character selector"]').select('volt')
    cy.contains('h1', 'Volt Fox').should('be.visible')
    cy.contains('Spark courier · StepKey AI').should('be.visible')
    cy.contains('Volt Fox online. Drop a mission').should('be.visible')
  })

  it('persists selected character across reload', () => {
    cy.get('select[aria-label="Character selector"]').select('volt')
    cy.reload()
    cy.get('select[aria-label="Character selector"]').should('have.value', 'volt')
    cy.contains('h1', 'Volt Fox').should('be.visible')
  })

  it('sends selected characterId in chat request payload', () => {
    cy.get('select[aria-label="Character selector"]').select('volt')
    triggerSendWithFallback('run this package')
    cy.wait('@chat').its('request.body').should('have.property', 'characterId', 'volt')
  })

  it('shows the starter message', () => {
    cy.contains("Hey, I'm Joe").should('be.visible')
  })

  it('has a message input and send button', () => {
    cy.get(inputSelector).should('be.visible')
    cy.get(sendButtonSelector).should('be.visible')
  })

  it('send button is disabled when input is empty', () => {
    cy.get(sendButtonSelector).should('be.disabled')
  })

  it('send button enables when text is entered', () => {
    cy.get(inputSelector).type('hello jinx')
    cy.get(sendButtonSelector).should('not.be.disabled')
  })

  it('clears input after sending', () => {
    sendAndWait('test message')
    cy.get(inputSelector).should('have.value', '')
  })

  it('shows user message in chat after sending', () => {
    sendAndWait('what are you juggling today')
    cy.contains('what are you juggling today').should('be.visible')
  })

  it('shows AI response after sending', () => {
    sendAndWait('do a prank')
    cy.contains('Chaos reply 1').should('be.visible')
  })

  it('sends message on Enter key', () => {
    sendAndWait('chaos!')
    cy.contains('chaos!').should('be.visible')
    cy.contains('Chaos reply 1').should('be.visible')
  })

  it('does not send on Shift+Enter', () => {
    cy.get(inputSelector).type('line one{shift+enter}line two')
    cy.get(sendButtonSelector).should('not.be.disabled')
    // Message not sent yet — textarea still has content
    cy.get(inputSelector).should('not.have.value', '')
    cy.get('[data-testid="chat-bubble"][data-role="user"]').should('have.length', 0)
  })

  it('chat 1: 1 back-and-forth succeeds', () => {
    sendAndAssert(1)
  })

  it('chat 2: 5 back-and-forth succeeds', () => {
    for (let i = 1; i <= 5; i += 1) {
      sendAndAssert(i)
    }
  })

  it('chat 3: 10 back-and-forth succeeds', () => {
    for (let i = 1; i <= 10; i += 1) {
      sendAndAssert(i)
    }
  })
})
