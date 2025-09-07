/// <reference types="cypress" />

// Rewrite: Simple cross-page journey using API setup and current routes/selectors
describe('User Journey Validation (current)', () => {
  it('navigates Security, Project Hub, and Enhanced Detail with API-created transition', () => {
    cy.toggleAuthBypass(true)
    const start = new Date().toISOString().split('T')[0]
    const end = new Date(Date.now()+45*24*60*60*1000).toISOString().split('T')[0]
    let transition: any

    // Create minimal transition
    cy.createTransitionAPI({ contractName: `UJ Contract ${Date.now()}`, contractNumber: `UJ-${Date.now()}`, startDate: start, endDate: end })
      .then((t:any) => { transition = t; expect(transition).to.have.property('id') })
      .then(() => {
        // Security page reachable
        cy.visit('/security')
        cy.contains('User Management').should('be.visible')
        cy.get('[data-testid="user-grid"]').should('exist')

        // Project Hub loads for our transition
        cy.intercept('GET', `/api/transitions/${transition.id}`).as('getTransition')
        cy.visit(`/transitions/${transition.id}`)
        cy.wait('@getTransition')
        cy.contains('Milestones').should('be.visible')
        cy.get('[data-testid="milestones-add-btn"]').should('be.visible')

        // Enhanced Transition Detail loads
        cy.intercept('GET', `/api/enhanced-transitions/${transition.id}`).as('getEnhanced')
        cy.intercept('GET', `/api/transitions/${transition.id}/tasks*`).as('getTasks')
        cy.intercept('GET', `/api/transitions/${transition.id}/milestones*`).as('getMs')
        cy.visit(`/enhanced-transitions/${transition.id}`)
        cy.wait(['@getEnhanced','@getTasks','@getMs'])
        cy.contains('Tasks').should('be.visible')
        cy.get('[data-testid="tasks-add-btn"]').should('be.visible')
      })
  })
})
