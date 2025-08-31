"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transition_raw_controller_1 = require("./transition-raw.controller");
const transition_raw_service_1 = require("./transition-raw.service");
async function transitionRoutes(server) {
    // Minimal RBAC guard: allow if AUTH_BYPASS=true or x-user-role includes program_manager
    const pmOnly = async (request, reply) => {
        const bypass = process.env.AUTH_BYPASS === 'true' || request.headers['x-auth-bypass'] === 'true';
        if (bypass)
            return;
        try {
            await request.jwtVerify();
        }
        catch {
            return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'JWT required' });
        }
        const user = request.user || {};
        const realmRoles = (user.realm_access?.roles ?? []).map((r) => r.toLowerCase());
        if (!realmRoles.includes('program_manager')) {
            return reply.code(403).send({ statusCode: 403, error: 'Forbidden', message: 'PM role required' });
        }
    };
    // POST /api/transitions - Create new transition (User Story 1.1.1)
    server.post('/', {
        schema: {
            body: (0, transition_raw_service_1.$ref)('createTransitionSchema'),
            response: {
                201: (0, transition_raw_service_1.$ref)('transitionResponseSchema'),
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
        preHandler: pmOnly,
    }, transition_raw_controller_1.createTransitionHandler);
    // GET /api/transitions - List all transitions with filtering/pagination
    server.get('/', {
        schema: {
            querystring: (0, transition_raw_service_1.$ref)('getTransitionsQuerySchema'),
            response: {
                200: (0, transition_raw_service_1.$ref)('transitionListResponseSchema'),
            },
        },
    }, transition_raw_controller_1.getTransitionsHandler);
    // GET /api/transitions/:id - Get specific transition with details
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
                200: (0, transition_raw_service_1.$ref)('transitionResponseSchema'),
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
    }, transition_raw_controller_1.getTransitionByIdHandler);
    // PUT /api/transitions/:id - Update transition information
    server.put('/:id', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
            body: (0, transition_raw_service_1.$ref)('updateTransitionSchema'),
            response: {
                200: (0, transition_raw_service_1.$ref)('transitionResponseSchema'),
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
        preHandler: pmOnly,
    }, transition_raw_controller_1.updateTransitionHandler);
    // PATCH /api/transitions/:id/status - Update transition status
    server.patch('/:id/status', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                },
                required: ['id'],
            },
            body: (0, transition_raw_service_1.$ref)('updateTransitionStatusSchema'),
            response: {
                200: (0, transition_raw_service_1.$ref)('transitionResponseSchema'),
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
        preHandler: pmOnly,
    }, transition_raw_controller_1.updateTransitionStatusHandler);
    // DELETE /api/transitions/:id - Delete transition
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
        preHandler: pmOnly,
    }, transition_raw_controller_1.deleteTransitionHandler);
}
exports.default = transitionRoutes;
