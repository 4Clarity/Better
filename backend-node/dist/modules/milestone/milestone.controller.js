"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMilestoneHandler = createMilestoneHandler;
exports.getMilestonesHandler = getMilestonesHandler;
exports.getMilestoneByIdHandler = getMilestoneByIdHandler;
exports.updateMilestoneHandler = updateMilestoneHandler;
exports.deleteMilestoneHandler = deleteMilestoneHandler;
exports.bulkDeleteMilestonesHandler = bulkDeleteMilestonesHandler;
const milestone_service_1 = require("./milestone.service");
// Mock user ID for now - in real app this would come from JWT token
const MOCK_USER_ID = 'user_123'; // TODO: Replace with actual auth
async function createMilestoneHandler(request, reply) {
    try {
        const { transitionId } = request.params;
        const milestone = await (0, milestone_service_1.createMilestone)(transitionId, request.body, MOCK_USER_ID);
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
        if (error.message === 'Due date cannot be in the past') {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: error.message
            });
        }
        if (error.message === 'Milestone due date must be within transition timeframe') {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
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
async function getMilestonesHandler(request, reply) {
    try {
        const { transitionId } = request.params;
        const milestones = await (0, milestone_service_1.getMilestones)(transitionId, request.query, MOCK_USER_ID);
        return reply.code(200).send(milestones);
    }
    catch (error) {
        console.error('Get milestones error:', error);
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
            message: 'Failed to fetch milestones'
        });
    }
}
async function getMilestoneByIdHandler(request, reply) {
    try {
        const { transitionId, milestoneId } = request.params;
        const milestone = await (0, milestone_service_1.getMilestoneById)(transitionId, milestoneId, MOCK_USER_ID);
        return reply.code(200).send(milestone);
    }
    catch (error) {
        console.error('Get milestone by ID error:', error);
        if (error.message === 'Transition not found' || error.message === 'Milestone not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch milestone'
        });
    }
}
async function updateMilestoneHandler(request, reply) {
    try {
        const { transitionId, milestoneId } = request.params;
        const milestone = await (0, milestone_service_1.updateMilestone)(transitionId, milestoneId, request.body, MOCK_USER_ID);
        return reply.code(200).send(milestone);
    }
    catch (error) {
        console.error('Update milestone error:', error);
        if (error.message === 'Transition not found' || error.message === 'Milestone not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error.message === 'Due date cannot be in the past') {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: error.message
            });
        }
        if (error.message === 'Milestone due date must be within transition timeframe') {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to update milestone'
        });
    }
}
async function deleteMilestoneHandler(request, reply) {
    try {
        const { transitionId, milestoneId } = request.params;
        const result = await (0, milestone_service_1.deleteMilestone)(transitionId, milestoneId, MOCK_USER_ID);
        return reply.code(200).send(result);
    }
    catch (error) {
        console.error('Delete milestone error:', error);
        if (error.message === 'Transition not found' || error.message === 'Milestone not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to delete milestone'
        });
    }
}
async function bulkDeleteMilestonesHandler(request, reply) {
    try {
        const { transitionId } = request.params;
        const { milestoneIds } = request.body;
        if (!milestoneIds || !Array.isArray(milestoneIds) || milestoneIds.length === 0) {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: 'milestoneIds array is required and cannot be empty'
            });
        }
        const result = await (0, milestone_service_1.bulkDeleteMilestones)(transitionId, milestoneIds, MOCK_USER_ID);
        return reply.code(200).send(result);
    }
    catch (error) {
        console.error('Bulk delete milestones error:', error);
        if (error.message === 'Transition not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error.message === 'Some milestones not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to delete milestones'
        });
    }
}
