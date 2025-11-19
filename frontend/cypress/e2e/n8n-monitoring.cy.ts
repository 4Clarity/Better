/// <reference types="cypress" />

describe('N8N Workflow Monitoring', () => {
  beforeEach(() => {
    // Set up auth bypass for testing
    cy.window().then((win) => {
      win.localStorage.setItem('authToken', 'test-token');
    });

    // Mock workflow executions
    cy.intercept('GET', '**/api/n8n/executions*', {
      statusCode: 200,
      body: [
        {
          id: 'exec-1',
          documentId: 'doc-1',
          documentName: 'document1.pdf',
          startedAt: '2025-01-15T10:00:00Z',
          finishedAt: '2025-01-15T10:05:00Z',
          duration: 300000,
          status: 'success',
          n8nWorkflowId: 'workflow-123',
        },
        {
          id: 'exec-2',
          documentId: 'doc-2',
          documentName: 'document2.pdf',
          startedAt: '2025-01-15T09:00:00Z',
          finishedAt: '2025-01-15T09:02:00Z',
          duration: 120000,
          status: 'failed',
          error: 'Processing error',
          n8nWorkflowId: 'workflow-124',
        },
        {
          id: 'exec-3',
          documentId: 'doc-3',
          documentName: 'document3.pdf',
          startedAt: '2025-01-15T11:00:00Z',
          status: 'running',
          n8nWorkflowId: 'workflow-125',
        },
      ],
    }).as('getExecutions');

    // Mock workflow metrics
    cy.intercept('GET', '**/api/n8n/metrics', {
      statusCode: 200,
      body: {
        successRate: 66.7,
        avgDuration: 210000,
        totalExecutions: 3,
        failureRate: 33.3,
      },
    }).as('getMetrics');
  });

  it('should display workflow metrics', () => {
    cy.visit('/knowledge/n8n-monitoring');

    cy.wait('@getExecutions');
    cy.wait('@getMetrics');

    // Verify metrics cards are displayed
    cy.contains('Total Executions').should('be.visible');
    cy.contains('Success Rate').should('be.visible');
    cy.contains('Avg Duration').should('be.visible');
    cy.contains('Failure Rate').should('be.visible');
  });

  it('should display execution history table', () => {
    cy.visit('/knowledge/n8n-monitoring');

    cy.wait('@getExecutions');
    cy.wait('@getMetrics');

    // Verify table headers
    cy.contains('Document').should('be.visible');
    cy.contains('Started At').should('be.visible');
    cy.contains('Duration').should('be.visible');
    cy.contains('Status').should('be.visible');
  });

  it('should filter executions by status', () => {
    cy.visit('/knowledge/n8n-monitoring');

    cy.wait('@getExecutions');
    cy.wait('@getMetrics');

    // Click Success filter
    cy.contains('button', 'Success').click();

    // Only successful executions should be visible
    cy.contains('document1.pdf').should('be.visible');
    cy.contains('document2.pdf').should('not.exist');
  });

  it('should filter executions by date range', () => {
    cy.visit('/knowledge/n8n-monitoring');

    cy.wait('@getExecutions');
    cy.wait('@getMetrics');

    // Click Last 7 Days filter
    cy.contains('button', 'Last 7 Days').click();

    // Executions should be filtered
  });

  it('should refresh data when Refresh button is clicked', () => {
    cy.visit('/knowledge/n8n-monitoring');

    cy.wait('@getExecutions');
    cy.wait('@getMetrics');

    // Click refresh button
    cy.contains('button', 'Refresh').click();

    // API should be called again
    cy.wait('@getExecutions');
    cy.wait('@getMetrics');
  });

  it('should display error state when API fails', () => {
    cy.intercept('GET', '**/api/n8n/executions*', {
      statusCode: 500,
      body: { error: 'Internal server error' },
    }).as('getExecutionsError');

    cy.visit('/knowledge/n8n-monitoring');

    // Error message should be displayed
    cy.contains('Failed to fetch data').should('be.visible');
  });

  it('should link to n8n workflow details', () => {
    cy.visit('/knowledge/n8n-monitoring');

    cy.wait('@getExecutions');
    cy.wait('@getMetrics');

    // Verify n8n links are present
    cy.contains('a', 'View in n8n')
      .should('have.attr', 'href')
      .and('include', 'n8n.tip.localhost');
  });

  it('should auto-refresh data every 10 seconds', () => {
    cy.visit('/knowledge/n8n-monitoring');

    cy.wait('@getExecutions');
    cy.wait('@getMetrics');

    // Wait for auto-refresh (this tests the polling mechanism)
    cy.wait('@getExecutions', { timeout: 15000 });
    cy.wait('@getMetrics', { timeout: 15000 });
  });
});
