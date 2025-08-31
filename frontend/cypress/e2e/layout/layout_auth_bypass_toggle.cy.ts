/// <reference types="cypress" />

describe('Layout: Auth Bypass toggle', () => {
  it('enables protected actions when ON', () => {
    cy.toggleAuthBypass(true)
    cy.visit('/transitions')
    cy.contains('Transitions').should('be.visible')
  })
})

