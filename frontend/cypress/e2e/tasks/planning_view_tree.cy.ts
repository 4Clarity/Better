/// <reference types="cypress" />

describe('Planning View: Task Tree operations', () => {
  let transition: any
  const start = new Date().toISOString().split('T')[0]
  const end = new Date(Date.now()+60*24*60*60*1000).toISOString().split('T')[0]
  const due = new Date(Date.now()+5*24*60*60*1000).toISOString().split('T')[0]

  before(() => {
    cy.toggleAuthBypass(true)
    cy.createTransitionAPI({ contractName: `E2E Plan ${Date.now()}`, contractNumber: `E2E-PLAN-${Date.now()}`, startDate: start, endDate: end }).then((t:any)=> transition = t)
  })

  it('adds tasks and reorders/indents/outdents', () => {
    cy.intercept('GET', `/api/transitions/${transition.id}/tasks/tree`).as('getTree')
    cy.visit(`/transitions/${transition.id}/tasks-milestones`)
    cy.wait('@getTree')
    cy.contains('Tasks & Milestones Planning').should('be.visible')
    cy.get('[data-testid="planning-add-root-task-btn"]').should('be.visible')
    cy.intercept('GET', `/api/transitions/${transition.id}/tasks/tree`).as('getTree2')
    cy.contains('Unassigned Tasks').parent().within(()=>{
      cy.get('[data-testid="planning-add-root-task-btn"]').click()
    })
    cy.get('[data-testid="task-title"]').type('Root A')
    cy.get('[data-testid="task-date"]').type(due)
    cy.get('[data-testid="task-create"]').click()
    cy.wait('@getTree2')
    cy.contains('Root A').then($el => {
      if ($el.length === 0) {
        cy.intercept('GET', `/api/transitions/${transition.id}/tasks/tree`).as('getTreeRetryA')
        cy.reload()
        cy.wait('@getTreeRetryA')
      }
    })
    cy.contains('Root A').should('be.visible')

    // Add another root
    cy.intercept('GET', `/api/transitions/${transition.id}/tasks/tree`).as('getTree3')
    cy.contains('Unassigned Tasks').parent().within(()=>{
      cy.get('[data-testid="planning-add-root-task-btn"]').click()
    })
    cy.get('[data-testid="task-title"]').type('Root B')
    cy.get('[data-testid="task-date"]').type(due)
    cy.get('[data-testid="task-create"]').click()
    cy.wait('@getTree3')
    cy.contains('Root B').then($el => {
      if ($el.length === 0) {
        cy.intercept('GET', `/api/transitions/${transition.id}/tasks/tree`).as('getTreeRetryB')
        cy.reload()
        cy.wait('@getTreeRetryB')
      }
    })
    cy.contains('Root B').should('be.visible')

    // Indent Root B under Root A (becomes subtask)
    cy.intercept('GET', `/api/transitions/${transition.id}/tasks/tree`).as('getTree4')
    cy.contains('Root B').parents('[class*=border]').first().within(()=>{
      cy.get('[data-testid="indent-btn"]').click()
    })
    cy.wait('@getTree4')
    // Move subtask down/up operations
    cy.contains('Root B').parents('[class*=border]').first().within(()=>{
      cy.get('[data-testid="up-btn"]').should('be.visible')
    })

    // Outdent back to root
    cy.intercept('GET', `/api/transitions/${transition.id}/tasks/tree`).as('getTree5')
    cy.contains('Root B').parents('[class*=border]').first().within(()=>{
      cy.get('[data-testid="outdent-btn"]').click()
    })
    cy.wait('@getTree5')
    cy.contains('Root B').should('be.visible')
  })
})
