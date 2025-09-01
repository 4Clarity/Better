/// <reference types="cypress" />

describe('Security: Users Page', () => {
  it('loads users list and basic UI', () => {
    cy.toggleAuthBypass(true)
    cy.visit('/security')
    cy.contains('User Management').should('be.visible')
    // Expect grid of user cards to render
    cy.get('[data-testid="user-grid"]').should('exist')
  })
})
