describe('ChatBotStep — Thought Window UI', () => {
  const thoughtTab = '[data-testid="tab-thought"]'
  const chatTab = '[data-testid="tab-chat"]'
  const thoughtWindow = '[data-testid="thought-window"]'

  beforeEach(() => {
    cy.visit('/')
    cy.get('[data-testid="chat-shell"]').should('be.visible')
    // ThoughtChatWindow only renders when the Thought tab is active
    cy.get(thoughtTab).click()
  })

  it('renders thought window when Thought tab is clicked', () => {
    cy.get(thoughtWindow).should('exist')
    cy.contains('Internal monologue').should('be.visible')
  })

  it('displays thought window header with character avatar', () => {
    cy.get(thoughtWindow).within(() => {
      cy.get('header span').first().should('not.be.empty')
    })
  })

  it('shows Start button when not thinking', () => {
    cy.get(thoughtWindow).within(() => {
      cy.contains('▶ Start').should('be.visible')
    })
  })

  it('shows empty state message before thoughts start', () => {
    cy.contains('Click "▶ Start" to generate autonomous thoughts').should('be.visible')
  })

  it('enables Start button click to initiate thought chain', () => {
    cy.get(thoughtWindow).within(() => {
      cy.contains('▶ Start').click()
      cy.contains('⏹ Stop', { timeout: 2000 }).should('be.visible')
    })
  })

  it('displays Stop button while thinking', () => {
    cy.get(thoughtWindow).within(() => {
      cy.contains('▶ Start').click()
      cy.contains('⏹ Stop').should('be.visible')
    })
  })

  it('stops thought chain when Stop button clicked', () => {
    cy.get(thoughtWindow).within(() => {
      cy.contains('▶ Start').click()
      cy.contains('⏹ Stop', { timeout: 2000 }).click()
      cy.contains('▶ Start', { timeout: 2000 }).should('be.visible')
    })
  })

  it('shows progress counter during thought generation', () => {
    cy.get(thoughtWindow).within(() => {
      cy.contains('▶ Start').click()
    })
    cy.get('[data-testid="thought-progress"]', { timeout: 3000 }).should('be.visible')
  })

  it('displays a live thinking placeholder while generating thoughts', () => {
    cy.get(thoughtWindow).within(() => {
      cy.contains('▶ Start').click()
    })
    cy.get(thoughtWindow).contains('Thinking...', { timeout: 5000 }).should('be.visible')
  })

  it('Thought tab pulsing indicator visible while thinking', () => {
    cy.get(thoughtWindow).within(() => {
      cy.contains('▶ Start').click()
    })
    cy.get(chatTab).click()
    cy.get(thoughtTab).find('[class*="animate-pulse"]').should('exist')
  })
})
