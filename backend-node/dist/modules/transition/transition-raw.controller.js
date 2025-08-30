"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransitionHandler = createTransitionHandler;
exports.getTransitionsHandler = getTransitionsHandler;
exports.getTransitionByIdHandler = getTransitionByIdHandler;
exports.updateTransitionHandler = updateTransitionHandler;
exports.updateTransitionStatusHandler = updateTransitionStatusHandler;
exports.deleteTransitionHandler = deleteTransitionHandler;
const transition_raw_service_1 = require("./transition-raw.service");
async function createTransitionHandler(request, reply) {
    try {
        const transition = await (0, transition_raw_service_1.createTransition)(request.body);
        return reply.code(201).send(transition);
    }
    catch (error) {
        console.error('Create transition error:', error);
        if (error.message === 'End date must be after start date') {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: error.message
            });
        }
        if (error.message === 'Contract number already exists') {
            return reply.code(409).send({
                statusCode: 409,
                error: 'Conflict',
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
async function getTransitionsHandler(request, reply) {
    try {
        const transitions = await (0, transition_raw_service_1.getTransitions)(request.query);
        return reply.code(200).send(transitions);
    }
    catch (error) {
        console.error('Get transitions error:', error);
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch transitions'
        });
    }
}
async function getTransitionByIdHandler(request, reply) {
    try {
        const { id } = request.params;
        const transition = await (0, transition_raw_service_1.getTransitionById)(id);
        return reply.code(200).send(transition);
    }
    catch (error) {
        console.error('Get transition by ID error:', error);
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
async function updateTransitionHandler(request, reply) {
    try {
        const { id } = request.params;
        const transition = await (0, transition_raw_service_1.updateTransition)(id, request.body);
        return reply.code(200).send(transition);
    }
    catch (error) {
        console.error('Update transition error:', error);
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
        if (error.message === 'Contract number already exists') {
            return reply.code(409).send({
                statusCode: 409,
                error: 'Conflict',
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
async function updateTransitionStatusHandler(request, reply) {
    try {
        const { id } = request.params;
        const transition = await (0, transition_raw_service_1.updateTransitionStatus)(id, request.body);
        return reply.code(200).send(transition);
    }
    catch (error) {
        console.error('Update transition status error:', error);
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
            message: 'Failed to update transition status'
        });
    }
}
async function deleteTransitionHandler(request, reply) {
    try {
        const { id } = request.params;
        const result = await (0, transition_raw_service_1.deleteTransition)(id);
        return reply.code(200).send(result);
    }
    catch (error) {
        console.error('Delete transition error:', error);
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
