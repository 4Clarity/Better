// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

/// <reference types="cypress" />

// Custom commands for TIP application testing

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to simulate login as different user roles
       * @example cy.loginAs('program_manager')
       */
      loginAs(role: 'program_manager' | 'director' | 'admin' | 'security_officer'): Chainable<Element>
      toggleAuthBypass(enabled: boolean): Chainable<Element>
      
      /**
       * Custom command to create a test transition
       * @example cy.createTransition({ contractName: 'Test Contract', contractNumber: 'TC-001' })
       */
      createTransition(transitionData: {
        contractName: string
        contractNumber: string
        startDate?: string
        endDate?: string
      }): Chainable<Element>

      // API helpers
      apiRequest<T = any>(method: string, path: string, body?: any): Chainable<T>
      createTransitionAPI(data: { contractName: string; contractNumber: string; startDate: string; endDate: string }): Chainable<{ id: string }>
      createMilestoneAPI(transitionId: string, data: { title: string; dueDate: string; priority?: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'; description?: string }): Chainable<{ id: string }>
      createTaskAPI(transitionId: string, data: { title: string; dueDate: string; priority?: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'; description?: string; milestoneId?: string; parentTaskId?: string }): Chainable<{ id: string }>
      deleteMilestoneAPI(transitionId: string, milestoneId: string): Chainable<void>
      deleteTaskAPI(transitionId: string, taskId: string): Chainable<void>
      
      /**
       * Custom command to wait for API call to complete
       * @example cy.waitForApiCall('POST', '/api/transitions')
       */
      waitForApiCall(method: string, url: string): Chainable<Element>
    }
  }
}

// Mock login command (since we don't have full auth setup in testing)
Cypress.Commands.add('loginAs', (role: string) => {
  cy.window().then((win) => {
    // Mock user session in localStorage
    win.localStorage.setItem('user', JSON.stringify({
      id: 'test-user-id',
      role: role,
      name: `Test ${role}`,
      email: `${role}@example.com`
    }))
  })
  cy.visit('/')
})

// Toggle Auth Bypass stored in localStorage (consumed by backend guards)
Cypress.Commands.add('toggleAuthBypass', (enabled: boolean) => {
  cy.window().then((win) => {
    win.localStorage.setItem('authBypass', enabled ? 'true' : 'false')
  })
})

// Create transition helper command
Cypress.Commands.add('createTransition', (transitionData) => {
  const defaultData = {
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    ...transitionData
  }
  
  cy.get('[data-testid="new-transition-button"], button:contains("New Team Member Transition")')
    .should('be.visible')
    .click()
  
  cy.get('[data-testid="transition-form"], form').should('be.visible')
  
  cy.get('input[name="contractName"], #contractName').type(defaultData.contractName)
  cy.get('input[name="contractNumber"], #contractNumber').type(defaultData.contractNumber)
  cy.get('input[name="startDate"], #startDate').type(defaultData.startDate)
  cy.get('input[name="endDate"], #endDate').type(defaultData.endDate)
  
  cy.get('button[type="submit"], button:contains("Create")').click()
})

// API call waiting helper
Cypress.Commands.add('waitForApiCall', (method: string, url: string) => {
  cy.intercept(method, url).as('apiCall')
  cy.wait('@apiCall')
})

// Generic API helper using configured apiUrl
Cypress.Commands.add('apiRequest', (method: string, path: string, body?: any) => {
  const apiUrl = Cypress.env('apiUrl') as string
  return cy.request({
    method: method as any,
    url: `${apiUrl}${path}`,
    headers: { 'x-user-role': 'program_manager', 'x-auth-bypass': 'true' },
    failOnStatusCode: false,
    body,
  }).then((resp) => {
    if (resp.status >= 200 && resp.status < 300) return resp.body
    throw new Error(`API ${method} ${path} failed: ${resp.status} ${JSON.stringify(resp.body)}`)
  })
})

Cypress.Commands.add('createTransitionAPI', (data) => {
  return cy.apiRequest('POST', '/transitions', data)
})

Cypress.Commands.add('createMilestoneAPI', (transitionId, data) => {
  return cy.apiRequest('POST', `/transitions/${transitionId}/milestones`, data)
})

Cypress.Commands.add('createTaskAPI', (transitionId, data) => {
  return cy.apiRequest('POST', `/transitions/${transitionId}/tasks`, data)
})

Cypress.Commands.add('deleteMilestoneAPI', (transitionId, milestoneId) => {
  return cy.apiRequest('DELETE', `/transitions/${transitionId}/milestones/${milestoneId}`)
})

Cypress.Commands.add('deleteTaskAPI', (transitionId, taskId) => {
  return cy.apiRequest('DELETE', `/transitions/${transitionId}/tasks/${taskId}`)
})
