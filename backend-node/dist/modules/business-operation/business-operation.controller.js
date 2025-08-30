"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBusinessOperationHandler = createBusinessOperationHandler;
exports.getBusinessOperationsHandler = getBusinessOperationsHandler;
exports.getBusinessOperationByIdHandler = getBusinessOperationByIdHandler;
exports.updateBusinessOperationHandler = updateBusinessOperationHandler;
exports.deleteBusinessOperationHandler = deleteBusinessOperationHandler;
const business_operation_service_1 = require("./business-operation.service");
async function createBusinessOperationHandler(request, reply) {
    try {
        const businessOperation = await (0, business_operation_service_1.createBusinessOperation)(request.body);
        return reply.code(201).send(businessOperation);
    }
    catch (error) {
        console.error('Create business operation error:', error);
        if (error.message.includes('Support period end date must be after start date') ||
            error.message.includes('Current contract end cannot be after support period end')) {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to create business operation'
        });
    }
}
async function getBusinessOperationsHandler(request, reply) {
    try {
        const businessOperations = await (0, business_operation_service_1.getBusinessOperations)(request.query);
        return reply.code(200).send(businessOperations);
    }
    catch (error) {
        console.error('Get business operations error:', error);
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch business operations'
        });
    }
}
async function getBusinessOperationByIdHandler(request, reply) {
    try {
        const { id } = request.params;
        const businessOperation = await (0, business_operation_service_1.getBusinessOperationById)(id);
        return reply.code(200).send(businessOperation);
    }
    catch (error) {
        console.error('Get business operation by ID error:', error);
        if (error.message === 'Business operation not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch business operation'
        });
    }
}
async function updateBusinessOperationHandler(request, reply) {
    try {
        const { id } = request.params;
        const businessOperation = await (0, business_operation_service_1.updateBusinessOperation)(id, request.body);
        return reply.code(200).send(businessOperation);
    }
    catch (error) {
        console.error('Update business operation error:', error);
        if (error.message === 'Business operation not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error.message.includes('Support period end date must be after start date') ||
            error.message.includes('Current contract end cannot be after support period end')) {
            return reply.code(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to update business operation'
        });
    }
}
async function deleteBusinessOperationHandler(request, reply) {
    try {
        const { id } = request.params;
        const result = await (0, business_operation_service_1.deleteBusinessOperation)(id);
        return reply.code(200).send(result);
    }
    catch (error) {
        console.error('Delete business operation error:', error);
        if (error.message === 'Business operation not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error.message === 'Cannot delete business operation with active contracts') {
            return reply.code(409).send({
                statusCode: 409,
                error: 'Conflict',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to delete business operation'
        });
    }
}
