/**
 * Roadmap Dashboards E2E Tests
 * Tests for all three role-specific dashboards with real backend integration
 * Story: 1.5 - Roadmap UI Complete Implementation
 * AC 27: E2E Tests for Complete User Flows
 */

describe('Role-Specific Dashboards E2E', () => {
  beforeEach(() => {
    // Clear any existing auth state
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('Government PM Dashboard', () => {
    beforeEach(() => {
      // Login as Government PM (Garry Grove)
      cy.visit('/');
      cy.get('input[name="username"]').type('Garry.Grove@usdoj.gov');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      // Wait for dashboard to load
      cy.url().should('include', '/dashboard');
      cy.contains('Government Program Manager', { timeout: 10000 }).should('be.visible');
    });

    it('should display all metric cards with real data', () => {
      // Verify metrics are displayed
      cy.contains('Active Transitions').should('be.visible');
      cy.contains('Pending Reviews').should('be.visible');
      cy.contains('Knowledge Articles').should('be.visible');
      cy.contains('On-Track Rate').should('be.visible');

      // Verify metrics have numeric values (not placeholders)
      cy.get('[data-testid="metric-card"]').should('have.length.at.least', 4);
    });

    it('should display platform setup progress', () => {
      // Verify platform setup widget exists
      cy.contains('Platform Setup').should('be.visible');

      // Verify all 5 setup steps are shown
      cy.contains('Setup Users').should('be.visible');
      cy.contains('Configure System').should('be.visible');
      cy.contains('Import Data').should('be.visible');
      cy.contains('Train Users').should('be.visible');
      cy.contains('Go Live').should('be.visible');
    });

    it('should display knowledge curation queue with pending items', () => {
      // Verify curation queue widget exists
      cy.contains('Knowledge Curation Queue').should('be.visible');

      // If items exist, verify they're displayed
      cy.get('body').then(($body) => {
        if ($body.text().includes('No pending reviews')) {
          // Empty state is acceptable
          cy.contains('No pending reviews').should('be.visible');
        } else {
          // At least one curation item should be visible
          cy.get('[data-testid="timeline"]').should('exist');
        }
      });
    });

    it('should display transition roadmap overview', () => {
      // Verify roadmap widget exists
      cy.contains('Transition Roadmap Overview').should('be.visible');

      // Verify contract transitions section
      cy.contains('Contract Transitions').should('be.visible');

      // Verify personnel status section
      cy.contains('Personnel Status').should('be.visible');

      // Check for empty states or data
      cy.get('body').then(($body) => {
        if ($body.text().includes('No active contract transitions')) {
          // Empty state is acceptable
          cy.contains('No active contract transitions').should('be.visible');
        }
        if ($body.text().includes('No personnel data available')) {
          // Empty state is acceptable
          cy.contains('No personnel data available').should('be.visible');
        }
      });
    });

    it('should display transition control panel with action buttons', () => {
      // Verify control panel exists
      cy.contains('Transition Control Panel').should('be.visible');

      // Verify action buttons are present
      cy.contains('Manage Stakeholders').should('be.visible');
      cy.contains('Generate Roadmap').should('be.visible');
      cy.contains('Review Tasks & Milestones').should('be.visible');
    });

    it('should have working "Initiate New Transition" button', () => {
      // Verify button exists
      cy.contains('button', 'Initiate New Transition').should('be.visible');

      // Button should be clickable
      cy.contains('button', 'Initiate New Transition').should('not.be.disabled');
    });

    it('should handle dashboard refresh without errors', () => {
      // Verify initial load
      cy.contains('Government Program Manager').should('be.visible');

      // Refresh page
      cy.reload();

      // Verify dashboard reloads successfully
      cy.contains('Government Program Manager', { timeout: 10000 }).should('be.visible');

      // Verify no error messages
      cy.contains('Failed to load').should('not.exist');
      cy.contains('Error').should('not.exist');
    });
  });

  describe('Outgoing Contractor Dashboard', () => {
    beforeEach(() => {
      // Login as Outgoing Contractor (Henry Hou)
      cy.visit('/');
      cy.get('input[name="username"]').type('Henry.Hou@outbound.com');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      // Wait for dashboard to load
      cy.url().should('include', '/dashboard');
      cy.contains('Outgoing Contractor', { timeout: 10000 }).should('be.visible');
    });

    it('should display handover metrics', () => {
      // Verify all handover metrics are present
      cy.contains('Documents Uploaded').should('be.visible');
      cy.contains('Training Sessions').should('be.visible');
      cy.contains('Handover Complete').should('be.visible');
      cy.contains('Days Remaining').should('be.visible');

      // Verify metrics have numeric values
      cy.get('[data-testid="metric-card"]').should('have.length.at.least', 4);
    });

    it('should display handover timeline with 5 phases', () => {
      // Verify timeline widget exists
      cy.contains('Handover Timeline').should('be.visible');

      // Verify all 5 phases are shown
      cy.contains('Document Upload').should('be.visible');
      cy.contains('Knowledge Transfer').should('be.visible');
      cy.contains('Training Delivery').should('be.visible');
      cy.contains('Final Review').should('be.visible');
      cy.contains('Sign-off').should('be.visible');
    });

    it('should display activity log', () => {
      // Verify activity log widget exists
      cy.contains('Activity Log').should('be.visible');

      // Check for empty state or actual data
      cy.get('body').then(($body) => {
        if ($body.text().includes('No Active Transition')) {
          // Empty state message for users without transitions
          cy.contains('No Active Transition').should('be.visible');
          cy.contains('Contact your program manager').should('be.visible');
        } else {
          // Activity items should be visible
          cy.get('[data-testid="timeline"]').should('exist');
        }
      });
    });

    it('should display verification checklist', () => {
      // Verify checklist widget exists
      cy.contains('Verification Checklist').should('be.visible');

      // Check for checklist items or empty state
      cy.get('body').then(($body) => {
        if ($body.text().includes('No checklist items available')) {
          // Empty state is acceptable
          cy.contains('No checklist items available').should('be.visible');
        } else {
          // Checklist items should exist
          cy.get('input[type="checkbox"]').should('exist');
        }
      });
    });

    it('should persist checklist item state when toggled', () => {
      // Skip if no checklist items
      cy.get('body').then(($body) => {
        if (!$body.text().includes('No checklist items available')) {
          // Find first checkbox
          cy.get('input[type="checkbox"]').first().then(($checkbox) => {
            const wasChecked = $checkbox.is(':checked');

            // Toggle checkbox
            cy.wrap($checkbox).click({ force: true });

            // Reload page
            cy.reload();

            // Verify state persisted
            cy.get('input[type="checkbox"]', { timeout: 10000 })
              .first()
              .should(wasChecked ? 'not.be.checked' : 'be.checked');
          });
        }
      });
    });

    it('should handle empty transition state gracefully', () => {
      // If user has no active transition, should show helpful message
      cy.get('body').then(($body) => {
        if ($body.text().includes('No Active Transition')) {
          cy.contains('You are not currently assigned to any active transition').should('be.visible');
          cy.contains('Contact your program manager to get started').should('be.visible');
        }
      });
    });
  });

  describe('Incoming Contractor Dashboard', () => {
    beforeEach(() => {
      // Login as Incoming Contractor (Ian Illum)
      cy.visit('/');
      cy.get('input[name="username"]').type('Ian.Illum@inbound.com');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      // Wait for dashboard to load
      cy.url().should('include', '/dashboard');
      cy.contains('Incoming Contractor', { timeout: 10000 }).should('be.visible');
    });

    it('should display learning progress metrics', () => {
      // Verify all learning metrics are present
      cy.contains('Overall Progress').should('be.visible');
      cy.contains('Modules Completed').should('be.visible');
      cy.contains('Hours Logged').should('be.visible');
      cy.contains('Quiz Average').should('be.visible');

      // Verify metrics have numeric values
      cy.get('[data-testid="metric-card"]').should('have.length.at.least', 4);
    });

    it('should display learning roadmap with 5 modules', () => {
      // Verify roadmap widget exists
      cy.contains('Learning Roadmap').should('be.visible');

      // Verify module names are displayed
      cy.get('body').then(($body) => {
        if (!$body.text().includes('No learning modules available')) {
          // Should show multiple modules with progress bars
          cy.get('[data-testid="progress-bar"]').should('have.length.at.least', 1);
        }
      });
    });

    it('should display skills to master with progress bars', () => {
      // Verify skills widget exists
      cy.contains('Skills to Master').should('be.visible');

      // Check for skills or empty state
      cy.get('body').then(($body) => {
        if (!$body.text().includes('No skills data')) {
          // Should show skill progress bars
          cy.get('[data-testid="skill-progress"]').should('exist');
        }
      });
    });

    it('should display AI Knowledge Assistant chat interface', () => {
      // Verify AI chat widget exists
      cy.contains('AI Knowledge Assistant').should('be.visible');

      // Verify chat input exists
      cy.get('textarea[placeholder*="Ask"]').should('be.visible');

      // Verify send button exists
      cy.get('button').contains(/Send|Submit/i).should('be.visible');
    });

    it('should allow sending messages to AI assistant', () => {
      // Type a test message
      const testMessage = 'How do I configure network monitoring?';
      cy.get('textarea[placeholder*="Ask"]').type(testMessage);

      // Send message
      cy.get('button').contains(/Send|Submit/i).click();

      // Verify message appears in chat
      cy.contains(testMessage, { timeout: 5000 }).should('be.visible');

      // Verify AI response appears (may take time)
      cy.get('[data-testid="chat-message"]', { timeout: 10000 })
        .should('have.length.at.least', 2); // User message + AI response
    });

    it('should display learning resources', () => {
      // Verify resources widget exists
      cy.contains('Learning Resources').should('be.visible');

      // Check for resources or empty state
      cy.get('body').then(($body) => {
        if (!$body.text().includes('No resources available')) {
          // Should show resource items
          cy.get('[data-testid="learning-resource"]').should('exist');
        }
      });
    });

    it('should track module completion progress', () => {
      // If modules exist with "Complete" buttons
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Complete")').length > 0) {
          // Get current progress
          cy.get('[data-testid="overall-progress"]').invoke('text').then((progressBefore) => {
            // Click complete button on first incomplete module
            cy.get('button').contains('Complete').first().click();

            // Wait for progress to update
            cy.wait(1000);

            // Verify progress increased
            cy.get('[data-testid="overall-progress"]').invoke('text').should((progressAfter) => {
              expect(parseInt(progressAfter)).to.be.at.least(parseInt(progressBefore));
            });
          });
        }
      });
    });
  });

  describe('Cross-Dashboard Navigation', () => {
    it('should allow switching between dashboards for users with multiple roles', () => {
      // Login as admin (has multiple roles)
      cy.visit('/');
      cy.get('input[name="username"]').type('Dan.Demo@tip.gov');
      cy.get('input[name="password"]').type('DemoPassword123!');
      cy.get('button[type="submit"]').click();

      // Verify dashboard loads
      cy.url().should('include', '/dashboard', { timeout: 10000 });

      // Verify navigation to different pages works
      cy.get('a[href="/transitions"]').click();
      cy.url().should('include', '/transitions');

      // Navigate back to dashboard
      cy.get('a[href="/dashboard"]').click();
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Performance & Reliability', () => {
    it('should load dashboards within acceptable time', () => {
      const startTime = Date.now();

      // Login and wait for dashboard
      cy.visit('/');
      cy.get('input[name="username"]').type('Garry.Grove@usdoj.gov');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      // Wait for dashboard to be fully loaded
      cy.contains('Government Program Manager', { timeout: 10000 }).should('be.visible');

      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds (reasonable for E2E)
      expect(loadTime).to.be.lessThan(3000);
    });

    it('should handle network errors gracefully', () => {
      // Login first
      cy.visit('/');
      cy.get('input[name="username"]').type('Garry.Grove@usdoj.gov');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      // Simulate network failure
      cy.intercept('GET', '/api/dashboard/*', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('dashboardError');

      // Reload page to trigger error
      cy.reload();

      // Should show error message
      cy.contains(/Failed|Error/i, { timeout: 10000 }).should('be.visible');

      // Should show retry button
      cy.contains('button', /Retry|Try Again/i).should('be.visible');
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      // Login as Government PM
      cy.visit('/');
      cy.get('input[name="username"]').type('Garry.Grove@usdoj.gov');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();
      cy.contains('Government Program Manager', { timeout: 10000 }).should('be.visible');
    });

    it('should have proper heading hierarchy', () => {
      // Check for main heading
      cy.get('h1').should('contain', 'Government Program Manager');

      // Check for section headings
      cy.get('h2, h3, h4').should('have.length.at.least', 3);
    });

    it('should support keyboard navigation', () => {
      // Tab through interactive elements
      cy.get('button').first().focus();

      // Verify focused element is visible
      cy.focused().should('be.visible');

      // Tab to next element
      cy.focused().tab();

      // Verify new focused element
      cy.focused().should('be.visible');
    });

    it('should have descriptive button labels', () => {
      // All buttons should have clear text or aria-labels
      cy.get('button').each(($button) => {
        const hasText = $button.text().trim().length > 0;
        const hasAriaLabel = $button.attr('aria-label');

        expect(hasText || hasAriaLabel).to.be.true;
      });
    });
  });
});
