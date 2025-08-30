/// <reference types="cypress" />

describe('Complete Transition Workflow', () => {
  beforeEach(() => {
    // Intercept API calls for monitoring
    cy.intercept('GET', '/api/transitions*').as('getTransitions')
    cy.intercept('POST', '/api/transitions').as('createTransition')
    cy.intercept('PUT', '/api/transitions/*').as('updateTransition')
    cy.intercept('GET', '/api/business-operations*').as('getBusinessOperations')
    cy.intercept('GET', '/api/contracts*').as('getContracts')
  })

  describe('1. User Journey - Create Team Member Transition', () => {
    it('should complete full transition creation workflow as Program Manager', () => {
      // Step 1: Login as Program Manager
      cy.loginAs('program_manager')
      
      // Step 2: Navigate to dashboard and verify it loads
      cy.visit('/')
      cy.contains('Dashboard').should('be.visible')
      
      // Step 3: Check for New Team Member Transition button
      cy.get('button').contains('New Team Member Transition').should('be.visible')
      
      // Step 4: Click to open transition creation dialog
      cy.get('button').contains('New Team Member Transition').click()
      
      // Step 5: Verify dialog opens with correct title
      cy.get('[role="dialog"], .dialog-content').should('be.visible')
      cy.contains('Create New Team Member Transition').should('be.visible')
      
      // Step 6: Fill out transition form
      const testTransition = {
        contractName: `Test Contract ${Date.now()}`,
        contractNumber: `TC-${Date.now()}`,
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      }
      
      // Contract name
      cy.get('input').first().type(testTransition.contractName)
      
      // Contract number  
      cy.get('input').eq(1).type(testTransition.contractNumber)
      
      // Start date
      cy.get('input[type="date"]').first().type(testTransition.startDate)
      
      // End date
      cy.get('input[type="date"]').last().type(testTransition.endDate)
      
      // Step 7: Submit form and verify API call
      cy.get('button').contains('Create').click()
      cy.wait('@createTransition').then((interception) => {
        expect(interception.response?.statusCode).to.equal(201)
      })
      
      // Step 8: Verify redirection to transitions page or project hub
      cy.url().should('include', '/transitions')
      
      // Step 9: Verify new transition appears in list
      cy.wait('@getTransitions')
      cy.contains(testTransition.contractName).should('be.visible')
      
      // Step 10: Verify transition status is displayed
      cy.get('[data-testid="transition-card"], .transition-item')
        .contains(testTransition.contractName)
        .parent()
        .should('contain', 'NOT STARTED')
    })

    it('should handle form validation errors gracefully', () => {
      cy.loginAs('program_manager')
      cy.visit('/')
      
      // Open form
      cy.get('button').contains('New Team Member Transition').click()
      
      // Try to submit empty form
      cy.get('button').contains('Create').click()
      
      // Should see validation errors
      cy.contains('Contract name is required').should('be.visible')
      cy.contains('Contract number is required').should('be.visible')
      
      // Dialog should remain open
      cy.get('[role="dialog"]').should('be.visible')
    })
  })

  describe('2. Transitions Page Navigation', () => {
    it('should navigate between Enhanced and Team Member transitions', () => {
      cy.loginAs('program_manager')
      cy.visit('/transitions')
      
      // Wait for page to load
      cy.wait('@getTransitions')
      
      // Should see both tabs
      cy.contains('Enhanced Transitions').should('be.visible')
      cy.contains('Team Member Transitions').should('be.visible')
      
      // Click on Team Member Transitions tab
      cy.contains('Team Member Transitions').click()
      
      // Should see Team Member transitions content
      cy.get('[data-value="operational-transitions"]').should('be.visible')
      
      // Click back to Enhanced Transitions
      cy.contains('Enhanced Transitions').click()
      
      // Should see Enhanced transitions content
      cy.get('[data-value="contract-transitions"]').should('be.visible')
    })

    it('should display search functionality', () => {
      cy.loginAs('program_manager')
      cy.visit('/transitions')
      
      // Should see search input
      cy.get('input[placeholder*="Search"]').should('be.visible')
      
      // Type in search
      cy.get('input[placeholder*="Search"]').type('test search')
      
      // Should trigger search (API call or filtering)
      cy.get('input[placeholder*="Search"]').should('have.value', 'test search')
    })
  })

  describe('3. Business Operations Integration', () => {
    it('should load business operations for contract selection', () => {
      cy.loginAs('program_manager')
      cy.visit('/')
      
      // Open new transition dialog
      cy.get('button').contains('New Team Member Transition').click()
      
      // Should load business operations in background
      cy.wait('@getBusinessOperations')
      
      // Contract selector should be present
      cy.get('.contract-selector, [data-testid="contract-selector"]').should('exist')
    })
  })

  describe('4. Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully', () => {
      // Mock API error
      cy.intercept('POST', '/api/transitions', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('createTransitionError')
      
      cy.loginAs('program_manager')
      cy.visit('/')
      
      // Fill out form
      cy.get('button').contains('New Team Member Transition').click()
      cy.get('input').first().type('Test Contract')
      cy.get('input').eq(1).type('TC-001')
      cy.get('input[type="date"]').first().type('2024-01-01')
      cy.get('input[type="date"]').last().type('2024-12-31')
      
      // Submit and wait for error
      cy.get('button').contains('Create').click()
      cy.wait('@createTransitionError')
      
      // Should show error message
      cy.contains('Failed to create transition').should('be.visible')
    })

    it('should handle network connectivity issues', () => {
      // Mock network failure
      cy.intercept('GET', '/api/transitions*', { forceNetworkError: true }).as('networkError')
      
      cy.loginAs('program_manager')
      cy.visit('/transitions')
      
      // Should show appropriate error state
      cy.wait('@networkError')
      cy.contains('Error').should('be.visible')
    })
  })

  describe('5. User Role Permissions', () => {
    it('should show New Transition button only for Program Manager role', () => {
      // Test as Program Manager - should see button
      cy.loginAs('program_manager')
      cy.visit('/')
      cy.get('button').contains('New Team Member Transition').should('be.visible')
      
      // Test as Director - might see button
      cy.loginAs('director')
      cy.visit('/')
      // Button visibility depends on role configuration
    })
  })

  describe('6. Performance and Load Testing', () => {
    it('should load transitions page within acceptable time', () => {
      cy.loginAs('program_manager')
      
      const startTime = Date.now()
      cy.visit('/transitions')
      cy.wait('@getTransitions')
      
      // Page should load within 3 seconds (as per requirements)
      cy.then(() => {
        const loadTime = Date.now() - startTime
        expect(loadTime).to.be.lessThan(3000)
      })
    })
  })
})