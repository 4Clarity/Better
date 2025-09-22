describe('User Management - Enhanced Status Controls', () => {
  beforeEach(() => {
    // Visit user management page
    cy.visit('/user-management');

    // Mock API responses for consistent testing
    cy.intercept('GET', '/api/user-management/users*', {
      fixture: 'users-list.json'
    }).as('getUsers');

    cy.intercept('PUT', '/api/user-management/users/*/status', {
      statusCode: 200,
      body: {
        message: 'User status updated successfully',
        user: {
          id: 'test-user-1',
          accountStatus: 'SUSPENDED',
          statusReason: 'Security violation'
        }
      }
    }).as('updateUserStatus');
  });

  describe('Status Change Dropdown', () => {
    it('should display status change button for active users', () => {
      cy.wait('@getUsers');

      // Find an active user card
      cy.get('[data-testid="user-card"]')
        .contains('ACTIVE')
        .parents('[data-testid="user-card"]')
        .within(() => {
          cy.get('[data-testid="status-change-button"]')
            .should('be.visible')
            .should('contain', 'Change Status');
        });
    });

    it('should show appropriate status options when dropdown is opened', () => {
      cy.wait('@getUsers');

      // Click status change button
      cy.get('[data-testid="status-change-button"]').first().click();

      // Verify dropdown appears
      cy.get('[data-testid="status-dropdown"]').should('be.visible');

      // Verify status options are present
      cy.get('[data-testid="status-option-SUSPENDED"]').should('be.visible');
      cy.get('[data-testid="status-option-DEACTIVATED"]').should('be.visible');
      cy.get('[data-testid="status-option-INACTIVE"]').should('be.visible');
    });

    it('should open status change modal when option is selected', () => {
      cy.wait('@getUsers');

      // Open dropdown and select suspend
      cy.get('[data-testid="status-change-button"]').first().click();
      cy.get('[data-testid="status-option-SUSPENDED"]').click();

      // Verify modal opens
      cy.get('[data-testid="status-change-modal"]').should('be.visible');
      cy.get('[data-testid="status-change-modal"]')
        .should('contain', 'Change User Status')
        .should('contain', 'SUSPENDED');
    });
  });

  describe('Status Change Modal', () => {
    beforeEach(() => {
      cy.wait('@getUsers');
      // Open the modal
      cy.get('[data-testid="status-change-button"]').first().click();
      cy.get('[data-testid="status-option-SUSPENDED"]').click();
    });

    it('should require reason selection', () => {
      // Try to confirm without selecting reason
      cy.get('[data-testid="confirm-change"]').should('be.disabled');

      // Select a reason
      cy.get('[data-testid="reason-select"]').click();
      cy.get('[role="option"]').contains('Security Violation').click();

      // Confirm button should now be enabled
      cy.get('[data-testid="confirm-change"]').should('not.be.disabled');
    });

    it('should show custom reason input when custom is selected', () => {
      // Select custom reason
      cy.get('[data-testid="reason-select"]').click();
      cy.get('[role="option"]').contains('Custom Reason').click();

      // Custom reason input should appear
      cy.get('[data-testid="custom-reason"]').should('be.visible');

      // Confirm should be disabled until custom reason is entered
      cy.get('[data-testid="confirm-change"]').should('be.disabled');

      // Enter custom reason
      cy.get('[data-testid="custom-reason"]').type('Custom security concern');

      // Confirm should now be enabled
      cy.get('[data-testid="confirm-change"]').should('not.be.disabled');
    });

    it('should show warning for destructive actions', () => {
      // Should show warning for suspend action
      cy.get('[data-testid="status-change-modal"]')
        .should('contain', 'Warning: This action will immediately restrict user access');
    });

    it('should complete status change workflow', () => {
      // Select reason and confirm
      cy.get('[data-testid="reason-select"]').click();
      cy.get('[role="option"]').contains('Security Violation').click();
      cy.get('[data-testid="confirm-change"]').click();

      // Verify API call was made
      cy.wait('@updateUserStatus').then((interception) => {
        expect(interception.request.body).to.include({
          accountStatus: 'SUSPENDED',
          reasonCode: 'security_violation'
        });
      });

      // Modal should close
      cy.get('[data-testid="status-change-modal"]').should('not.exist');
    });

    it('should cancel status change', () => {
      // Click cancel
      cy.get('[data-testid="cancel-change"]').click();

      // Modal should close without API call
      cy.get('[data-testid="status-change-modal"]').should('not.exist');
      cy.get('@updateUserStatus.all').should('have.length', 0);
    });
  });

  describe('Quick Actions', () => {
    it('should show approve button for pending users', () => {
      cy.wait('@getUsers');

      // Find a pending user card
      cy.get('[data-testid="user-card"]')
        .contains('PENDING')
        .parents('[data-testid="user-card"]')
        .within(() => {
          cy.get('[data-testid="quick-approve-button"]')
            .should('be.visible')
            .should('contain', 'Approve');
        });
    });

    it('should show reactivate button for suspended users', () => {
      cy.wait('@getUsers');

      // Find a suspended user card
      cy.get('[data-testid="user-card"]')
        .contains('SUSPENDED')
        .parents('[data-testid="user-card"]')
        .within(() => {
          cy.get('[data-testid="quick-reactivate-button"]')
            .should('be.visible')
            .should('contain', 'Reactivate');
        });
    });

    it('should perform quick approval', () => {
      cy.wait('@getUsers');

      // Mock the API for approval
      cy.intercept('PUT', '/api/user-management/users/*/status', {
        statusCode: 200,
        body: {
          message: 'User approved successfully',
          user: {
            id: 'test-user-pending',
            accountStatus: 'ACTIVE',
            statusReason: 'Approved by administrator'
          }
        }
      }).as('approveUser');

      // Click quick approve
      cy.get('[data-testid="quick-approve-button"]').first().click();

      // Verify API call
      cy.wait('@approveUser').then((interception) => {
        expect(interception.request.body).to.include({
          accountStatus: 'ACTIVE',
          reasonCode: 'quick_approval'
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      cy.wait('@getUsers');

      // Tab to status change button
      cy.get('[data-testid="status-change-button"]').first().focus();

      // Press Enter to open dropdown
      cy.get('[data-testid="status-change-button"]').first().type('{enter}');
      cy.get('[data-testid="status-dropdown"]').should('be.visible');

      // Press Escape to close
      cy.get('body').type('{esc}');
      cy.get('[data-testid="status-dropdown"]').should('not.exist');
    });

    it('should have proper ARIA labels', () => {
      cy.wait('@getUsers');

      cy.get('[data-testid="status-change-button"]').first()
        .should('have.attr', 'aria-label', 'Change user status')
        .should('have.attr', 'aria-haspopup', 'true');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      cy.wait('@getUsers');

      // Mock API error
      cy.intercept('PUT', '/api/user-management/users/*/status', {
        statusCode: 400,
        body: {
          error: 'Invalid status transition',
          message: 'Cannot transition from DEACTIVATED to ACTIVE'
        }
      }).as('statusError');

      // Attempt status change
      cy.get('[data-testid="status-change-button"]').first().click();
      cy.get('[data-testid="status-option-SUSPENDED"]').click();
      cy.get('[data-testid="reason-select"]').click();
      cy.get('[role="option"]').contains('Security Violation').click();
      cy.get('[data-testid="confirm-change"]').click();

      // Should show error message
      cy.wait('@statusError');
      cy.get('[role="alert"]')
        .should('be.visible')
        .should('contain', 'Invalid status transition');
    });
  });
});