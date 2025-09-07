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
      expect(transition).to.have.property('id')
      return cy.createMilestoneAPI(t.id, { title: 'Phase 1', dueDate: new Date(Date.now()+10*24*60*60*1000).toISOString(), priority: 'MEDIUM' })
    }).then((m:any)=> { milestone = m; expect(milestone).to.have.property('id') })
  })

  it('creates a task with milestone, adds a subtask, edits and deletes', () => {
    cy.intercept('GET', `/api/enhanced-transitions/${transition.id}`).as('getEnhanced')
    cy.intercept('GET', `/api/transitions/${transition.id}/milestones*`).as('getMs')
    cy.intercept('GET', `/api/transitions/${transition.id}/tasks*`).as('getTasks')
    cy.visit(`/enhanced-transitions/${transition.id}`)
    cy.wait(['@getEnhanced','@getMs','@getTasks'])
    cy.contains('Tasks').should('be.visible')

    // Create milestone via UI on Enhanced Detail for determinism
    const due = new Date(Date.now()+10*24*60*60*1000).toISOString().split('T')[0]
    cy.get('[data-testid=\"milestones-add-btn\"]').should('be.visible').click()
    cy.get('[data-testid=\"milestone-title\"]').should('be.visible').type('Phase 1')
    cy.get('[data-testid=\"milestone-date\"]').type(due)
    cy.get('[data-testid=\"milestone-create\"]').should('be.enabled').click()
    cy.contains('Phase 1').should('be.visible')
    cy.get('[data-testid="tasks-add-btn"]').should('be.visible').click()
    cy.get('[data-testid="task-title"]').type('Prepare Documentation')
    cy.get('[data-testid="task-date"]').type(due.toISOString().split('T')[0])
    cy.get('[data-testid="task-priority"]').select('MEDIUM')
    cy.get('[data-testid="task-milestone"]').select('Phase 1')
    cy.get('[data-testid="task-create"]').click()
    cy.contains('Prepare Documentation').should('be.visible')

    // Add subtask
    cy.contains('Prepare Documentation').parents('[class*=p-3]').within(() => {
      cy.get('[data-testid="add-subtask-btn"]').click()
    })
    cy.get('[data-testid="task-title"]').type('Gather Requirements')
    cy.get('[data-testid="task-date"]').type(due.toISOString().split('T')[0])
    cy.get('[data-testid="task-create"]').click()
    cy.contains('Gather Requirements').should('be.visible')

    // Edit task
    cy.contains('Prepare Documentation').parents('[class*=p-3]').within(() => {
      cy.get('[data-testid="edit-task-btn"]').click()
    })
    cy.get('[data-testid="edit-task-title"]').clear().type('Prepare Docs v2')
    cy.get('[data-testid="edit-task-priority"]').select('HIGH')
    cy.get('[data-testid="edit-task-status"]').select('IN_PROGRESS')
    cy.get('[data-testid="edit-task-milestone"]').select('Phase 1')
    cy.get('[data-testid="save-task-btn"]').click()
    cy.contains('Prepare Docs v2').should('be.visible')

    // Delete
    cy.contains('Prepare Docs v2').parents('[class*=p-3]').within(() => {
      cy.get('[data-testid="delete-task-btn"]').click()
    })
    cy.on('window:confirm', () => true)
    cy.contains('Prepare Docs v2').should('not.exist')
  })
})
