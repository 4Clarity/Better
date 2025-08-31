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
    cy.visit(`/transitions/${transition.id}/tasks-milestones`)
    cy.contains('Tasks & Milestones Planning').should('be.visible')
    cy.contains('Unassigned Tasks').parent().within(()=>{
      cy.contains('Add Task').click()
    })
    cy.get('input').filter(':visible').first().type('Root A')
    cy.get('input[type="date"]').filter(':visible').first().type(due)
    cy.contains('Create Task').click()
    cy.contains('Root A').should('be.visible')

    // Add another root
    cy.contains('Unassigned Tasks').parent().within(()=>{
      cy.contains('Add Task').click()
    })
    cy.get('input').filter(':visible').first().type('Root B')
    cy.get('input[type="date"]').filter(':visible').first().type(due)
    cy.contains('Create Task').click()
    cy.contains('Root B').should('be.visible')

    // Indent Root B under Root A (becomes subtask)
    cy.contains('Root B').parents('[class*=border]').first().within(()=>{
      cy.contains('Indent').click()
    })
    // Move subtask down/up operations
    cy.contains('Root B').parents('[class*=border]').first().within(()=>{
      cy.contains('Up').should('be.visible')
    })

    // Outdent back to root
    cy.contains('Root B').parents('[class*=border]').first().within(()=>{
      cy.contains('Outdent').click()
    })
    cy.contains('Root B').should('be.visible')
  })
})

