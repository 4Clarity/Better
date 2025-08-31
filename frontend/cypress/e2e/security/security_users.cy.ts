/// <reference types="cypress" />

describe('Security: Users Page', () => {
  it('loads users list and basic UI', () => {
    cy.toggleAuthBypass(true)
    cy.visit('/security')
    cy.contains('User Management').should('be.visible')
    // Expect table/list of users to render
    cy.get('table, [role="table"], [data-testid*="user"]').should('exist')
  })
})

