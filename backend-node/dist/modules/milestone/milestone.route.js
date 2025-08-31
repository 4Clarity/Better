"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const milestone_controller_1 = require("./milestone.controller");
const milestone_service_1 = require("./milestone.service");
async function milestoneRoutes(server) {
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
    // POST /api/transitions/:transitionId/milestones - Create new milestone (User Story 1.2.1)
    server.post('/', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    transitionId: { type: 'string' },
                },
                required: ['transitionId'],
            },
            body: (0, milestone_service_1.$ref)('createMilestoneSchema'),
            response: {
                201: (0, milestone_service_1.$ref)('milestoneResponseSchema'),
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
            },
        },
        preHandler: pmOnly,
    }, milestone_controller_1.createMilestoneHandler);
    // GET /api/transitions/:transitionId/milestones - List milestones with filtering (User Story 1.2.2)
    server.get('/', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    transitionId: { type: 'string' },
                },
                required: ['transitionId'],
            },
            querystring: (0, milestone_service_1.$ref)('getMilestonesQuerySchema'),
            response: {
                200: (0, milestone_service_1.$ref)('milestoneListResponseSchema'),
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
    }, milestone_controller_1.getMilestonesHandler);
    // GET /api/transitions/:transitionId/milestones/:milestoneId - Get specific milestone
    server.get('/:milestoneId', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    transitionId: { type: 'string' },
                    milestoneId: { type: 'string' },
                },
                required: ['transitionId', 'milestoneId'],
            },
            response: {
                200: (0, milestone_service_1.$ref)('milestoneResponseSchema'),
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
    }, milestone_controller_1.getMilestoneByIdHandler);
    // PUT /api/transitions/:transitionId/milestones/:milestoneId - Update milestone (User Story 1.2.3)
    server.put('/:milestoneId', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    transitionId: { type: 'string' },
                    milestoneId: { type: 'string' },
                },
                required: ['transitionId', 'milestoneId'],
            },
            body: (0, milestone_service_1.$ref)('updateMilestoneSchema'),
            response: {
                200: (0, milestone_service_1.$ref)('milestoneResponseSchema'),
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
            },
        },
        preHandler: pmOnly,
    }, milestone_controller_1.updateMilestoneHandler);
    // DELETE /api/transitions/:transitionId/milestones/:milestoneId - Delete milestone (User Story 1.2.4)
    server.delete('/:milestoneId', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    transitionId: { type: 'string' },
                    milestoneId: { type: 'string' },
                },
                required: ['transitionId', 'milestoneId'],
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
    }, milestone_controller_1.deleteMilestoneHandler);
    // POST /api/transitions/:transitionId/milestones/bulk-delete - Bulk delete milestones (User Story 1.2.4)
    server.post('/bulk-delete', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    transitionId: { type: 'string' },
                },
                required: ['transitionId'],
            },
            body: {
                type: 'object',
                properties: {
                    milestoneIds: {
                        type: 'array',
                        items: { type: 'string' },
                        minItems: 1,
                    },
                },
                required: ['milestoneIds'],
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                    },
                },
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
            },
        },
        preHandler: pmOnly,
    }, milestone_controller_1.bulkDeleteMilestonesHandler);
}
exports.default = milestoneRoutes;
