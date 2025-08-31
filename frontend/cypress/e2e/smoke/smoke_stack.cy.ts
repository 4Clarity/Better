/// <reference types="cypress" />

describe('Smoke: Stack Health', () => {
  it('loads homepage and backend health', () => {
    cy.toggleAuthBypass(true)
    cy.visit('/')
    cy.contains('Transitions').should('be.visible')
    cy.request(Cypress.env('apiUrl') + '/health').its('status').should('eq', 200)
  })
})

