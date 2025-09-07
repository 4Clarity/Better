/// <reference types="cypress" />

// Rewrite: Focused, stable workflow using API setup + current testids and flows
describe('Transition Workflow (current)', () => {
  it('creates a transition via API, updates status, and adds a milestone in Project Hub', () => {
    cy.toggleAuthBypass(true)
    const start = new Date().toISOString().split('T')[0]
    const end = new Date(Date.now()+60*24*60*60*1000).toISOString().split('T')[0]

    // Create transition via API
    let transition: any
    cy.createTransitionAPI({ contractName: `WF Contract ${Date.now()}`, contractNumber: `WF-${Date.now()}`, startDate: start, endDate: end })
      .then((t:any) => { transition = t; expect(transition).to.have.property('id') })
      .then(() => {
        // Visit Project Hub and wait for data
        cy.intercept('GET', `/api/transitions/${transition.id}`).as('getTransition')
        cy.intercept('GET', `/api/transitions/${transition.id}/milestones*`).as('getMilestones')
        cy.visit(`/transitions/${transition.id}`)
        cy.wait(['@getTransition','@getMilestones'])

        // Update status (combobox approach proven in other spec)
        cy.get('[role="combobox"]').first().click()
        cy.contains('On Track').click()

        // Add milestone via dialog with testids
        const due = new Date(Date.now()+7*24*60*60*1000).toISOString().split('T')[0]
        cy.get('[data-testid="milestones-add-btn"]').should('be.visible').click()
        cy.get('[data-testid="milestone-title"]').should('be.visible').type('Kickoff WF')
        cy.get('[data-testid="milestone-date"]').type(due)
        cy.get('[data-testid="milestone-create"]').should('be.enabled').click()
        cy.contains('Kickoff WF').should('be.visible')

        // Assert controls visible for readiness
        cy.get('[data-testid="milestones-add-btn"]').should('be.visible')
        cy.get('[data-testid="tasks-add-btn"]').should('be.visible')
      })
  })
})
