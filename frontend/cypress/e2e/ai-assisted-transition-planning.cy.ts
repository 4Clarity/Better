/**
 * E2E Tests for Story 1.4: AI-Assisted Transition Planning
 *
 * Tests the complete workflow of using the AI Planning Assistant to create
 * intelligent task and milestone recommendations for transitions.
 */

describe('AI-Assisted Transition Planning', () => {
  beforeEach(() => {
    // Navigate to the application
    cy.visit('http://tip.localhost');

    // Wait for the application to load
    cy.wait(1000);
  });

  describe('AI Planning Toggle and Integration', () => {
    it('should display AI Planning toggle in Create Transition dialog', () => {
      // Navigate to Products & Programs
      cy.contains('Products & Programs').click();
      cy.wait(500);

      // Click Create Transition button (may vary based on UI)
      cy.contains('Create Transition').click();

      // Verify AI Planning toggle is present
      cy.contains('Use AI Planning Assistant').should('be.visible');
      cy.get('[role="switch"]').should('exist');
    });

    it('should toggle AI Planning switch on and off', () => {
      cy.contains('Products & Programs').click();
      cy.wait(500);
      cy.contains('Create Transition').click();

      // Get the switch and verify initial state (unchecked)
      cy.get('[role="switch"]').should('have.attr', 'data-state', 'unchecked');

      // Toggle on
      cy.get('[role="switch"]').click();
      cy.get('[role="switch"]').should('have.attr', 'data-state', 'checked');

      // Toggle off
      cy.get('[role="switch"]').click();
      cy.get('[role="switch"]').should('have.attr', 'data-state', 'unchecked');
    });

    it('should change submit button text when AI Planning is enabled', () => {
      cy.contains('Products & Programs').click();
      cy.wait(500);
      cy.contains('Create Transition').click();

      // Default button text
      cy.contains('button', 'Create Transition').should('be.visible');

      // Enable AI Planning
      cy.get('[role="switch"]').click();

      // Button text should change
      cy.contains('button', 'Create & Plan with AI').should('be.visible');
    });
  });

  describe('AI Planning Wizard - Contract Transition', () => {
    beforeEach(() => {
      // Intercept API calls
      cy.intercept('POST', '**/api/transitions', {
        statusCode: 201,
        body: {
          id: 'test-transition-123',
          name: 'Test Contract Transition',
          transitionType: 'Contract',
          aiPlanningEnabled: true
        }
      }).as('createTransition');

      cy.intercept('POST', '**/api/ai-planning/start', {
        statusCode: 200,
        body: {
          session_id: 'test-session-456',
          transition_id: 'test-transition-123',
          transition_type: 'Contract',
          status: 'started',
          current_step: 0,
          questions_asked: [
            {
              question_id: 'contract_type',
              text: 'What type of contract is this?',
              question_type: 'select',
              options: ['New Contract Award', 'Contract Renewal', 'Contract Closeout'],
              required: true,
              help_text: 'This helps determine the appropriate transition activities'
            },
            {
              question_id: 'contract_value',
              text: 'What is the estimated contract value?',
              question_type: 'select',
              options: ['Under $100K', '$100K-$1M', '$1M-$10M', 'Over $10M'],
              required: true
            },
            {
              question_id: 'timeline_weeks',
              text: 'How many weeks until the transition must be complete?',
              question_type: 'number',
              required: true,
              help_text: 'We\'ll use this to schedule tasks and milestones'
            }
          ],
          responses_collected: []
        }
      }).as('startSession');

      cy.intercept('POST', '**/api/ai-planning/sessions/*/responses', {
        statusCode: 200,
        body: {
          session_id: 'test-session-456',
          status: 'responses_collected',
          responses_count: 3
        }
      }).as('submitResponses');

      cy.intercept('POST', '**/api/ai-planning/sessions/*/generate', {
        statusCode: 200,
        body: {
          session_id: 'test-session-456',
          tasks: [
            {
              title: 'Initial Contract Review',
              description: 'Review contract terms, deliverables, and requirements',
              priority: 'High',
              assigned_role: 'Program Manager',
              estimated_hours: 8,
              days_from_start: 0,
              duration_days: 2,
              tags: ['planning', 'contract']
            },
            {
              title: 'Stakeholder Kickoff Meeting',
              description: 'Conduct kickoff meeting with all stakeholders',
              priority: 'High',
              assigned_role: 'Program Manager',
              estimated_hours: 4,
              days_from_start: 2,
              duration_days: 1,
              dependencies: ['Initial Contract Review'],
              tags: ['communication', 'stakeholders']
            }
          ],
          milestones: [
            {
              title: 'Planning Complete',
              description: 'Initial planning and preparation phase complete',
              days_from_start: 10,
              priority: 'High',
              assigned_role: 'Program Manager',
              success_criteria: ['All stakeholders identified', 'Timeline confirmed']
            }
          ]
        }
      }).as('generateRecommendations');

      cy.intercept('POST', '**/api/ai-planning/sessions/*/accept', {
        statusCode: 200,
        body: {
          session_id: 'test-session-456',
          status: 'completed',
          tasks_created: 2,
          milestones_created: 1
        }
      }).as('acceptRecommendations');
    });

    it('should complete full AI Planning Wizard workflow', () => {
      // Navigate to Products & Programs
      cy.contains('Products & Programs').click();
      cy.wait(500);

      // Open Create Transition dialog
      cy.contains('Create Transition').click();

      // Enable AI Planning
      cy.get('[role="switch"]').click();

      // Fill in basic transition details
      cy.get('input[name="name"]').type('Test Contract Transition');
      cy.get('select[name="transitionType"]').select('Contract');

      // Submit to start wizard
      cy.contains('button', 'Create & Plan with AI').click();
      cy.wait('@createTransition');
      cy.wait('@startSession');

      // Step 0: Welcome Screen
      cy.contains('Welcome to AI Planning Assistant').should('be.visible');
      cy.contains('button', 'Start Planning').click();

      // Step 1: Answer Questions
      cy.contains('Planning Questions').should('be.visible');

      // Answer contract_type question
      cy.get('[data-question-id="contract_type"]').within(() => {
        cy.get('select').select('New Contract Award');
      });

      // Answer contract_value question
      cy.get('[data-question-id="contract_value"]').within(() => {
        cy.get('select').select('$1M-$10M');
      });

      // Answer timeline_weeks question
      cy.get('[data-question-id="timeline_weeks"]').within(() => {
        cy.get('input[type="number"]').type('12');
      });

      // Submit responses
      cy.contains('button', 'Generate Recommendations').click();
      cy.wait('@submitResponses');
      cy.wait('@generateRecommendations');

      // Step 2: Review Recommendations
      cy.contains('Review AI Recommendations').should('be.visible');

      // Verify tasks are displayed
      cy.contains('Initial Contract Review').should('be.visible');
      cy.contains('Stakeholder Kickoff Meeting').should('be.visible');

      // Verify task details
      cy.contains('Initial Contract Review').parent().within(() => {
        cy.contains('High').should('be.visible');
        cy.contains('Program Manager').should('be.visible');
        cy.contains('8 hours').should('be.visible');
      });

      // Switch to milestones tab
      cy.contains('Milestones').click();
      cy.contains('Planning Complete').should('be.visible');

      // Select all tasks and milestones (should be selected by default)
      cy.contains('button', 'Accept Selected').click();
      cy.wait('@acceptRecommendations');

      // Step 3: Completion
      cy.contains('Planning Complete!').should('be.visible');
      cy.contains('2 tasks created').should('be.visible');
      cy.contains('1 milestone created').should('be.visible');

      // Finish wizard
      cy.contains('button', 'Done').click();

      // Should return to Products & Programs view
      cy.contains('Test Contract Transition').should('be.visible');
    });

    it('should allow editing task recommendations before accepting', () => {
      // Start wizard flow (abbreviated)
      cy.contains('Products & Programs').click();
      cy.wait(500);
      cy.contains('Create Transition').click();
      cy.get('[role="switch"]').click();
      cy.get('input[name="name"]').type('Test Transition');
      cy.contains('button', 'Create & Plan with AI').click();
      cy.wait('@createTransition');
      cy.wait('@startSession');

      // Skip to recommendations step
      cy.contains('button', 'Start Planning').click();
      // Fill questions quickly
      cy.get('select').first().select(1);
      cy.get('select').eq(1).select(1);
      cy.get('input[type="number"]').type('12');
      cy.contains('button', 'Generate Recommendations').click();
      cy.wait('@submitResponses');
      cy.wait('@generateRecommendations');

      // Edit a task
      cy.contains('Initial Contract Review').parent().within(() => {
        cy.contains('button', 'Edit').click();
      });

      // Modify task details
      cy.get('input[name="title"]').clear().type('Updated Contract Review');
      cy.get('textarea[name="description"]').clear().type('Updated description');
      cy.contains('button', 'Save Changes').click();

      // Verify changes
      cy.contains('Updated Contract Review').should('be.visible');
      cy.contains('Updated description').should('be.visible');
    });

    it('should allow deselecting tasks/milestones', () => {
      // Start wizard and get to recommendations
      cy.contains('Products & Programs').click();
      cy.wait(500);
      cy.contains('Create Transition').click();
      cy.get('[role="switch"]').click();
      cy.get('input[name="name"]').type('Test Transition');
      cy.contains('button', 'Create & Plan with AI').click();
      cy.wait('@createTransition');
      cy.wait('@startSession');
      cy.contains('button', 'Start Planning').click();
      cy.get('select').first().select(1);
      cy.get('select').eq(1).select(1);
      cy.get('input[type="number"]').type('12');
      cy.contains('button', 'Generate Recommendations').click();
      cy.wait('@submitResponses');
      cy.wait('@generateRecommendations');

      // Verify counter shows all selected
      cy.contains('Tasks (2/2)').should('be.visible');

      // Deselect one task
      cy.contains('Initial Contract Review').parent().within(() => {
        cy.get('[type="checkbox"]').click();
      });

      // Verify counter updated
      cy.contains('Tasks (1/2)').should('be.visible');

      // Verify only selected tasks will be created
      cy.contains('button', 'Accept Selected').click();
      cy.wait('@acceptRecommendations');

      // Should show only 1 task created
      cy.contains('1 task created').should('be.visible');
    });
  });

  describe('AI Planning Wizard - Personnel Transition', () => {
    it('should generate personnel-specific questions', () => {
      cy.intercept('POST', '**/api/ai-planning/start', {
        statusCode: 200,
        body: {
          session_id: 'test-session-personnel',
          transition_type: 'Personnel',
          questions_asked: [
            {
              question_id: 'transition_reason',
              text: 'What is the reason for this personnel transition?',
              question_type: 'select',
              options: ['Retirement', 'Resignation', 'Promotion', 'New Hire'],
              required: true
            },
            {
              question_id: 'role_criticality',
              text: 'How critical is this role to operations?',
              question_type: 'select',
              options: ['Low', 'Medium', 'High', 'Mission Critical'],
              required: true
            }
          ]
        }
      }).as('startPersonnelSession');

      cy.contains('Products & Programs').click();
      cy.wait(500);
      cy.contains('Create Transition').click();
      cy.get('[role="switch"]').click();
      cy.get('select[name="transitionType"]').select('Personnel');
      cy.contains('button', 'Create & Plan with AI').click();
      cy.wait('@startPersonnelSession');

      // Verify personnel-specific questions appear
      cy.contains('What is the reason for this personnel transition?').should('be.visible');
      cy.contains('How critical is this role to operations?').should('be.visible');
    });
  });

  describe('AI Planning Wizard - System Transition', () => {
    it('should generate system-specific questions', () => {
      cy.intercept('POST', '**/api/ai-planning/start', {
        statusCode: 200,
        body: {
          session_id: 'test-session-system',
          transition_type: 'System',
          questions_asked: [
            {
              question_id: 'transition_type',
              text: 'What type of system transition is this?',
              question_type: 'select',
              options: ['Migration', 'Upgrade', 'Decommission', 'New Implementation'],
              required: true
            },
            {
              question_id: 'user_count',
              text: 'Approximately how many users does this system have?',
              question_type: 'number',
              required: true
            }
          ]
        }
      }).as('startSystemSession');

      cy.contains('Products & Programs').click();
      cy.wait(500);
      cy.contains('Create Transition').click();
      cy.get('[role="switch"]').click();
      cy.get('select[name="transitionType"]').select('System');
      cy.contains('button', 'Create & Plan with AI').click();
      cy.wait('@startSystemSession');

      // Verify system-specific questions appear
      cy.contains('What type of system transition is this?').should('be.visible');
      cy.contains('Approximately how many users does this system have?').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle AI service unavailable gracefully', () => {
      cy.intercept('POST', '**/api/ai-planning/start', {
        statusCode: 503,
        body: { error: 'AI Service Unavailable' }
      }).as('startSessionError');

      cy.contains('Products & Programs').click();
      cy.wait(500);
      cy.contains('Create Transition').click();
      cy.get('[role="switch"]').click();
      cy.contains('button', 'Create & Plan with AI').click();
      cy.wait('@startSessionError');

      // Should show error message
      cy.contains('AI Service is currently unavailable').should('be.visible');

      // Should offer fallback option
      cy.contains('Create transition without AI planning').should('be.visible');
    });

    it('should validate required questions before proceeding', () => {
      cy.intercept('POST', '**/api/ai-planning/start', {
        statusCode: 200,
        body: {
          session_id: 'test-session-validation',
          questions_asked: [
            {
              question_id: 'required_question',
              text: 'This is a required question',
              question_type: 'text',
              required: true
            }
          ]
        }
      }).as('startSession');

      cy.contains('Products & Programs').click();
      cy.wait(500);
      cy.contains('Create Transition').click();
      cy.get('[role="switch"]').click();
      cy.contains('button', 'Create & Plan with AI').click();
      cy.wait('@startSession');
      cy.contains('button', 'Start Planning').click();

      // Try to submit without answering required question
      cy.contains('button', 'Generate Recommendations').click();

      // Should show validation error
      cy.contains('Please answer all required questions').should('be.visible');

      // Button should be disabled or error should prevent submission
      cy.get('@submitResponses.all').should('have.length', 0);
    });

    it('should allow canceling the wizard at any step', () => {
      cy.intercept('POST', '**/api/ai-planning/start').as('startSession');

      cy.contains('Products & Programs').click();
      cy.wait(500);
      cy.contains('Create Transition').click();
      cy.get('[role="switch"]').click();
      cy.contains('button', 'Create & Plan with AI').click();
      cy.wait('@startSession');

      // Cancel from welcome screen
      cy.contains('button', 'Cancel').click();

      // Should show confirmation dialog
      cy.contains('Are you sure you want to cancel?').should('be.visible');
      cy.contains('button', 'Yes, Cancel').click();

      // Should return to products & programs
      cy.url().should('include', '/products-programs');
    });
  });

  describe('Progress Tracking', () => {
    it('should display progress indicator throughout wizard', () => {
      cy.intercept('POST', '**/api/ai-planning/start').as('startSession');

      cy.contains('Products & Programs').click();
      cy.wait(500);
      cy.contains('Create Transition').click();
      cy.get('[role="switch"]').click();
      cy.contains('button', 'Create & Plan with AI').click();
      cy.wait('@startSession');

      // Step 0: Progress should be 0%
      cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '0');

      cy.contains('button', 'Start Planning').click();

      // Step 1: Progress should be ~33%
      cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '33');

      // Fill questions and proceed
      cy.get('select').first().select(1);
      cy.contains('button', 'Generate Recommendations').click();

      // Step 2: Progress should be ~66%
      cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '66');

      cy.contains('button', 'Accept Selected').click();

      // Step 3: Progress should be 100%
      cy.get('[role="progressbar"]').should('have.attr', 'aria-valuenow', '100');
    });
  });
});
