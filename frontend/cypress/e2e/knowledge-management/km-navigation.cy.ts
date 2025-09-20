describe('Knowledge Management Navigation', () => {
  beforeEach(() => {
    // Set auth bypass for testing
    localStorage.setItem('authBypass', 'true');
    cy.visit('/');
  });

  it('should navigate to Knowledge Management from main navigation', () => {
    // Navigate to Knowledge Management
    cy.contains('Operational Knowledge Platform').click();

    // Verify we're on the KM page
    cy.url().should('include', '/knowledge');
    cy.contains('Knowledge Curation Dashboard').should('be.visible');
  });

  it('should redirect to Weekly Curation by default', () => {
    // Navigate to Knowledge Management root
    cy.visit('/knowledge');

    // Should redirect to Weekly Curation
    cy.url().should('include', '/knowledge/weekly-curation');
    cy.contains('Weekly Curation').should('be.visible');
  });

  it('should navigate between KM sections using tabs', () => {
    cy.visit('/knowledge');

    // Navigate to Document Upload
    cy.contains('Product Documents').click();
    cy.url().should('include', '/knowledge/document-upload');
    cy.contains('Upload Document').should('be.visible');

    // Navigate to Communication Files
    cy.contains('Communication Files').click();
    cy.url().should('include', '/knowledge/communication-files');
    cy.contains('Connect Source').should('be.visible');

    // Navigate to Facts Curation
    cy.contains('Facts Curation').click();
    cy.url().should('include', '/knowledge/facts-curation');
    cy.contains('Add Manual Fact').should('be.visible');

    // Navigate to Approval Queue
    cy.contains('Approval Queue').click();
    cy.url().should('include', '/knowledge/approval-queue');
    cy.contains('Bulk Actions').should('be.visible');

    // Navigate to Knowledge Search
    cy.contains('Knowledge Search').click();
    cy.url().should('include', '/knowledge/knowledge-search');
    cy.contains('Advanced Search').should('be.visible');

    // Navigate to Configuration
    cy.contains('Configuration').click();
    cy.url().should('include', '/knowledge/configuration');
    cy.contains('Save Changes').should('be.visible');
  });

  it('should show correct breadcrumb navigation', () => {
    cy.visit('/knowledge/weekly-curation');

    // Check breadcrumb navigation
    cy.contains('Operational Knowledge Platform').should('be.visible');
    cy.contains('Knowledge Curation Dashboard').should('be.visible');
  });

  it('should highlight active navigation tab', () => {
    cy.visit('/knowledge/weekly-curation');

    // Weekly Curation tab should be active (default variant)
    cy.contains('Weekly Curation').should('have.class', 'bg-primary');

    // Navigate to another section
    cy.contains('Facts Curation').click();

    // Facts Curation tab should now be active
    cy.contains('Facts Curation').should('have.class', 'bg-primary');
  });

  it('should maintain layout consistency with main app', () => {
    cy.visit('/knowledge');

    // Check that main layout elements are present
    cy.get('aside').should('be.visible'); // Sidebar
    cy.get('header').should('be.visible'); // Top header
    cy.contains('TIP').should('be.visible'); // Logo

    // Check page title in header
    cy.contains('Operational Knowledge Platform').should('be.visible');
  });

  it('should support deep linking to specific KM sections', () => {
    // Direct navigation to specific sections should work
    cy.visit('/knowledge/approval-queue');
    cy.contains('Approval Queue').should('be.visible');
    cy.contains('Pending Review').should('be.visible');

    cy.visit('/knowledge/knowledge-search');
    cy.contains('Knowledge Search').should('be.visible');
    cy.contains('Search facts, documents, and communications').should('be.visible');
  });
});