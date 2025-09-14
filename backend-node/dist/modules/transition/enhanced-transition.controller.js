"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEnhancedTransitionHandler = createEnhancedTransitionHandler;
exports.getEnhancedTransitionsHandler = getEnhancedTransitionsHandler;
exports.getEnhancedTransitionByIdHandler = getEnhancedTransitionByIdHandler;
exports.updateEnhancedTransitionHandler = updateEnhancedTransitionHandler;
exports.deleteEnhancedTransitionHandler = deleteEnhancedTransitionHandler;
exports.createMilestoneHandler = createMilestoneHandler;
exports.updateMilestoneStatusHandler = updateMilestoneStatusHandler;
exports.getLegacyTransitionsHandler = getLegacyTransitionsHandler;
exports.createMajorTransitionHandler = createMajorTransitionHandler;
exports.createPersonnelTransitionHandler = createPersonnelTransitionHandler;
exports.createOperationalChangeHandler = createOperationalChangeHandler;
exports.getMajorTransitionsHandler = getMajorTransitionsHandler;
exports.getPersonnelTransitionsHandler = getPersonnelTransitionsHandler;
exports.getOperationalChangesHandler = getOperationalChangesHandler;
exports.getTransitionCountsHandler = getTransitionCountsHandler;
const enhanced_transition_service_1 = require("./enhanced-transition.service");
async function createEnhancedTransitionHandler(request, reply) {
    try {
        const transition = await (0, enhanced_transition_service_1.createEnhancedTransition)(request.body);
        return reply.code(201).send(transition);
    }
    catch (error) {
        console.error('Create enhanced transition error:', error);
        if (error.message === 'Contract not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error.message === 'End date must be after start date') {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to create transition'
        });
    }
}
async function getEnhancedTransitionsHandler(request, reply) {
    try {
        const transitions = await (0, enhanced_transition_service_1.getEnhancedTransitions)(request.query);
        return reply.code(200).send(transitions);
    }
    catch (error) {
        console.error('Get enhanced transitions error:', error);
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch transitions'
        });
    }
}
async function getEnhancedTransitionByIdHandler(request, reply) {
    try {
        const { id } = request.params;
        const transition = await (0, enhanced_transition_service_1.getEnhancedTransitionById)(id);
        return reply.code(200).send(transition);
    }
    catch (error) {
        console.error('Get enhanced transition by ID error:', error);
        if (error.message === 'Transition not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch transition'
        });
    }
}
async function updateEnhancedTransitionHandler(request, reply) {
    try {
        const { id } = request.params;
        const transition = await (0, enhanced_transition_service_1.updateEnhancedTransition)(id, request.body);
        return reply.code(200).send(transition);
    }
    catch (error) {
        console.error('Update enhanced transition error:', error);
        if (error.message === 'Transition not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error.message === 'End date must be after start date') {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to update transition'
        });
    }
}
async function deleteEnhancedTransitionHandler(request, reply) {
    try {
        const { id } = request.params;
        const result = await (0, enhanced_transition_service_1.deleteEnhancedTransition)(id);
        return reply.code(200).send(result);
    }
    catch (error) {
        console.error('Delete enhanced transition error:', error);
        if (error.message === 'Transition not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to delete transition'
        });
    }
}
async function createMilestoneHandler(request, reply) {
    try {
        const { transitionId } = request.params;
        const milestone = await (0, enhanced_transition_service_1.createMilestone)(transitionId, request.body);
        return reply.code(201).send(milestone);
    }
    catch (error) {
        console.error('Create milestone error:', error);
        if (error.message === 'Transition not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to create milestone'
        });
    }
}
async function updateMilestoneStatusHandler(request, reply) {
    try {
        const { id } = request.params;
        const { status } = request.body;
        const milestone = await (0, enhanced_transition_service_1.updateMilestoneStatus)(id, status);
        return reply.code(200).send(milestone);
    }
    catch (error) {
        console.error('Update milestone status error:', error);
        if (error.code === 'P2025') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: 'Milestone not found'
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to update milestone status'
        });
    }
}
async function getLegacyTransitionsHandler(request, reply) {
    try {
        const transitions = await (0, enhanced_transition_service_1.getLegacyTransitions)();
        return reply.code(200).send(transitions);
    }
    catch (error) {
        console.error('Get legacy transitions error:', error);
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch legacy transitions'
        });
    }
}
// Level-specific handlers
async function createMajorTransitionHandler(request, reply) {
    try {
        const transition = await (0, enhanced_transition_service_1.createMajorTransition)(request.body);
        return reply.code(201).send(transition);
    }
    catch (error) {
        console.error('Create major transition error:', error);
        if (error.message === 'Contract not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error.message === 'End date must be after start date') {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to create major transition'
        });
    }
}
async function createPersonnelTransitionHandler(request, reply) {
    try {
        const transition = await (0, enhanced_transition_service_1.createPersonnelTransition)(request.body);
        return reply.code(201).send(transition);
    }
    catch (error) {
        console.error('Create personnel transition error:', error);
        if (error.message === 'Contract not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error.message === 'End date must be after start date') {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to create personnel transition'
        });
    }
}
async function createOperationalChangeHandler(request, reply) {
    try {
        const transition = await (0, enhanced_transition_service_1.createOperationalChange)(request.body);
        return reply.code(201).send(transition);
    }
    catch (error) {
        console.error('Create operational change error:', error);
        if (error.message === 'Contract not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error.message === 'End date must be after start date') {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to create operational change'
        });
    }
}
async function getMajorTransitionsHandler(request, reply) {
    try {
        const result = await (0, enhanced_transition_service_1.getMajorTransitions)(request.query);
        return reply.code(200).send(result);
    }
    catch (error) {
        console.error('Get major transitions error:', error);
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch major transitions'
        });
    }
}
async function getPersonnelTransitionsHandler(request, reply) {
    try {
        const result = await (0, enhanced_transition_service_1.getPersonnelTransitions)(request.query);
        return reply.code(200).send(result);
    }
    catch (error) {
        console.error('Get personnel transitions error:', error);
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch personnel transitions'
        });
    }
}
async function getOperationalChangesHandler(request, reply) {
    try {
        const result = await (0, enhanced_transition_service_1.getOperationalChanges)(request.query);
        return reply.code(200).send(result);
    }
    catch (error) {
        console.error('Get operational changes error:', error);
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch operational changes'
        });
    }
}
async function getTransitionCountsHandler(request, reply) {
    try {
        const counts = await (0, enhanced_transition_service_1.getTransitionCounts)();
        return reply.code(200).send(counts);
    }
    catch (error) {
        console.error('Get transition counts error:', error);
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch transition counts'
        });
    }
}
