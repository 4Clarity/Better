"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transition_controller_1 = require("./transition.controller");
const transition_service_1 = require("./transition.service");
async function transitionRoutes(server) {
    // POST /api/transitions - Create new transition (User Story 1.1.1)
    server.post('/', {
        schema: {
            body: (0, transition_service_1.$ref)('createTransitionSchema'),
            response: {
                201: (0, transition_service_1.$ref)('transitionResponseSchema'),
                400: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'number' },
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
                409: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'number' },
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, transition_controller_1.createTransitionHandler);
    // GET /api/transitions - List all transitions with filtering/pagination (User Story 1.1.4)
    server.get('/', {
        schema: {
            querystring: (0, transition_service_1.$ref)('getTransitionsQuerySchema'),
            response: {
                200: (0, transition_service_1.$ref)('transitionListResponseSchema'),
            },
        },
    }, transition_controller_1.getTransitionsHandler);
    // GET /api/transitions/:id - Get specific transition with details (User Story 1.1.2)
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
                200: (0, transition_service_1.$ref)('transitionWithMilestonesSchema'),
                404: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'number' },
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, transition_controller_1.getTransitionByIdHandler);
    // PUT /api/transitions/:id - Update transition information (User Story 1.1.3)
    server.put('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
            body: (0, transition_service_1.$ref)('updateTransitionSchema'),
            response: {
                200: (0, transition_service_1.$ref)('transitionResponseSchema'),
                400: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'number' },
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
                404: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'number' },
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
                409: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'number' },
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, transition_controller_1.updateTransitionHandler);
    // PATCH /api/transitions/:id/status - Update transition status (User Story 1.3.1)
    server.patch('/:id/status', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
            body: (0, transition_service_1.$ref)('updateTransitionStatusSchema'),
            response: {
                200: (0, transition_service_1.$ref)('transitionResponseSchema'),
                404: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'number' },
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, transition_controller_1.updateTransitionStatusHandler);
    // DELETE /api/transitions/:id - Delete transition (Administrative)
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
                404: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'number' },
                        error: { type: 'string' },
                        message: { type: 'string' },
                    },
                },
            },
        },
    }, transition_controller_1.deleteTransitionHandler);
}
exports.default = transitionRoutes;
