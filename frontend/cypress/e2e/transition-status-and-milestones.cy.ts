describe('Transition status and milestones', () => {
  it('updates transition status from Project Hub', () => {
    const transition = {
      id: 'tr_1',
      contractName: 'Aegis Support',
      contractNumber: 'CN-2025-0042',
      startDate: '2025-09-01T00:00:00.000Z',
      endDate: '2026-09-01T00:00:00.000Z',
      status: 'NOT_STARTED',
      createdAt: '2025-08-30T12:00:00.000Z',
      updatedAt: '2025-08-30T12:00:00.000Z',
    };

    cy.intercept('GET', '/api/transitions', {
      body: { data: [transition], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
    }).as('getTransitions');

    cy.intercept('GET', `/api/transitions/${transition.id}`, { body: transition }).as('getTransition');

    cy.visit('/');
    cy.wait('@getTransitions');

    // Open Project Hub
    cy.contains(transition.contractName).click();
    cy.wait('@getTransition');

    // Intercept status update
    cy.intercept('PATCH', `/api/transitions/${transition.id}/status`, (req) => {
      expect(req.body).to.have.property('status', 'ON_TRACK');
      req.reply({
        ...transition,
        status: 'ON_TRACK',
        updatedAt: new Date().toISOString(),
      });
    }).as('patchStatus');

    // Change status via Select
    cy.contains('Update Status');
    cy.get('[role="combobox"]').click();
    cy.contains('On Track').click();
    cy.wait('@patchStatus');
    cy.contains('On Track');
  });

  it.skip('adds and deletes a milestone (covered in project_hub_milestones_crud)', () => {
    const transitionId = 'tr_1';
    cy.intercept('GET', '/api/transitions', {
      body: { data: [{
        id: transitionId,
        contractName: 'Aegis Support',
        contractNumber: 'CN-2025-0042',
        startDate: '2025-09-01T00:00:00.000Z',
        endDate: '2026-09-01T00:00:00.000Z',
        status: 'NOT_STARTED',
        createdAt: '2025-08-30T12:00:00.000Z',
        updatedAt: '2025-08-30T12:00:00.000Z',
      }], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } },
    }).as('getTransitions2');
    cy.intercept('GET', `/api/transitions/${transitionId}`, { body: {
      id: transitionId,
      contractName: 'Aegis Support', contractNumber: 'CN-2025-0042',
      startDate: '2025-09-01T00:00:00.000Z', endDate: '2026-09-01T00:00:00.000Z',
      status: 'NOT_STARTED', createdAt: '2025-08-30T12:00:00.000Z', updatedAt: '2025-08-30T12:00:00.000Z',
    } }).as('getTransition2');

    cy.intercept('GET', `/api/transitions/${transitionId}/milestones*`, { body: { data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } } }).as('getMilestones');
    cy.intercept('POST', `/api/transitions/${transitionId}/milestones`, (req) => {
      expect(req.body).to.have.property('title');
      expect(req.body).to.have.property('dueDate');
      req.reply({
        id: 'ms_1', title: req.body.title, description: null,
        dueDate: req.body.dueDate, priority: 'MEDIUM', status: 'PENDING',
        transitionId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      });
    }).as('postMilestone');

    cy.visit('/');
    cy.wait('@getTransitions2');
    cy.contains('Aegis Support').click();
    cy.wait(['@getTransition2', '@getMilestones']);

    // Open Add Milestone dialog and submit with testids
    cy.get('[data-testid="milestones-add-btn"]').should('be.visible').click();
    cy.get('[data-testid="milestone-title"]').should('be.visible').type('Kickoff');
    cy.get('[data-testid="milestone-date"]').type('2025-09-05');
    cy.get('[data-testid="milestone-create"]').should('be.enabled').click();
    cy.wait('@postMilestone');

    cy.intercept('GET', `/api/transitions/${transitionId}/milestones*`, { body: { data: [{
      id: 'ms_1', title: 'Kickoff', description: null, dueDate: '2025-09-05T00:00:00.000Z', priority: 'MEDIUM', status: 'PENDING', transitionId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    }], pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } } }).as('getMilestones2');
    cy.wait('@getMilestones2');
    cy.contains('Kickoff');

    cy.intercept('DELETE', `/api/transitions/${transitionId}/milestones/ms_1`, { body: { message: 'ok' } }).as('deleteMilestone');
    cy.contains('Delete').click();
  });
});
