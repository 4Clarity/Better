/// <reference types="cypress" />

describe('Project Hub: Milestones CRUD', () => {
  let transition: any
  const today = new Date()
  const inSeven = new Date(Date.now() + 7*24*60*60*1000)

  before(() => {
    cy.toggleAuthBypass(true)
    const start = today.toISOString().split('T')[0]
    const end = new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0]
    cy.createTransitionAPI({ contractName: `E2E Hub ${Date.now()}`, contractNumber: `E2E-H-${Date.now()}`, startDate: start, endDate: end }).then((t:any)=> transition = t)
  })

  it('creates, edits, and deletes a milestone', () => {
    cy.intercept('GET', `/api/transitions/${transition.id}`).as('getTransition')
    cy.intercept('GET', `/api/transitions/${transition.id}/milestones*`).as('getMilestones')
    cy.intercept('POST', `/api/transitions/${transition.id}/milestones`).as('postMilestone')
    cy.visit(`/transitions/${transition.id}`)
    cy.wait(['@getTransition','@getMilestones'])
    cy.contains('Milestones').should('be.visible')
    cy.get('[data-testid="milestones-add-btn"]').should('be.visible').click()
    cy.get('[data-testid="milestone-title"]').should('be.visible').type('Kickoff Meeting')
    cy.get('[data-testid="milestone-date"]').type(inSeven.toISOString().split('T')[0])
    cy.get('[data-testid="milestone-desc"]').type('Initial transition kickoff')
    cy.get('[data-testid="milestone-create"]').should('be.enabled').click()
    cy.wait('@postMilestone')
    cy.wait('@getMilestones')
    cy.contains('Kickoff Meeting').then($el => {
      if ($el.length === 0) {
        cy.intercept('GET', `/api/transitions/${transition.id}/milestones*`).as('getMilestonesRetry')
        cy.reload()
        cy.wait('@getMilestonesRetry')
      }
    })
    cy.contains('Kickoff Meeting').should('be.visible')

    // Edit inline
    cy.contains('Kickoff Meeting').parents('[class*=p-3]').within(() => {
      cy.get('[data-testid="edit-milestone-btn"]').click()
    })
    cy.get('[data-testid="milestone-edit-title"]').clear().type('Kickoff Meeting - Updated')
    cy.get('[data-testid="milestone-save-edit"]').click()
    cy.contains('Kickoff Meeting - Updated').should('be.visible')

    // Delete
    cy.contains('Kickoff Meeting - Updated').parents('[class*=p-3]').within(() => {
      cy.get('[data-testid="delete-milestone-btn"]').click()
    })
    cy.on('window:confirm', () => true)
    cy.contains('Kickoff Meeting - Updated').should('not.exist')
  })
})
