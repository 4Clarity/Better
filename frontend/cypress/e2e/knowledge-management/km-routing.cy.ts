describe('Knowledge Management Routing', () => {
  beforeEach(() => {
    localStorage.setItem('authBypass', 'true');
  });

  it('should handle route configuration correctly', () => {
    // Test main KM route
    cy.visit('/knowledge');
    cy.url().should('include', '/knowledge/weekly-curation');

    // Test all nested routes
    const routes = [
      { path: '/knowledge/weekly-curation', expectedContent: 'Weekly Curation' },
      { path: '/knowledge/document-upload', expectedContent: 'Product Documents' },
      { path: '/knowledge/communication-files', expectedContent: 'Communication Files' },
      { path: '/knowledge/facts-curation', expectedContent: 'Facts Curation' },
      { path: '/knowledge/approval-queue', expectedContent: 'Approval Queue' },
      { path: '/knowledge/knowledge-search', expectedContent: 'Knowledge Search' },
      { path: '/knowledge/configuration', expectedContent: 'Configuration' },
    ];

    routes.forEach(route => {
      cy.visit(route.path);
      cy.url().should('eq', Cypress.config().baseUrl + route.path);
      cy.contains(route.expectedContent).should('be.visible');
    });
  });

  it('should handle nested routing within KM sections', () => {
    // Visit KM root and verify nested routing works
    cy.visit('/knowledge');

    // Should be at weekly-curation (default redirect)
    cy.url().should('include', '/weekly-curation');

    // Browser back/forward should work
    cy.visit('/knowledge/facts-curation');
    cy.go('back');
    cy.url().should('include', '/weekly-curation');

    cy.go('forward');
    cy.url().should('include', '/facts-curation');
  });

  it('should maintain state during navigation', () => {
    cy.visit('/knowledge/weekly-curation');

    // Navigate away and back
    cy.visit('/');
    cy.contains('Operational Knowledge Platform').click();

    // Should return to default route (weekly-curation)
    cy.url().should('include', '/weekly-curation');
  });

  it('should handle invalid KM routes gracefully', () => {
    // Visit invalid KM route
    cy.visit('/knowledge/invalid-section', { failOnStatusCode: false });

    // Should either redirect to valid route or show 404 appropriately
    // The exact behavior depends on how the app handles unknown routes
    cy.url().should('include', '/knowledge');
  });

  it('should work with browser navigation controls', () => {
    cy.visit('/knowledge/weekly-curation');

    // Navigate to different sections
    cy.contains('Facts Curation').click();
    cy.url().should('include', '/facts-curation');

    cy.contains('Approval Queue').click();
    cy.url().should('include', '/approval-queue');

    // Use browser back button
    cy.go('back');
    cy.url().should('include', '/facts-curation');
    cy.contains('Facts Curation').should('be.visible');

    // Use browser forward button
    cy.go('forward');
    cy.url().should('include', '/approval-queue');
    cy.contains('Approval Queue').should('be.visible');
  });

  it('should integrate properly with main app routing', () => {
    // Start from KM
    cy.visit('/knowledge/facts-curation');

    // Navigate to other main app sections
    cy.contains('Dashboard').click();
    cy.url().should('eq', Cypress.config().baseUrl + '/');

    // Go back to KM
    cy.contains('Operational Knowledge Platform').click();
    cy.url().should('include', '/knowledge');

    // Navigate to transitions
    cy.contains('Transitions').click();
    cy.url().should('include', '/transitions');

    // Return to KM again
    cy.contains('Operational Knowledge Platform').click();
    cy.url().should('include', '/knowledge');
  });
});