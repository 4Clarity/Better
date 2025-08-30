"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const business_operation_controller_1 = require("./business-operation.controller");
const errorSchema = {
    type: 'object',
    properties: {
        statusCode: { type: 'number' },
        error: { type: 'string' },
        message: { type: 'string' },
    },
};
const businessOperationResponseSchema = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        businessFunction: { type: 'string' },
        technicalDomain: { type: 'string' },
        description: { type: ['string', 'null'] },
        scope: { type: 'string' },
        objectives: { type: 'string' },
        performanceMetrics: { type: 'object' },
        supportPeriodStart: { type: 'string' },
        supportPeriodEnd: { type: 'string' },
        currentContractEnd: { type: 'string' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
    },
};
async function businessOperationRoutes(server) {
    // POST /api/business-operations - Create new business operation
    server.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['name', 'businessFunction', 'technicalDomain', 'scope', 'objectives', 'supportPeriodStart', 'supportPeriodEnd', 'currentContractEnd', 'governmentPMId', 'directorId'],
                properties: {
                    name: { type: 'string', minLength: 1, maxLength: 255 },
                    businessFunction: { type: 'string', minLength: 1, maxLength: 100 },
                    technicalDomain: { type: 'string', minLength: 1, maxLength: 100 },
                    description: { type: 'string' },
                    scope: { type: 'string', minLength: 1 },
                    objectives: { type: 'string', minLength: 1 },
                    performanceMetrics: {
                        type: 'object',
                        properties: {
                            operational: { type: 'array', items: { type: 'string' } },
                            quality: { type: 'array', items: { type: 'string' } },
                            compliance: { type: 'array', items: { type: 'string' } },
                        },
                    },
                    supportPeriodStart: { type: 'string', format: 'date' },
                    supportPeriodEnd: { type: 'string', format: 'date' },
                    currentContractEnd: { type: 'string', format: 'date' },
                    governmentPMId: { type: 'string' },
                    directorId: { type: 'string' },
                    currentManagerId: { type: 'string' },
                },
            },
            response: {
                201: businessOperationResponseSchema,
                400: errorSchema,
            },
        },
    }, business_operation_controller_1.createBusinessOperationHandler);
    // GET /api/business-operations - List all business operations
    server.get('/', {
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    search: { type: 'string' },
                    businessFunction: { type: 'string' },
                    technicalDomain: { type: 'string' },
                    page: { type: 'number', minimum: 1, default: 1 },
                    limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
                    sortBy: { type: 'string', enum: ['name', 'businessFunction', 'technicalDomain', 'currentContractEnd', 'createdAt'], default: 'createdAt' },
                    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: businessOperationResponseSchema,
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                page: { type: 'number' },
                                limit: { type: 'number' },
                                total: { type: 'number' },
                                totalPages: { type: 'number' },
                            },
                        },
                    },
                },
            },
        },
    }, business_operation_controller_1.getBusinessOperationsHandler);
    // GET /api/business-operations/:id - Get specific business operation
    server.get('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
            response: {
                200: businessOperationResponseSchema,
                404: errorSchema,
            },
        },
    }, business_operation_controller_1.getBusinessOperationByIdHandler);
    // PUT /api/business-operations/:id - Update business operation
    server.put('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string', minLength: 1, maxLength: 255 },
                    businessFunction: { type: 'string', minLength: 1, maxLength: 100 },
                    technicalDomain: { type: 'string', minLength: 1, maxLength: 100 },
                    description: { type: 'string' },
                    scope: { type: 'string', minLength: 1 },
                    objectives: { type: 'string', minLength: 1 },
                    performanceMetrics: {
                        type: 'object',
                        properties: {
                            operational: { type: 'array', items: { type: 'string' } },
                            quality: { type: 'array', items: { type: 'string' } },
                            compliance: { type: 'array', items: { type: 'string' } },
                        },
                    },
                    supportPeriodStart: { type: 'string', format: 'date' },
                    supportPeriodEnd: { type: 'string', format: 'date' },
                    currentContractEnd: { type: 'string', format: 'date' },
                    governmentPMId: { type: 'string' },
                    directorId: { type: 'string' },
                    currentManagerId: { type: 'string' },
                },
            },
            response: {
                200: businessOperationResponseSchema,
                400: errorSchema,
                404: errorSchema,
            },
        },
    }, business_operation_controller_1.updateBusinessOperationHandler);
    // DELETE /api/business-operations/:id - Delete business operation
    server.delete('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                    },
                },
                404: errorSchema,
                409: errorSchema,
            },
        },
    }, business_operation_controller_1.deleteBusinessOperationHandler);
}
exports.default = businessOperationRoutes;
