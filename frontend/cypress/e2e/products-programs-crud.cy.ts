/**
 * E2E Tests for Story 4.1: Products/Programs CRUD
 * Tests complete CRUD workflows, RBAC, form validation, and UI interactions
 */

describe('Products/Programs CRUD', () => {
  beforeEach(() => {
    // Set auth bypass for testing
    cy.window().then((win) => {
      win.localStorage.setItem('authBypass', 'true');
    });

    // Visit the Products/Programs page
    cy.visit('/business-operations/products-programs');
  });

  describe('Page Navigation and Layout', () => {
    it('should display Products & Programs page with correct header', () => {
      cy.get('h2').should('contain', 'Products & Programs');
      cy.get('p').should('contain', 'Manage operational products and programs');
    });

    it('should show Create button for authorized users', () => {
      cy.get('button').contains('Create Product/Program').should('be.visible');
    });

    it('should display search and filter controls', () => {
      cy.get('input[placeholder*="Search"]').should('be.visible');
      cy.get('[role="combobox"]').should('be.visible'); // Security classification filter
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no products/programs exist', () => {
      // Intercept API to return empty list
      cy.intercept('GET', '/api/business-operations/products-programs*', {
        statusCode: 200,
        body: {
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            pages: 0,
          },
        },
      }).as('getEmptyList');

      cy.reload();
      cy.wait('@getEmptyList');

      cy.get('p').should('contain', 'No products or programs found');
      cy.get('p').should('contain', 'Click "Create Product/Program"');
    });
  });

  describe('Create Product/Program Workflow', () => {
    it('should navigate to create form when Create button is clicked', () => {
      cy.get('button').contains('Create Product/Program').click();
      cy.url().should('include', '/business-operations/products-programs/new');
    });

    it('should display create form with all required fields', () => {
      cy.visit('/business-operations/products-programs/new');

      // Check all form fields are present
      cy.get('input[name="name"]').should('be.visible');
      cy.get('textarea[name="description"]').should('be.visible');
      cy.get('textarea[name="objectives"]').should('be.visible');
      cy.get('textarea[name="deliverables"]').should('be.visible');
      cy.get('textarea[name="dependencies"]').should('be.visible');
      cy.get('[name="securityClassification"]').should('exist');

      // Check action buttons
      cy.get('button').contains('Cancel').should('be.visible');
      cy.get('button').contains('Create').should('be.visible');
    });

    it('should validate required fields on submission', () => {
      cy.visit('/business-operations/products-programs/new');

      // Try to submit empty form
      cy.get('button').contains('Create').click();

      // Should show validation errors
      cy.contains('required', { matchCase: false }).should('be.visible');
    });

    it('should enforce name max length (200 characters)', () => {
      cy.visit('/business-operations/products-programs/new');

      const longName = 'A'.repeat(201);
      cy.get('input[name="name"]').type(longName);
      cy.get('button').contains('Create').click();

      // Should show validation error
      cy.contains('200', { matchCase: false }).should('be.visible');
    });

    it('should create a Product/Program successfully with all fields', () => {
      cy.intercept('POST', '/api/business-operations/products-programs', {
        statusCode: 201,
        body: {
          success: true,
          data: {
            id: 'test-product-123',
            name: 'Test Defense Program',
            description: 'Comprehensive defense logistics modernization',
            objectives: 'Improve supply chain visibility and efficiency',
            deliverables: 'Cloud platform, Mobile app, ERP integration',
            dependencies: 'Enterprise Cloud Migration',
            securityClassification: 'CUI',
            criticalDates: [
              {
                date: '2025-12-15',
                description: 'Phase 1 deployment',
                type: 'milestone',
              },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'test-user-id',
            updatedBy: 'test-user-id',
          },
        },
      }).as('createProduct');

      cy.visit('/business-operations/products-programs/new');

      // Fill in all required fields
      cy.get('input[name="name"]').type('Test Defense Program');
      cy.get('textarea[name="description"]').type(
        'Comprehensive defense logistics modernization'
      );
      cy.get('textarea[name="objectives"]').type(
        'Improve supply chain visibility and efficiency'
      );
      cy.get('textarea[name="deliverables"]').type(
        'Cloud platform, Mobile app, ERP integration'
      );
      cy.get('textarea[name="dependencies"]').type('Enterprise Cloud Migration');

      // Select security classification
      cy.get('[role="combobox"]').first().click();
      cy.get('[role="option"]').contains('CUI').click();

      // Add a critical date
      cy.get('button').contains('Add Critical Date').click();
      cy.get('input[type="date"]').first().type('2025-12-15');
      cy.get('input[placeholder*="description"]').first().type('Phase 1 deployment');

      // Submit form
      cy.get('button').contains('Create').click();

      cy.wait('@createProduct');

      // Should show success message
      cy.contains('success', { matchCase: false }).should('be.visible');

      // Should redirect to list or detail page
      cy.url().should('not.include', '/new');
    });

    it('should handle API errors gracefully', () => {
      cy.intercept('POST', '/api/business-operations/products-programs', {
        statusCode: 400,
        body: {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Product/Program name already exists',
        },
      }).as('createError');

      cy.visit('/business-operations/products-programs/new');

      cy.get('input[name="name"]').type('Duplicate Name');
      cy.get('textarea[name="description"]').type('Test');
      cy.get('textarea[name="objectives"]').type('Test');
      cy.get('textarea[name="deliverables"]').type('Test');

      cy.get('button').contains('Create').click();

      cy.wait('@createError');

      // Should show error message
      cy.contains('already exists', { matchCase: false }).should('be.visible');
    });

    it('should cancel and return to list', () => {
      cy.visit('/business-operations/products-programs/new');

      cy.get('input[name="name"]').type('Test');

      cy.get('button').contains('Cancel').click();

      cy.url().should('include', '/business-operations/products-programs');
      cy.url().should('not.include', '/new');
    });
  });

  describe('List View and Filtering', () => {
    beforeEach(() => {
      // Mock product/program list data
      cy.intercept('GET', '/api/business-operations/products-programs*', {
        statusCode: 200,
        body: {
          success: true,
          data: [
            {
              id: 'product-1',
              name: 'Defense Logistics Modernization',
              description: 'Modernization of legacy logistics systems',
              objectives: 'Reduce processing time by 40%',
              deliverables: 'Cloud platform, Mobile app',
              dependencies: null,
              securityClassification: 'CUI',
              criticalDates: [
                { date: '2025-12-15', description: 'Phase 1', type: 'milestone' },
              ],
              createdAt: '2025-10-10T00:00:00Z',
              updatedAt: '2025-10-10T00:00:00Z',
              createdBy: 'user-1',
              updatedBy: 'user-1',
            },
            {
              id: 'product-2',
              name: 'Secure Communications',
              description: 'Encrypted communications upgrade',
              objectives: 'Deploy quantum-resistant encryption',
              deliverables: 'Hardware refresh, SDN implementation',
              dependencies: 'NSA coordination',
              securityClassification: 'SECRET',
              criticalDates: [],
              createdAt: '2025-10-09T00:00:00Z',
              updatedAt: '2025-10-09T00:00:00Z',
              createdBy: 'user-1',
              updatedBy: 'user-1',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            pages: 1,
          },
        },
      }).as('getProductList');

      cy.reload();
      cy.wait('@getProductList');
    });

    it('should display list of products/programs', () => {
      cy.contains('Defense Logistics Modernization').should('be.visible');
      cy.contains('Secure Communications').should('be.visible');
    });

    it('should display security classification badges with correct colors', () => {
      // CUI should be yellow
      cy.contains('CUI').should('have.class', 'bg-yellow-100');

      // SECRET should be orange
      cy.contains('SECRET').should('have.class', 'bg-orange-100');
    });

    it('should filter by search term', () => {
      cy.get('input[placeholder*="Search"]').type('Logistics');

      // Should trigger search
      cy.intercept('GET', '/api/business-operations/products-programs*search=Logistics*').as(
        'searchProducts'
      );

      cy.wait('@searchProducts');
    });

    it('should filter by security classification', () => {
      cy.get('[role="combobox"]').click();
      cy.get('[role="option"]').contains('Secret').click();

      cy.intercept(
        'GET',
        '/api/business-operations/products-programs*securityClassification=SECRET*'
      ).as('filterBySecurity');

      cy.wait('@filterBySecurity');
    });

    it('should navigate to detail page when card is clicked', () => {
      cy.contains('Defense Logistics Modernization').click();

      cy.url().should('include', '/business-operations/products-programs/product-1');
    });
  });

  describe('Detail View', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/business-operations/products-programs/product-1', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'product-1',
            name: 'Defense Logistics Modernization',
            description: 'Modernization of legacy logistics systems to improve supply chain visibility',
            objectives: 'Reduce logistics processing time by 40%, improve inventory accuracy to 99%',
            deliverables: 'Cloud-based logistics platform, Mobile inventory management app, ERP integration, Training materials',
            dependencies: 'Dependent on Enterprise Cloud Migration Program',
            securityClassification: 'CUI',
            criticalDates: [
              { date: '2025-12-15', description: 'Phase 1 deployment', type: 'milestone' },
              { date: '2026-03-31', description: 'Full operational capability', type: 'deadline' },
            ],
            createdAt: '2025-10-10T00:00:00Z',
            updatedAt: '2025-10-10T00:00:00Z',
            createdBy: 'user-1',
            updatedBy: 'user-1',
            createdByUser: {
              id: 'user-1',
              email: 'admin@example.com',
              firstName: 'Admin',
              lastName: 'User',
            },
            updatedByUser: {
              id: 'user-1',
              email: 'admin@example.com',
              firstName: 'Admin',
              lastName: 'User',
            },
          },
        },
      }).as('getProductDetail');

      cy.visit('/business-operations/products-programs/product-1');
      cy.wait('@getProductDetail');
    });

    it('should display all product/program details', () => {
      cy.contains('Defense Logistics Modernization').should('be.visible');
      cy.contains('Modernization of legacy logistics systems').should('be.visible');
      cy.contains('Reduce logistics processing time').should('be.visible');
      cy.contains('Cloud-based logistics platform').should('be.visible');
      cy.contains('Enterprise Cloud Migration').should('be.visible');
    });

    it('should display security classification badge', () => {
      cy.contains('CUI').should('be.visible');
    });

    it('should display critical dates', () => {
      cy.contains('Phase 1 deployment').should('be.visible');
      cy.contains('2025-12-15').should('be.visible');
      cy.contains('Full operational capability').should('be.visible');
    });

    it('should show Edit button for authorized users', () => {
      cy.get('button').contains('Edit').should('be.visible');
    });

    it('should show Delete button for authorized users', () => {
      cy.get('button').contains('Delete').should('be.visible');
    });

    it('should navigate to edit form when Edit button is clicked', () => {
      cy.get('button').contains('Edit').click();
      cy.url().should('include', '/business-operations/products-programs/product-1/edit');
    });

    it('should have back navigation to list', () => {
      cy.get('a').contains('Products & Programs').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/business-operations/products-programs');
    });
  });

  describe('Edit Product/Program Workflow', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/business-operations/products-programs/product-1', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'product-1',
            name: 'Defense Logistics Modernization',
            description: 'Modernization of legacy logistics systems',
            objectives: 'Reduce processing time',
            deliverables: 'Cloud platform',
            dependencies: 'Cloud Migration',
            securityClassification: 'CUI',
            criticalDates: [],
            createdAt: '2025-10-10T00:00:00Z',
            updatedAt: '2025-10-10T00:00:00Z',
            createdBy: 'user-1',
            updatedBy: 'user-1',
          },
        },
      }).as('getProduct');

      cy.visit('/business-operations/products-programs/product-1/edit');
      cy.wait('@getProduct');
    });

    it('should pre-fill form with existing data', () => {
      cy.get('input[name="name"]').should('have.value', 'Defense Logistics Modernization');
      cy.get('textarea[name="description"]').should(
        'contain.value',
        'Modernization of legacy logistics systems'
      );
      cy.get('textarea[name="objectives"]').should('contain.value', 'Reduce processing time');
    });

    it('should update Product/Program successfully', () => {
      cy.intercept('PUT', '/api/business-operations/products-programs/product-1', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'product-1',
            name: 'Updated Defense Logistics',
            description: 'Updated description',
            objectives: 'Updated objectives',
            deliverables: 'Updated deliverables',
            dependencies: 'Updated dependencies',
            securityClassification: 'SECRET',
            criticalDates: [],
            createdAt: '2025-10-10T00:00:00Z',
            updatedAt: new Date().toISOString(),
            createdBy: 'user-1',
            updatedBy: 'user-1',
          },
        },
      }).as('updateProduct');

      cy.get('input[name="name"]').clear().type('Updated Defense Logistics');
      cy.get('textarea[name="objectives"]').clear().type('Updated objectives');

      cy.get('button').contains('Save').click();

      cy.wait('@updateProduct');

      // Should show success message
      cy.contains('success', { matchCase: false }).should('be.visible');
    });

    it('should handle update errors gracefully', () => {
      cy.intercept('PUT', '/api/business-operations/products-programs/product-1', {
        statusCode: 404,
        body: {
          statusCode: 404,
          error: 'Not Found',
          message: 'Product/Program not found',
        },
      }).as('updateError');

      cy.get('input[name="name"]').clear().type('Updated Name');
      cy.get('button').contains('Save').click();

      cy.wait('@updateError');

      cy.contains('not found', { matchCase: false }).should('be.visible');
    });
  });

  describe('Delete Product/Program Workflow', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/business-operations/products-programs/product-1', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: 'product-1',
            name: 'Test Product to Delete',
            description: 'This will be deleted',
            objectives: 'Test',
            deliverables: 'Test',
            dependencies: null,
            securityClassification: 'UNCLASSIFIED',
            criticalDates: [],
            createdAt: '2025-10-10T00:00:00Z',
            updatedAt: '2025-10-10T00:00:00Z',
            createdBy: 'user-1',
            updatedBy: 'user-1',
          },
        },
      }).as('getProduct');

      cy.visit('/business-operations/products-programs/product-1');
      cy.wait('@getProduct');
    });

    it('should show confirmation dialog before deleting', () => {
      cy.get('button').contains('Delete').click();

      // Should show confirmation dialog
      cy.get('[role="dialog"]').should('be.visible');
      cy.get('[role="dialog"]').should('contain', 'confirm');
    });

    it('should delete Product/Program on confirmation', () => {
      cy.intercept('DELETE', '/api/business-operations/products-programs/product-1', {
        statusCode: 200,
        body: {
          success: true,
          message: 'Product/Program deleted successfully',
        },
      }).as('deleteProduct');

      cy.get('button').contains('Delete').click();

      // Confirm deletion in dialog
      cy.get('[role="dialog"]').within(() => {
        cy.get('button').contains('Delete').click();
      });

      cy.wait('@deleteProduct');

      // Should redirect to list
      cy.url().should('include', '/business-operations/products-programs');
      cy.url().should('not.include', 'product-1');

      // Should show success message
      cy.contains('success', { matchCase: false }).should('be.visible');
    });

    it('should cancel deletion when Cancel is clicked', () => {
      cy.get('button').contains('Delete').click();

      cy.get('[role="dialog"]').within(() => {
        cy.get('button').contains('Cancel').click();
      });

      // Dialog should close
      cy.get('[role="dialog"]').should('not.exist');

      // Should remain on detail page
      cy.url().should('include', 'product-1');
    });

    it('should handle delete errors gracefully', () => {
      cy.intercept('DELETE', '/api/business-operations/products-programs/product-1', {
        statusCode: 500,
        body: {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to delete product/program',
        },
      }).as('deleteError');

      cy.get('button').contains('Delete').click();

      cy.get('[role="dialog"]').within(() => {
        cy.get('button').contains('Delete').click();
      });

      cy.wait('@deleteError');

      // Should show error message
      cy.contains('Failed to delete', { matchCase: false }).should('be.visible');
    });
  });

  describe('Pagination', () => {
    it('should paginate results when more than 20 items', () => {
      const products = Array.from({ length: 25 }, (_, i) => ({
        id: `product-${i}`,
        name: `Product ${i}`,
        description: 'Test',
        objectives: 'Test',
        deliverables: 'Test',
        dependencies: null,
        securityClassification: 'UNCLASSIFIED',
        criticalDates: [],
        createdAt: '2025-10-10T00:00:00Z',
        updatedAt: '2025-10-10T00:00:00Z',
        createdBy: 'user-1',
        updatedBy: 'user-1',
      }));

      cy.intercept('GET', '/api/business-operations/products-programs*page=1*', {
        statusCode: 200,
        body: {
          success: true,
          data: products.slice(0, 20),
          pagination: {
            page: 1,
            limit: 20,
            total: 25,
            pages: 2,
          },
        },
      }).as('getPage1');

      cy.reload();
      cy.wait('@getPage1');

      // Should show pagination controls
      cy.contains('Page 1 of 2').should('be.visible');
      cy.get('button').contains('Next').should('be.visible');
      cy.get('button').contains('Previous').should('be.disabled');

      // Go to next page
      cy.intercept('GET', '/api/business-operations/products-programs*page=2*', {
        statusCode: 200,
        body: {
          success: true,
          data: products.slice(20, 25),
          pagination: {
            page: 2,
            limit: 20,
            total: 25,
            pages: 2,
          },
        },
      }).as('getPage2');

      cy.get('button').contains('Next').click();
      cy.wait('@getPage2');

      cy.contains('Page 2 of 2').should('be.visible');
      cy.get('button').contains('Next').should('be.disabled');
      cy.get('button').contains('Previous').should('be.visible');
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state while fetching data', () => {
      cy.intercept('GET', '/api/business-operations/products-programs*', (req) => {
        req.reply((res) => {
          res.delay = 1000; // Delay response
          res.send({
            statusCode: 200,
            body: {
              success: true,
              data: [],
              pagination: { page: 1, limit: 20, total: 0, pages: 0 },
            },
          });
        });
      }).as('slowLoad');

      cy.reload();

      cy.contains('Loading', { matchCase: false }).should('be.visible');
    });

    it('should show error state on API failure', () => {
      cy.intercept('GET', '/api/business-operations/products-programs*', {
        statusCode: 500,
        body: {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to fetch products/programs',
        },
      }).as('fetchError');

      cy.reload();
      cy.wait('@fetchError');

      cy.contains('Error', { matchCase: false }).should('be.visible');
      cy.contains('Failed to fetch', { matchCase: false }).should('be.visible');
    });
  });

  describe('Security Classification Colors', () => {
    beforeEach(() => {
      const products = [
        { securityClassification: 'UNCLASSIFIED', name: 'Unclassified Product' },
        { securityClassification: 'CUI', name: 'CUI Product' },
        { securityClassification: 'SECRET', name: 'Secret Product' },
        { securityClassification: 'TOP_SECRET', name: 'Top Secret Product' },
      ].map((p, i) => ({
        id: `product-${i}`,
        ...p,
        description: 'Test',
        objectives: 'Test',
        deliverables: 'Test',
        dependencies: null,
        criticalDates: [],
        createdAt: '2025-10-10T00:00:00Z',
        updatedAt: '2025-10-10T00:00:00Z',
        createdBy: 'user-1',
        updatedBy: 'user-1',
      }));

      cy.intercept('GET', '/api/business-operations/products-programs*', {
        statusCode: 200,
        body: {
          success: true,
          data: products,
          pagination: { page: 1, limit: 20, total: 4, pages: 1 },
        },
      }).as('getProducts');

      cy.reload();
      cy.wait('@getProducts');
    });

    it('should display UNCLASSIFIED with green badge', () => {
      cy.contains('UNCLASSIFIED').should('have.class', 'bg-green-100');
    });

    it('should display CUI with yellow badge', () => {
      cy.contains('CUI').should('have.class', 'bg-yellow-100');
    });

    it('should display SECRET with orange badge', () => {
      cy.contains('SECRET').should('have.class', 'bg-orange-100');
    });

    it('should display TOP_SECRET with red badge', () => {
      cy.contains('TOP SECRET').should('have.class', 'bg-red-100');
    });
  });
});
