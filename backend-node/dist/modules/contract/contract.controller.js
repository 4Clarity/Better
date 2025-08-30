"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContractHandler = createContractHandler;
exports.getContractsHandler = getContractsHandler;
exports.getContractByIdHandler = getContractByIdHandler;
exports.updateContractHandler = updateContractHandler;
exports.deleteContractHandler = deleteContractHandler;
exports.getContractsByBusinessOperationHandler = getContractsByBusinessOperationHandler;
const contract_service_1 = require("./contract.service");
async function createContractHandler(request, reply) {
    try {
        const contract = await (0, contract_service_1.createContract)(request.body);
        return reply.code(201).send(contract);
    }
    catch (error) {
        console.error('Create contract error:', error);
        if (error.message === 'Business operation not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error.message === 'Contract end date must be after start date') {
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
            message: 'Failed to create contract'
        });
    }
}
async function getContractsHandler(request, reply) {
    try {
        const contracts = await (0, contract_service_1.getContracts)(request.query);
        return reply.code(200).send(contracts);
    }
    catch (error) {
        console.error('Get contracts error:', error);
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch contracts'
        });
    }
}
async function getContractByIdHandler(request, reply) {
    try {
        const { id } = request.params;
        const contract = await (0, contract_service_1.getContractById)(id);
        return reply.code(200).send(contract);
    }
    catch (error) {
        console.error('Get contract by ID error:', error);
        if (error.message === 'Contract not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch contract'
        });
    }
}
async function updateContractHandler(request, reply) {
    try {
        const { id } = request.params;
        const contract = await (0, contract_service_1.updateContract)(id, request.body);
        return reply.code(200).send(contract);
    }
    catch (error) {
        console.error('Update contract error:', error);
        if (error.message === 'Contract not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error.message === 'Contract end date must be after start date') {
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
            message: 'Failed to update contract'
        });
    }
}
async function deleteContractHandler(request, reply) {
    try {
        const { id } = request.params;
        const result = await (0, contract_service_1.deleteContract)(id);
        return reply.code(200).send(result);
    }
    catch (error) {
        console.error('Delete contract error:', error);
        if (error.message === 'Contract not found') {
            return reply.code(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error.message === 'Cannot delete contract with active transitions') {
            return reply.code(409).send({
                statusCode: 409,
                error: 'Conflict',
                message: error.message
            });
        }
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to delete contract'
        });
    }
}
async function getContractsByBusinessOperationHandler(request, reply) {
    try {
        const { businessOperationId } = request.params;
        const contracts = await (0, contract_service_1.getContractsByBusinessOperation)(businessOperationId);
        return reply.code(200).send(contracts);
    }
    catch (error) {
        console.error('Get contracts by business operation error:', error);
        return reply.code(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Failed to fetch contracts for business operation'
        });
    }
}
