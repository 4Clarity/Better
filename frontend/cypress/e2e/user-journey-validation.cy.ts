/// <reference types="cypress" />

describe.skip('User Journey Validation - Complete Flow', () => {
  beforeEach(() => {
    // Set up API interceptors
    cy.intercept('POST', '/api/transitions').as('createTransition')
    cy.intercept('GET', '/api/transitions/*').as('getTransition')
    cy.intercept('GET', '/api/enhanced-transitions/*').as('getEnhancedTransition')
    cy.intercept('GET', '/api/business-operations*').as('getBusinessOps')
    cy.intercept('GET', '/api/contracts*').as('getContracts')
    cy.intercept('PUT', '/api/transitions/*').as('updateTransition')
  })

  describe('Complete User Journey: Login → Create → Project Hub → Manage', () => {
    it('should complete the full user journey successfully', () => {
      const testTransition = {
        contractName: `E2E Test Contract ${Date.now()}`,
        contractNumber: `E2E-${Date.now()}`,
        startDate: '2024-03-01',
        endDate: '2024-12-31'
      }

      // ==========================================
      // STEP 1: USER AUTHENTICATION & DASHBOARD
      // ==========================================
      cy.loginAs('program_manager')
      cy.visit('/')
      
      // Verify dashboard loads correctly
      cy.get('body').should('be.visible')
      cy.contains('Dashboard', { timeout: 10000 }).should('be.visible')
      
      // Verify role-based access - PM should see New Transition button
      cy.get('button').contains('New Team Member Transition').should('be.visible')

      // ==========================================
      // STEP 2: TRANSITION CREATION WORKFLOW
      // ==========================================
      
      // Click to create new transition
      cy.get('button').contains('New Team Member Transition').click()
      
      // Verify dialog opens with correct form
      cy.get('[role="dialog"]', { timeout: 5000 }).should('be.visible')
      cy.contains('Create New Team Member Transition').should('be.visible')
      
      // Wait for any business operations to load in background
      cy.wait('@getBusinessOps', { timeout: 10000 })
      
      // Fill out the transition form completely
      cy.get('input').first().clear().type(testTransition.contractName)
      cy.get('input').eq(1).clear().type(testTransition.contractNumber)
      cy.get('input[type="date"]').first().clear().type(testTransition.startDate)
      cy.get('input[type="date"]').last().clear().type(testTransition.endDate)
      
      // Optional: Add key personnel and description
      cy.get('textarea, input').contains('key personnel').then(($el) => {
        if ($el.length) {
          cy.wrap($el).type('John Doe, Jane Smith')
        }
      })
      
      // Submit the form
      cy.get('button').contains('Create').click()
      
      // Wait for API call to complete
      cy.wait('@createTransition').then((interception) => {
        expect(interception.response?.statusCode).to.equal(201)
        
        // Store the created transition ID for later use
        const createdTransition = interception.response?.body
        expect(createdTransition).to.have.property('id')
        
        // ==========================================
        // STEP 3: VERIFY PROJECT HUB REDIRECTION
        // ==========================================
        
        // Check if redirected to transition detail page/project hub
        cy.url({ timeout: 10000 }).should('match', /\/transitions\/.+/)
        
        // OR check if redirected back to transitions list
        cy.url().then((url) => {
          if (url.includes('/transitions/')) {
            // Redirected to specific transition page (Project Hub)
            cy.contains(testTransition.contractName).should('be.visible')
            cy.contains('Project Hub', 'Overview', 'Details').should('exist')
          } else if (url.includes('/transitions')) {
            // Redirected to transitions list page
            cy.contains(testTransition.contractName).should('be.visible')
          }
        })
      })

      // ==========================================
      // STEP 4: TRANSITION MANAGEMENT & STATUS
      // ==========================================
      
      // Navigate to transitions page if not already there
      cy.visit('/transitions')
      
      // Verify new transition appears in the list
      cy.contains(testTransition.contractName, { timeout: 10000 }).should('be.visible')
      
      // Verify initial status
      cy.get('[data-testid="transition-status"], .badge, .status-indicator')
        .contains('NOT STARTED', 'Not Started')
        .should('be.visible')
      
      // Test transition editing
      cy.contains(testTransition.contractName)
        .parent()
        .within(() => {
          // Look for edit button
          cy.get('button').contains('Edit').click()
        })
      
      // Verify edit dialog opens
      cy.get('[role="dialog"]').should('be.visible')
      cy.contains('Edit Team Member Transition').should('be.visible')
      
      // Make a small change and save
      cy.get('select, dropdown').contains('Status').then(($el) => {
        if ($el.length) {
          cy.wrap($el).select('ON_TRACK')
        }
      })
      
      // Save changes
      cy.get('button').contains('Save').click()
      
      // Verify update was successful
      cy.wait('@updateTransition')
      
      // ==========================================
      // STEP 5: NAVIGATION & WORKFLOW COMPLETION
      // ==========================================
      
      // Test navigation between different transition types
      cy.contains('Enhanced Transitions').click()
      cy.contains('Team Member Transitions').click()
      
      // Verify our test transition is still visible
      cy.contains(testTransition.contractName).should('be.visible')
      
      // Test search functionality
      cy.get('input[placeholder*="Search"]').type(testTransition.contractName.split(' ')[0])
      cy.contains(testTransition.contractName).should('be.visible')
      
      // Clear search
      cy.get('input[placeholder*="Search"]').clear()
    })

    it('should handle transition creation failure gracefully', () => {
      // Mock API failure
      cy.intercept('POST', '/api/transitions', {
        statusCode: 400,
        body: { message: 'Contract number already exists' }
      }).as('createTransitionFail')

      cy.loginAs('program_manager')
      cy.visit('/')
      
      // Attempt to create transition
      cy.get('button').contains('New Team Member Transition').click()
      cy.get('input').first().type('Duplicate Contract')
      cy.get('input').eq(1).type('DUPLICATE-001')
      cy.get('input[type="date"]').first().type('2024-01-01')
      cy.get('input[type="date"]').last().type('2024-12-31')
      
      cy.get('button').contains('Create').click()
      
      // Verify error handling
      cy.wait('@createTransitionFail')
      cy.contains('Contract number already exists').should('be.visible')
      
      // Form should remain open for correction
      cy.get('[role="dialog"]').should('be.visible')
    })
  })

  describe('Project Hub Navigation Verification', () => {
    it('should verify Project Hub redirection works correctly', () => {
      // This test specifically validates FE-1.1.5 requirement
      cy.intercept('POST', '/api/transitions').as('createTransition')
      
      cy.loginAs('program_manager')
      cy.visit('/')
      
      // Create transition
      cy.get('button').contains('New Team Member Transition').click()
      cy.get('input').first().type('Project Hub Test')
      cy.get('input').eq(1).type(`PH-${Date.now()}`)
      cy.get('input[type="date"]').first().type('2024-01-01')
      cy.get('input[type="date"]').last().type('2024-12-31')
      cy.get('button').contains('Create').click()
      
      // Wait for creation and check redirect
      cy.wait('@createTransition').then((interception) => {
        const transitionId = interception.response?.body?.id
        
        // Should redirect to project hub URL
        cy.url().should('include', `/transitions/${transitionId}`)
        
        // OR if it redirects to list, verify the transition is visible
        cy.url().then((url) => {
          if (!url.includes(`/transitions/${transitionId}`)) {
            // If not redirected to specific page, should at least be on transitions page
            cy.url().should('include', '/transitions')
            cy.contains('Project Hub Test').should('be.visible')
          }
        })
      })
    })
  })

  describe('Multi-User Role Journey Testing', () => {
    it('should test different user roles and their capabilities', () => {
      const roles = ['program_manager', 'director']
      
      roles.forEach((role) => {
        cy.loginAs(role as any)
        cy.visit('/')
        
        // Verify role-appropriate access
        if (role === 'program_manager') {
          cy.get('button').contains('New Team Member Transition').should('be.visible')
        }
        
        // Test transitions page access
        cy.visit('/transitions')
        cy.get('body').should('be.visible')
        cy.contains('Transitions').should('be.visible')
      })
    })
  })
})
