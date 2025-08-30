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