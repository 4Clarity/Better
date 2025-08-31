/// <reference types="cypress" />

describe('Enhanced Detail: Tasks CRUD + Subtasks + Milestone', () => {
  let transition: any
  let milestone: any
  const today = new Date()
  const due = new Date(Date.now() + 5*24*60*60*1000)

  before(() => {
    cy.toggleAuthBypass(true)
    const start = today.toISOString().split('T')[0]
    const end = new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0]
    cy.createTransitionAPI({ contractName: `E2E Enh ${Date.now()}`, contractNumber: `E2E-ED-${Date.now()}`, startDate: start, endDate: end }).then((t:any)=> {
      transition = t
      return cy.createMilestoneAPI(t.id, { title: 'Phase 1', dueDate: new Date(Date.now()+10*24*60*60*1000).toISOString(), priority: 'MEDIUM' })
    }).then((m:any)=> milestone = m)
  })

  it('creates a task with milestone, adds a subtask, edits and deletes', () => {
    cy.visit(`/enhanced-transitions/${transition.id}`)
    cy.contains('Tasks').should('be.visible')
    cy.contains('Add Task').click()
    cy.get('input[type="text"]').filter(':visible').first().type('Prepare Documentation')
    cy.get('input[type="date"]').filter(':visible').first().type(due.toISOString().split('T')[0])
    cy.get('select').filter(':visible').first().select('Medium')
    // Milestone dropdown exists later in the form; pick Phase 1
    cy.get('select').filter(':visible').eq(1).select('Phase 1')
    cy.contains('Create Task').click()
    cy.contains('Prepare Documentation').should('be.visible')

    // Add subtask
    cy.contains('Prepare Documentation').parents('[class*=p-3]').within(() => {
      cy.contains('Add Subtask').click()
    })
    cy.get('input[type="text"]').filter(':visible').first().type('Gather Requirements')
    cy.get('input[type="date"]').filter(':visible').first().type(due.toISOString().split('T')[0])
    cy.contains('Create Task').click()
    cy.contains('Gather Requirements').should('be.visible')

    // Edit task
    cy.contains('Prepare Documentation').parents('[class*=p-3]').within(() => {
      cy.contains('Edit').click()
    })
    cy.get('input[type="text"]').filter(':visible').first().clear().type('Prepare Docs v2')
    cy.get('select').filter(':visible').first().select('High')
    cy.get('select').filter(':visible').eq(1).select('In Progress')
    cy.get('select').filter(':visible').eq(2).select('Phase 1')
    cy.contains('Save').click()
    cy.contains('Prepare Docs v2').should('be.visible')

    // Delete
    cy.contains('Prepare Docs v2').parents('[class*=p-3]').within(() => {
      cy.contains('Delete').click()
    })
    cy.on('window:confirm', () => true)
    cy.contains('Prepare Docs v2').should('not.exist')
  })
})

