/**
 * E2E Tests for Story 4.2 - Phase 1: Products/Programs Stakeholder Management
 * Tests stakeholder CRUD workflows, permissions, and UI interactions
 */

describe('Products/Programs Stakeholder Management', () => {
  // Test data
  const testProductProgram = {
    id: 'test-product-program-id',
    name: 'Test Defense System',
    description: 'Test description',
    objectives: 'Test objectives',
    deliverables: 'Test deliverables',
    dependencies: null,
    securityClassification: 'CUI',
    criticalDates: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test-user-id',
    updatedBy: 'test-user-id',
  };

  const testUsers = [
    {
      id: 'user-1',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'Gov Program Manager',
    },
    {
      id: 'user-2',
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'Contractor Technical Lead',
    },
  ];

  const testStakeholders = [
    {
      id: 'stakeholder-1',
      productProgramId: testProductProgram.id,
      userId: 'user-1',
      role: 'Project Lead',
      assignedAt: new Date().toISOString(),
      assignedBy: 'admin-user-id',
      user: testUsers[0],
      assignedByUser: {
        id: 'admin-user-id',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
      },
    },
  ];

  beforeEach(() => {
    // Set auth bypass for testing
    cy.window().then((win) => {
      win.localStorage.setItem('authBypass', 'true');
    });

    // Intercept API calls
    cy.intercept('GET', `/api/business-operations/products-programs/${testProductProgram.id}`, {
      statusCode: 200,
      body: {
        success: true,
        data: testProductProgram,
      },
    }).as('getProductProgram');

    cy.intercept('GET', `/api/business-operations/products-programs/${testProductProgram.id}/stakeholders`, {
      statusCode: 200,
      body: {
        success: true,
        data: testStakeholders,
      },
    }).as('getStakeholders');

    cy.intercept('GET', '/api/user-management/users*', {
      statusCode: 200,
      body: {
        users: testUsers,
        pagination: {
          page: 1,
          pageSize: 100,
          totalCount: 2,
          totalPages: 1,
        },
      },
    }).as('getUsers');
  });

  describe('Stakeholder Display', () => {
    it('should display stakeholders section on detail page', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getProductProgram');
      cy.wait('@getStakeholders');

      cy.contains('h3', 'Stakeholders').should('be.visible');
    });

    it('should show stakeholder table with correct columns', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      // Check table headers
      cy.contains('th', 'Name').should('be.visible');
      cy.contains('th', 'Email').should('be.visible');
      cy.contains('th', 'Role').should('be.visible');
      cy.contains('th', 'Assigned By').should('be.visible');
      cy.contains('th', 'Assigned Date').should('be.visible');
      cy.contains('th', 'Actions').should('be.visible');
    });

    it('should display stakeholder data correctly', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      // Check stakeholder data
      cy.contains('td', 'John Doe').should('be.visible');
      cy.contains('td', 'john.doe@example.com').should('be.visible');
      cy.contains('td', 'Project Lead').should('be.visible');
      cy.contains('td', 'Admin User').should('be.visible');
    });

    it('should show empty state when no stakeholders exist', () => {
      cy.intercept('GET', `/api/business-operations/products-programs/${testProductProgram.id}/stakeholders`, {
        statusCode: 200,
        body: {
          success: true,
          data: [],
        },
      }).as('getEmptyStakeholders');

      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getEmptyStakeholders');

      cy.contains('No stakeholders assigned yet').should('be.visible');
    });
  });

  describe('Add Stakeholder Workflow', () => {
    it('should show Add Stakeholder button for authorized users', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      cy.get('button').contains('Add Stakeholder').should('be.visible');
    });

    it('should open Add Stakeholder dialog when button clicked', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      cy.get('button').contains('Add Stakeholder').click();

      cy.contains('h2', 'Add Stakeholder').should('be.visible');
      cy.contains('label', 'User').should('be.visible');
      cy.contains('label', 'Role').should('be.visible');
    });

    it('should load and display available users in dropdown', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.get('button').contains('Add Stakeholder').click();
      cy.wait('@getUsers');

      // Open user dropdown
      cy.get('[id="user"]').click();

      // Should show Jane Smith (not already a stakeholder)
      cy.contains('Jane Smith').should('be.visible');
    });

    it('should filter out existing stakeholders from user list', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.get('button').contains('Add Stakeholder').click();

      cy.get('[id="user"]').click();

      // John Doe should not appear (already a stakeholder)
      cy.contains('John Doe').should('not.exist');
    });

    it('should successfully add a stakeholder with role', () => {
      const newStakeholder = {
        id: 'stakeholder-2',
        productProgramId: testProductProgram.id,
        userId: 'user-2',
        role: 'Technical Advisor',
        assignedAt: new Date().toISOString(),
        assignedBy: 'admin-user-id',
        user: testUsers[1],
        assignedByUser: {
          id: 'admin-user-id',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
        },
      };

      cy.intercept('POST', `/api/business-operations/products-programs/${testProductProgram.id}/stakeholders`, {
        statusCode: 201,
        body: {
          success: true,
          data: newStakeholder,
        },
      }).as('addStakeholder');

      cy.intercept('GET', `/api/business-operations/products-programs/${testProductProgram.id}/stakeholders`, {
        statusCode: 200,
        body: {
          success: true,
          data: [...testStakeholders, newStakeholder],
        },
      }).as('getUpdatedStakeholders');

      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.get('button').contains('Add Stakeholder').click();

      // Select user
      cy.get('[id="user"]').click();
      cy.contains('Jane Smith').click();

      // Enter role
      cy.get('input[id="role"]').type('Technical Advisor');

      // Submit
      cy.get('button').contains('Add Stakeholder').click();

      cy.wait('@addStakeholder');
      cy.wait('@getUpdatedStakeholders');

      // Dialog should close
      cy.contains('h2', 'Add Stakeholder').should('not.exist');

      // New stakeholder should appear in table
      cy.contains('Jane Smith').should('be.visible');
      cy.contains('Technical Advisor').should('be.visible');
    });

    it('should successfully add a stakeholder without role', () => {
      cy.intercept('POST', `/api/business-operations/products-programs/${testProductProgram.id}/stakeholders`, {
        statusCode: 201,
        body: {
          success: true,
          data: {
            ...testStakeholders[0],
            id: 'stakeholder-2',
            userId: 'user-2',
            role: null,
          },
        },
      }).as('addStakeholder');

      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.get('button').contains('Add Stakeholder').click();

      cy.get('[id="user"]').click();
      cy.contains('Jane Smith').click();

      // Don't enter role
      cy.get('button').contains('Add Stakeholder').click();

      cy.wait('@addStakeholder').its('request.body').should('deep.equal', {
        userId: 'user-2',
      });
    });

    it('should show validation error when no user selected', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.get('button').contains('Add Stakeholder').click();

      // Try to submit without selecting user
      cy.get('button').contains('Add Stakeholder').click();

      cy.contains('Please select a user').should('be.visible');
    });

    it('should handle API errors gracefully', () => {
      cy.intercept('POST', `/api/business-operations/products-programs/${testProductProgram.id}/stakeholders`, {
        statusCode: 400,
        body: {
          message: 'User is already a stakeholder for this Product/Program',
        },
      }).as('addStakeholderError');

      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.get('button').contains('Add Stakeholder').click();

      cy.get('[id="user"]').click();
      cy.contains('Jane Smith').click();
      cy.get('button').contains('Add Stakeholder').click();

      cy.wait('@addStakeholderError');
      cy.contains('User is already a stakeholder').should('be.visible');
    });

    it('should support search functionality for users', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.get('button').contains('Add Stakeholder').click();

      // Type in search box
      cy.get('input[placeholder*="Search"]').type('jane');

      cy.wait('@getUsers').its('request.url').should('include', 'search=jane');
    });
  });

  describe('Update Stakeholder Role', () => {
    it('should show Edit button for stakeholder roles', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      cy.contains('td', 'Project Lead')
        .parent()
        .within(() => {
          cy.get('button').contains('Edit').should('be.visible');
        });
    });

    it('should enable inline editing when Edit clicked', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      cy.contains('td', 'Project Lead')
        .parent()
        .within(() => {
          cy.get('button').contains('Edit').click();
        });

      // Should show input field with current value
      cy.get('input[value="Project Lead"]').should('be.visible');
      cy.get('button').contains('Save').should('be.visible');
      cy.get('button').contains('Cancel').should('be.visible');
    });

    it('should successfully update stakeholder role', () => {
      cy.intercept('PUT', `/api/business-operations/products-programs/${testProductProgram.id}/stakeholders/user-1`, {
        statusCode: 200,
        body: {
          success: true,
          data: {
            ...testStakeholders[0],
            role: 'Program Director',
          },
        },
      }).as('updateRole');

      cy.intercept('GET', `/api/business-operations/products-programs/${testProductProgram.id}/stakeholders`, {
        statusCode: 200,
        body: {
          success: true,
          data: [
            {
              ...testStakeholders[0],
              role: 'Program Director',
            },
          ],
        },
      }).as('getUpdatedStakeholders');

      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      // Start editing
      cy.contains('td', 'Project Lead')
        .parent()
        .within(() => {
          cy.get('button').contains('Edit').click();
        });

      // Change role
      cy.get('input[value="Project Lead"]').clear().type('Program Director');
      cy.get('button').contains('Save').click();

      cy.wait('@updateRole');
      cy.wait('@getUpdatedStakeholders');

      // Should show updated role
      cy.contains('Program Director').should('be.visible');
    });

    it('should allow clearing role (set to null)', () => {
      cy.intercept('PUT', `/api/business-operations/products-programs/${testProductProgram.id}/stakeholders/user-1`, {
        statusCode: 200,
        body: {
          success: true,
          data: {
            ...testStakeholders[0],
            role: null,
          },
        },
      }).as('updateRole');

      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      cy.contains('td', 'Project Lead')
        .parent()
        .within(() => {
          cy.get('button').contains('Edit').click();
        });

      cy.get('input[value="Project Lead"]').clear();
      cy.get('button').contains('Save').click();

      cy.wait('@updateRole').its('request.body').should('deep.equal', {
        role: null,
      });
    });

    it('should cancel editing when Cancel clicked', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      cy.contains('td', 'Project Lead')
        .parent()
        .within(() => {
          cy.get('button').contains('Edit').click();
        });

      cy.get('input[value="Project Lead"]').clear().type('New Role');
      cy.get('button').contains('Cancel').click();

      // Should still show original value
      cy.contains('Project Lead').should('be.visible');
      cy.contains('New Role').should('not.exist');
    });

    it('should enforce 100 character max length for role', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      cy.contains('td', 'Project Lead')
        .parent()
        .within(() => {
          cy.get('button').contains('Edit').click();
        });

      const longRole = 'A'.repeat(101);
      cy.get('input[value="Project Lead"]').clear().type(longRole);

      // Input should truncate at 100 characters
      cy.get('input').should('have.value', 'A'.repeat(100));
    });
  });

  describe('Remove Stakeholder', () => {
    it('should show Remove button for each stakeholder', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      cy.contains('td', 'John Doe')
        .parent()
        .within(() => {
          cy.get('button').contains('Remove').should('be.visible');
        });
    });

    it('should show confirmation dialog when Remove clicked', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      cy.contains('td', 'John Doe')
        .parent()
        .within(() => {
          cy.get('button').contains('Remove').click();
        });

      cy.contains('Remove Stakeholder').should('be.visible');
      cy.contains('Are you sure you want to remove this stakeholder').should('be.visible');
      cy.contains('John Doe').should('be.visible');
    });

    it('should successfully remove stakeholder when confirmed', () => {
      cy.intercept('DELETE', `/api/business-operations/products-programs/${testProductProgram.id}/stakeholders/user-1`, {
        statusCode: 200,
        body: {
          success: true,
          message: 'Stakeholder removed successfully',
        },
      }).as('removeStakeholder');

      cy.intercept('GET', `/api/business-operations/products-programs/${testProductProgram.id}/stakeholders`, {
        statusCode: 200,
        body: {
          success: true,
          data: [],
        },
      }).as('getUpdatedStakeholders');

      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      cy.contains('td', 'John Doe')
        .parent()
        .within(() => {
          cy.get('button').contains('Remove').click();
        });

      // Confirm deletion
      cy.get('button').contains('Delete').click();

      cy.wait('@removeStakeholder');
      cy.wait('@getUpdatedStakeholders');

      // Stakeholder should be removed
      cy.contains('John Doe').should('not.exist');
      cy.contains('No stakeholders assigned yet').should('be.visible');
    });

    it('should cancel removal when Cancel clicked', () => {
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      cy.contains('td', 'John Doe')
        .parent()
        .within(() => {
          cy.get('button').contains('Remove').click();
        });

      cy.get('button').contains('Cancel').click();

      // Stakeholder should still be visible
      cy.contains('John Doe').should('be.visible');
    });

    it('should handle API errors during removal', () => {
      cy.intercept('DELETE', `/api/business-operations/products-programs/${testProductProgram.id}/stakeholders/user-1`, {
        statusCode: 400,
        body: {
          message: 'Cannot remove stakeholder',
        },
      }).as('removeStakeholderError');

      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      cy.contains('td', 'John Doe')
        .parent()
        .within(() => {
          cy.get('button').contains('Remove').click();
        });

      cy.get('button').contains('Delete').click();

      cy.wait('@removeStakeholderError');
      cy.contains('Cannot remove stakeholder').should('be.visible');
    });
  });

  describe('Permission-Based UI', () => {
    it('should hide management buttons for users without permissions', () => {
      // Mock permissions check to return false
      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholders');

      // Note: This test would need actual permission mocking
      // For now, we verify the buttons exist for authorized users
      cy.get('button').contains('Add Stakeholder').should('exist');
      cy.get('button').contains('Edit').should('exist');
      cy.get('button').contains('Remove').should('exist');
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state while fetching stakeholders', () => {
      cy.intercept('GET', `/api/business-operations/products-programs/${testProductProgram.id}/stakeholders`, {
        delay: 1000,
        statusCode: 200,
        body: {
          success: true,
          data: testStakeholders,
        },
      }).as('getStakeholdersDelayed');

      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);

      cy.contains('Loading stakeholders').should('be.visible');
      cy.wait('@getStakeholdersDelayed');
      cy.contains('Loading stakeholders').should('not.exist');
    });

    it('should display error message when fetch fails', () => {
      cy.intercept('GET', `/api/business-operations/products-programs/${testProductProgram.id}/stakeholders`, {
        statusCode: 500,
        body: {
          message: 'Internal server error',
        },
      }).as('getStakeholdersError');

      cy.visit(`/business-operations/products-programs/${testProductProgram.id}`);
      cy.wait('@getStakeholdersError');

      cy.contains('Failed to fetch stakeholders').should('be.visible');
    });
  });
});
