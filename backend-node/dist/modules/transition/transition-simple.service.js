"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.$ref = exports.transitionSchemas = void 0;
exports.createTransition = createTransition;
exports.getTransitions = getTransitions;
exports.getTransitionById = getTransitionById;
exports.updateTransition = updateTransition;
exports.updateTransitionStatus = updateTransitionStatus;
exports.deleteTransition = deleteTransition;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const fastify_zod_1 = require("fastify-zod");
const prisma = new client_1.PrismaClient();
// Simple schemas matching current database
const createTransitionSchema = zod_1.z.object({
    contractName: zod_1.z.string().min(1, "Contract name is required").max(255),
    contractNumber: zod_1.z.string().min(1, "Contract number is required").max(100),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
});
const updateTransitionSchema = zod_1.z.object({
    contractName: zod_1.z.string().min(1).max(255).optional(),
    contractNumber: zod_1.z.string().min(1).max(100).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
});
const updateTransitionStatusSchema = zod_1.z.object({
    status: zod_1.z.string(),
});
const getTransitionsQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
    sortBy: zod_1.z.enum(['contractName', 'contractNumber', 'startDate', 'endDate', 'status', 'createdAt']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
const transitionResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    contractName: zod_1.z.string(),
    contractNumber: zod_1.z.string(),
    startDate: zod_1.z.string(),
    endDate: zod_1.z.string(),
    status: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
const transitionListResponseSchema = zod_1.z.object({
    data: zod_1.z.array(transitionResponseSchema),
    pagination: zod_1.z.object({
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
        total: zod_1.z.number(),
        totalPages: zod_1.z.number(),
    }),
});
_a = (0, fastify_zod_1.buildJsonSchemas)({
    createTransitionSchema,
    updateTransitionSchema,
    updateTransitionStatusSchema,
    getTransitionsQuerySchema,
    transitionResponseSchema,
    transitionListResponseSchema,
}, { $id: 'TransitionSchemaSimple' }), exports.transitionSchemas = _a.schemas, exports.$ref = _a.$ref;
// Service Functions
async function createTransition(data) {
    // Validate date logic
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate <= startDate) {
        throw new Error('End date must be after start date');
    }
    try {
        const transition = await prisma.transition.create({
            data: {
                contractName: data.contractName,
                contractNumber: data.contractNumber,
                startDate,
                endDate,
            },
        });
        return transition;
    }
    catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('contractNumber')) {
            throw new Error('Contract number already exists');
        }
        throw error;
    }
}
async function getTransitions(query) {
    const { page, limit, sortBy, sortOrder, search } = query;
    const skip = (page - 1) * limit;
    const where = {};
    if (search) {
        where.OR = [
            { contractName: { contains: search, mode: 'insensitive' } },
            { contractNumber: { contains: search, mode: 'insensitive' } },
        ];
    }
    const [data, total] = await prisma.$transaction([
        prisma.transition.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
        }),
        prisma.transition.count({ where }),
    ]);
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}
async function getTransitionById(id) {
    const transition = await prisma.transition.findUnique({
        where: { id },
    });
    if (!transition) {
        throw new Error('Transition not found');
    }
    return transition;
}
async function updateTransition(id, data) {
    const existingTransition = await prisma.transition.findUnique({
        where: { id },
    });
    if (!existingTransition) {
        throw new Error('Transition not found');
    }
    // Validate date logic if dates are being updated
    if (data.startDate || data.endDate) {
        const startDate = data.startDate ? new Date(data.startDate) : existingTransition.startDate;
        const endDate = data.endDate ? new Date(data.endDate) : existingTransition.endDate;
        if (endDate <= startDate) {
            throw new Error('End date must be after start date');
        }
    }
    const updateData = { ...data };
    if (data.startDate)
        updateData.startDate = new Date(data.startDate);
    if (data.endDate)
        updateData.endDate = new Date(data.endDate);
    try {
        const updatedTransition = await prisma.transition.update({
            where: { id },
            data: updateData,
        });
        return updatedTransition;
    }
    catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('contractNumber')) {
            throw new Error('Contract number already exists');
        }
        throw error;
    }
}
async function updateTransitionStatus(id, data) {
    const existingTransition = await prisma.transition.findUnique({
        where: { id },
    });
    if (!existingTransition) {
        throw new Error('Transition not found');
    }
    const updatedTransition = await prisma.transition.update({
        where: { id },
        data: { status: data.status },
    });
    return updatedTransition;
}
async function deleteTransition(id) {
    const existingTransition = await prisma.transition.findUnique({
        where: { id },
    });
    if (!existingTransition) {
        throw new Error('Transition not found');
    }
    await prisma.transition.delete({
        where: { id },
    });
    return { message: 'Transition deleted successfully' };
}
