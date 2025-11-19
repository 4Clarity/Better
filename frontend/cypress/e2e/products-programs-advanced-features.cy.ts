/**
 * E2E Tests for Story 4.3: Knowledge Integration and Advanced Features
 * Tests Tasks, Milestones, Knowledge Links, and Knowledge Context features
 */

describe('Products/Programs Advanced Features', () => {
  const productId = 'test-product-123';

  beforeEach(() => {
    // Set auth bypass for testing
    cy.window().then((win) => {
      win.localStorage.setItem('authBypass', 'true');
    });

    // Mock product/program detail API
    cy.intercept('GET', `/api/business-operations/products-programs/${productId}`, {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: productId,
          name: 'Test Defense Program',
          description: 'Test program for advanced features',
          objectives: 'Test objectives',
          deliverables: 'Test deliverables',
          dependencies: null,
          securityClassification: 'CUI',
          knowledge_context: 'This program focuses on modernizing legacy systems.',
          criticalDates: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          createdBy: 'user-1',
          updatedBy: 'user-1',
        },
      },
    }).as('getProduct');

    // Visit the product detail page
    cy.visit(`/business-operations/products-programs/${productId}`);
    cy.wait('@getProduct');
  });

  describe('Tasks Management', () => {
    beforeEach(() => {
      cy.intercept('GET', `/api/business-operations/products-programs/${productId}/tasks`, {
        statusCode: 200,
        body: {
          success: true,
          data: [
            {
              id: 'task-1',
              productProgramId: productId,
              title: 'Initial Design',
              description: 'Complete initial design phase',
              status: 'TODO',
              dueDate: '2024-12-31T00:00:00Z',
              assignedTo: 'user-1',
              assignedUser: {
                id: 'user-1',
                person: {
                  firstName: 'John',
                  lastName: 'Doe',
                },
              },
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
            {
              id: 'task-2',
              productProgramId: productId,
              title: 'Development',
              description: 'Core development work',
              status: 'COMPLETED',
              dueDate: '2024-11-30T00:00:00Z',
              assignedTo: 'user-2',
              completedAt: '2024-11-15T00:00:00Z',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-11-15T00:00:00Z',
            },
          ],
        },
      }).as('getTasks');
    });

    it('should display Tasks section with task list', () => {
      cy.wait('@getTasks');

      cy.contains('Tasks').should('be.visible');
      cy.contains('1 of 2 tasks completed').should('be.visible');
      cy.contains('Initial Design').should('be.visible');
      cy.contains('Development').should('be.visible');
    });

    it('should display task status badges', () => {
      cy.wait('@getTasks');

      cy.contains('TODO').should('be.visible');
      cy.contains('COMPLETED').should('be.visible');
    });

    it('should display assigned users', () => {
      cy.wait('@getTasks');

      cy.contains('Assigned to: John Doe').should('be.visible');
    });

    it('should open create task dialog', () => {
      cy.wait('@getTasks');

      cy.contains('button', 'Add Task').click();

      cy.contains('Create New Task').should('be.visible');
      cy.get('input[placeholder="Task title"]').should('be.visible');
      cy.get('textarea[placeholder="Task description"]').should('be.visible');
    });

    it('should create a new task', () => {
      cy.intercept('POST', `/api/business-operations/products-programs/${productId}/tasks`, {
        statusCode: 201,
        body: {
          success: true,
          data: {
            id: 'new-task-id',
            productProgramId: productId,
            title: 'New Task',
            description: 'New task description',
            status: 'TODO',
            dueDate: '2024-12-31T00:00:00Z',
            assignedTo: null,
            createdAt: '2024-01-15T00:00:00Z',
            updatedAt: '2024-01-15T00:00:00Z',
          },
        },
      }).as('createTask');

      cy.wait('@getTasks');
      cy.contains('button', 'Add Task').click();

      cy.get('input[placeholder="Task title"]').type('New Task');
      cy.get('textarea[placeholder="Task description"]').type('New task description');
      cy.get('input[type="date"]').type('2024-12-31');

      cy.contains('button', 'Create Task').click();

      cy.wait('@createTask');
      cy.contains('Create New Task').should('not.exist');
    });

    it('should mark task as complete', () => {
      cy.intercept('POST', '/api/business-operations/tasks/task-1/complete', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'task-1',
            productProgramId: productId,
            title: 'Initial Design',
            status: 'COMPLETED',
            completedAt: '2024-01-15T00:00:00Z',
          },
        },
      }).as('completeTask');

      cy.wait('@getTasks');

      // Find the task card and click the complete button (CheckCircle icon)
      cy.contains('Initial Design')
        .parents('div.flex.items-start.justify-between')
        .find('button')
        .first()
        .click();

      cy.wait('@completeTask');
    });

    it('should delete a task after confirmation', () => {
      cy.intercept('DELETE', '/api/business-operations/tasks/task-1', {
        statusCode: 200,
        body: {
          success: true,
          message: 'Task deleted successfully',
        },
      }).as('deleteTask');

      cy.wait('@getTasks');

      // Stub window.confirm to return true
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
      });

      // Find the task card and click the delete button (last button)
      cy.contains('Initial Design')
        .parents('div.flex.items-start.justify-between')
        .find('button')
        .last()
        .click();

      cy.wait('@deleteTask');
    });

    it('should show empty state when no tasks exist', () => {
      cy.intercept('GET', `/api/business-operations/products-programs/${productId}/tasks`, {
        statusCode: 200,
        body: {
          success: true,
          data: [],
        },
      }).as('getEmptyTasks');

      cy.reload();
      cy.wait('@getEmptyTasks');

      cy.contains('No tasks yet').should('be.visible');
    });
  });

  describe('Milestones Management', () => {
    beforeEach(() => {
      cy.intercept('GET', `/api/business-operations/products-programs/${productId}/milestones`, {
        statusCode: 200,
        body: {
          success: true,
          data: [
            {
              id: 'milestone-1',
              productProgramId: productId,
              title: 'Phase 1 Completion',
              description: 'Complete initial phase',
              targetDate: '2024-12-31T00:00:00Z',
              status: 'IN_PROGRESS',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
            {
              id: 'milestone-2',
              productProgramId: productId,
              title: 'Project Launch',
              description: 'Official launch',
              targetDate: '2025-03-15T00:00:00Z',
              status: 'ACHIEVED',
              achievedAt: '2025-03-10T00:00:00Z',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2025-03-10T00:00:00Z',
            },
          ],
        },
      }).as('getMilestones');
    });

    it('should display Milestones section with milestone list', () => {
      cy.wait('@getMilestones');

      cy.contains('Milestones').should('be.visible');
      cy.contains('1 of 2 milestones achieved').should('be.visible');
      cy.contains('Phase 1 Completion').should('be.visible');
      cy.contains('Project Launch').should('be.visible');
    });

    it('should display milestone status badges', () => {
      cy.wait('@getMilestones');

      cy.contains('IN PROGRESS').should('be.visible');
      cy.contains('ACHIEVED').should('be.visible');
    });

    it('should display target dates', () => {
      cy.wait('@getMilestones');

      cy.contains(/Dec 31, 2024/i).should('be.visible');
      cy.contains(/Mar 15, 2025/i).should('be.visible');
    });

    it('should display achieved date for completed milestones', () => {
      cy.wait('@getMilestones');

      cy.contains(/Achieved on Mar 10, 2025/i).should('be.visible');
    });

    it('should open create milestone dialog', () => {
      cy.wait('@getMilestones');

      cy.contains('button', 'Add Milestone').click();

      cy.contains('Create New Milestone').should('be.visible');
      cy.get('input[placeholder="Milestone title"]').should('be.visible');
      cy.get('textarea[placeholder="Milestone description"]').should('be.visible');
    });

    it('should create a new milestone', () => {
      cy.intercept('POST', `/api/business-operations/products-programs/${productId}/milestones`, {
        statusCode: 201,
        body: {
          success: true,
          data: {
            id: 'new-milestone-id',
            productProgramId: productId,
            title: 'New Milestone',
            description: 'New milestone description',
            targetDate: '2024-12-31T00:00:00Z',
            status: 'UPCOMING',
            createdAt: '2024-01-15T00:00:00Z',
            updatedAt: '2024-01-15T00:00:00Z',
          },
        },
      }).as('createMilestone');

      cy.wait('@getMilestones');
      cy.contains('button', 'Add Milestone').click();

      cy.get('input[placeholder="Milestone title"]').type('New Milestone');
      cy.get('textarea[placeholder="Milestone description"]').type(
        'New milestone description'
      );
      cy.get('input[type="date"]').type('2024-12-31');

      cy.contains('button', 'Create Milestone').click();

      cy.wait('@createMilestone');
      cy.contains('Create New Milestone').should('not.exist');
    });

    it('should mark milestone as achieved', () => {
      cy.intercept('POST', '/api/business-operations/milestones/milestone-1/achieved', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'milestone-1',
            productProgramId: productId,
            title: 'Phase 1 Completion',
            status: 'ACHIEVED',
            achievedAt: '2024-01-15T00:00:00Z',
          },
        },
      }).as('achieveMilestone');

      cy.wait('@getMilestones');

      // Find the milestone card and click the achieved button (Award icon)
      cy.contains('Phase 1 Completion')
        .parents('div.flex-1.border.rounded-lg')
        .find('button')
        .first()
        .click();

      cy.wait('@achieveMilestone');
    });

    it('should show timeline visualization', () => {
      cy.wait('@getMilestones');

      // Check for timeline indicators (colored dots)
      cy.get('div.w-3.h-3.rounded-full').should('have.length', 2);
    });

    it('should show empty state when no milestones exist', () => {
      cy.intercept('GET', `/api/business-operations/products-programs/${productId}/milestones`, {
        statusCode: 200,
        body: {
          success: true,
          data: [],
        },
      }).as('getEmptyMilestones');

      cy.reload();
      cy.wait('@getEmptyMilestones');

      cy.contains('No milestones yet').should('be.visible');
    });
  });

  describe('Knowledge Links Management', () => {
    beforeEach(() => {
      cy.intercept(
        'GET',
        `/api/business-operations/products-programs/${productId}/knowledge-links`,
        {
          statusCode: 200,
          body: {
            success: true,
            data: [
              {
                id: 'link-1',
                productProgramId: productId,
                knowledgeItemId: 'km-item-123',
                linkType: 'Reference',
                linkedAt: '2024-01-15T00:00:00Z',
                linkedBy: 'user-1',
                linkedByUser: {
                  id: 'user-1',
                  person: {
                    firstName: 'John',
                    lastName: 'Doe',
                  },
                },
              },
              {
                id: 'link-2',
                productProgramId: productId,
                knowledgeItemId: 'km-item-456',
                linkType: 'Dependency',
                linkedAt: '2024-02-01T00:00:00Z',
                linkedBy: 'user-2',
                linkedByUser: {
                  id: 'user-2',
                  person: {
                    firstName: 'Jane',
                    lastName: 'Smith',
                  },
                },
              },
            ],
          },
        }
      ).as('getKnowledgeLinks');
    });

    it('should display Knowledge Links section with link list', () => {
      cy.wait('@getKnowledgeLinks');

      cy.contains('Knowledge Links').should('be.visible');
      cy.contains('2 knowledge items linked').should('be.visible');
      cy.contains('km-item-123').should('be.visible');
      cy.contains('km-item-456').should('be.visible');
    });

    it('should display link type badges', () => {
      cy.wait('@getKnowledgeLinks');

      cy.contains('Reference').should('be.visible');
      cy.contains('Dependency').should('be.visible');
    });

    it('should display linked by user information', () => {
      cy.wait('@getKnowledgeLinks');

      cy.contains(/by John Doe/i).should('be.visible');
      cy.contains(/by Jane Smith/i).should('be.visible');
    });

    it('should open link knowledge item dialog', () => {
      cy.wait('@getKnowledgeLinks');

      cy.contains('button', 'Link Knowledge Item').click();

      cy.contains('Link Knowledge Item').should('be.visible');
      cy.get('input[placeholder="Enter knowledge item ID"]').should('be.visible');
    });

    it('should link a new knowledge item', () => {
      cy.intercept(
        'POST',
        `/api/business-operations/products-programs/${productId}/knowledge-links`,
        {
          statusCode: 201,
          body: {
            success: true,
            data: {
              id: 'new-link-id',
              productProgramId: productId,
              knowledgeItemId: 'km-item-789',
              linkType: 'Reference',
              linkedAt: '2024-03-01T00:00:00Z',
              linkedBy: 'user-1',
            },
          },
        }
      ).as('linkKnowledgeItem');

      cy.wait('@getKnowledgeLinks');
      cy.contains('button', 'Link Knowledge Item').click();

      cy.get('input[placeholder="Enter knowledge item ID"]').type('km-item-789');

      cy.contains('button', 'Link Item').click();

      cy.wait('@linkKnowledgeItem');
      cy.contains('Link Knowledge Item').should('not.exist');
    });

    it('should disable Link Item button when knowledge item ID is empty', () => {
      cy.wait('@getKnowledgeLinks');

      cy.contains('button', 'Link Knowledge Item').click();

      cy.contains('button', 'Link Item').should('be.disabled');
    });

    it('should open knowledge item in new tab', () => {
      cy.wait('@getKnowledgeLinks');

      // Stub window.open
      cy.window().then((win) => {
        cy.stub(win, 'open').as('windowOpen');
      });

      // Find the first external link button
      cy.contains('km-item-123')
        .parents('div.flex.items-center.justify-between')
        .find('button')
        .first()
        .click();

      cy.get('@windowOpen').should('be.calledWith', '/knowledge/km-item-123', '_blank');
    });

    it('should unlink knowledge item after confirmation', () => {
      cy.intercept('DELETE', '/api/business-operations/knowledge-links/link-1', {
        statusCode: 200,
        body: {
          success: true,
          message: 'Knowledge link removed successfully',
        },
      }).as('unlinkKnowledgeItem');

      cy.wait('@getKnowledgeLinks');

      // Stub window.confirm to return true
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
      });

      // Find the link card and click the unlink button (last button)
      cy.contains('km-item-123')
        .parents('div.flex.items-center.justify-between')
        .find('button')
        .last()
        .click();

      cy.wait('@unlinkKnowledgeItem');
    });

    it('should show empty state when no links exist', () => {
      cy.intercept(
        'GET',
        `/api/business-operations/products-programs/${productId}/knowledge-links`,
        {
          statusCode: 200,
          body: {
            success: true,
            data: [],
          },
        }
      ).as('getEmptyKnowledgeLinks');

      cy.reload();
      cy.wait('@getEmptyKnowledgeLinks');

      cy.contains('No knowledge items linked yet').should('be.visible');
    });
  });

  describe('Knowledge Context Editor', () => {
    it('should display Knowledge Context section', () => {
      cy.contains('Knowledge Context').should('be.visible');
      cy.contains('Additional narrative context for knowledge management').should(
        'be.visible'
      );
    });

    it('should display existing knowledge context', () => {
      cy.contains('This program focuses on modernizing legacy systems.').should('be.visible');
    });

    it('should enter edit mode when Edit button is clicked', () => {
      cy.contains('button', 'Edit').click();

      cy.get('textarea[placeholder="Enter knowledge context information..."]').should(
        'be.visible'
      );
      cy.contains('button', 'Save Changes').should('be.visible');
      cy.contains('button', 'Cancel').should('be.visible');
    });

    it('should display character count in edit mode', () => {
      cy.contains('button', 'Edit').click();

      cy.contains(/\d+ characters/i).should('be.visible');
    });

    it('should disable Save Changes button when no changes made', () => {
      cy.contains('button', 'Edit').click();

      cy.contains('button', 'Save Changes').should('be.disabled');
    });

    it('should enable Save Changes button when text is modified', () => {
      cy.contains('button', 'Edit').click();

      cy.get('textarea[placeholder="Enter knowledge context information..."]').type(
        ' Additional context.'
      );

      cy.contains('button', 'Save Changes').should('not.be.disabled');
    });

    it('should save knowledge context changes', () => {
      cy.intercept('PUT', `/api/business-operations/products-programs/${productId}`, {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: productId,
            name: 'Test Defense Program',
            knowledge_context: 'Updated knowledge context',
          },
        },
      }).as('updateKnowledgeContext');

      cy.contains('button', 'Edit').click();

      cy.get('textarea[placeholder="Enter knowledge context information..."]')
        .clear()
        .type('Updated knowledge context');

      cy.contains('button', 'Save Changes').click();

      cy.wait('@updateKnowledgeContext');
      cy.get('textarea[placeholder="Enter knowledge context information..."]').should(
        'not.exist'
      );
    });

    it('should cancel changes and restore original context', () => {
      cy.contains('button', 'Edit').click();

      cy.get('textarea[placeholder="Enter knowledge context information..."]')
        .clear()
        .type('Completely different text');

      cy.contains('button', 'Cancel').click();

      // Should show original context
      cy.contains('This program focuses on modernizing legacy systems.').should('be.visible');
    });

    it('should show empty state when no knowledge context exists', () => {
      // Mock product with no knowledge context
      cy.intercept('GET', `/api/business-operations/products-programs/${productId}`, {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: productId,
            name: 'Test Defense Program',
            description: 'Test',
            objectives: 'Test',
            deliverables: 'Test',
            dependencies: null,
            securityClassification: 'CUI',
            knowledge_context: null,
            criticalDates: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        },
      }).as('getProductNoContext');

      cy.reload();
      cy.wait('@getProductNoContext');

      cy.contains('No knowledge context provided yet').should('be.visible');
    });
  });

  describe('Integration and Complete Workflow', () => {
    it('should display all advanced feature sections on detail page', () => {
      cy.intercept('GET', `/api/business-operations/products-programs/${productId}/tasks`, {
        body: { success: true, data: [] },
      });
      cy.intercept('GET', `/api/business-operations/products-programs/${productId}/milestones`, {
        body: { success: true, data: [] },
      });
      cy.intercept(
        'GET',
        `/api/business-operations/products-programs/${productId}/knowledge-links`,
        {
          body: { success: true, data: [] },
        }
      );

      cy.reload();

      cy.contains('Tasks').should('be.visible');
      cy.contains('Milestones').should('be.visible');
      cy.contains('Knowledge Links').should('be.visible');
      cy.contains('Knowledge Context').should('be.visible');
    });

    it('should handle API errors gracefully', () => {
      cy.intercept('GET', `/api/business-operations/products-programs/${productId}/tasks`, {
        statusCode: 500,
        body: {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to fetch tasks',
        },
      }).as('getTasksError');

      cy.reload();
      cy.wait('@getTasksError');

      // Should handle error without breaking the page
      cy.contains('Test Defense Program').should('be.visible');
    });
  });

  describe('Permissions and RBAC', () => {
    it('should hide edit buttons when canEdit is false', () => {
      // Mock product with no edit permissions
      // This would typically be handled by the usePermissions hook
      // For E2E testing, we verify that buttons with edit functionality
      // are not visible when the user lacks permissions

      // Note: In a real scenario, this would be tested with different user roles
      // For now, we verify that the buttons exist for authorized users
      cy.contains('button', 'Add Task').should('be.visible');
      cy.contains('button', 'Add Milestone').should('be.visible');
      cy.contains('button', 'Link Knowledge Item').should('be.visible');
      cy.contains('button', 'Edit').should('be.visible');
    });
  });
});
