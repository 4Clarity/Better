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
// Base Schemas
const TransitionStatusEnum = zod_1.z.nativeEnum(client_1.TransitionStatus);
const PriorityLevelEnum = zod_1.z.nativeEnum(client_1.Priority);
const MilestoneStatusEnum = zod_1.z.nativeEnum(client_1.MilestoneStatus);
// Create Transition Schema
const createTransitionSchema = zod_1.z.object({
    contractName: zod_1.z.string().min(1, "Contract name is required").max(255),
    contractNumber: zod_1.z.string().min(1, "Contract number is required").max(100),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    keyPersonnel: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
});
// Update Transition Schema
const updateTransitionSchema = zod_1.z.object({
    contractName: zod_1.z.string().min(1).max(255).optional(),
    contractNumber: zod_1.z.string().min(1).max(100).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    keyPersonnel: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
});
// Update Status Schema
const updateTransitionStatusSchema = zod_1.z.object({
    status: TransitionStatusEnum,
});
// Query Schemas
const getTransitionsQuerySchema = zod_1.z.object({
    status: TransitionStatusEnum.optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
    sortBy: zod_1.z.enum(['contractName', 'contractNumber', 'startDate', 'endDate', 'status', 'createdAt']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
// Response Schemas
const transitionResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    contractName: zod_1.z.string(),
    contractNumber: zod_1.z.string(),
    startDate: zod_1.z.string(),
    endDate: zod_1.z.string(),
    keyPersonnel: zod_1.z.string().nullable(),
    description: zod_1.z.string().nullable(),
    status: TransitionStatusEnum,
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    creator: zod_1.z.object({
        id: zod_1.z.string(),
        firstName: zod_1.z.string(),
        lastName: zod_1.z.string(),
        email: zod_1.z.string(),
    }).optional(),
    _count: zod_1.z.object({
        milestones: zod_1.z.number(),
    }).optional(),
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
const milestoneResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    dueDate: zod_1.z.string(),
    priority: PriorityLevelEnum,
    status: MilestoneStatusEnum,
    transitionId: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
const transitionWithMilestonesSchema = transitionResponseSchema.extend({
    milestones: zod_1.z.array(milestoneResponseSchema),
});
_a = (0, fastify_zod_1.buildJsonSchemas)({
    createTransitionSchema,
    updateTransitionSchema,
    updateTransitionStatusSchema,
    getTransitionsQuerySchema,
    transitionResponseSchema,
    transitionListResponseSchema,
    transitionWithMilestonesSchema,
}, { $id: 'TransitionSchema' }), exports.transitionSchemas = _a.schemas, exports.$ref = _a.$ref;
// Service Functions
async function createTransition(data, userId) {
    // Validate date logic
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate <= startDate) {
        throw new Error('End date must be after start date');
    }
    try {
        const transition = await prisma.transition.create({
            data: {
                ...data,
                startDate,
                endDate,
                createdBy: userId,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        Milestone: true,
                    },
                },
            },
        });
        // Create audit log
        await createAuditLog('transition', transition.id, 'CREATE', null, transition, userId);
        return transition;
    }
    catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('contractNumber')) {
            throw new Error('Contract number already exists');
        }
        throw error;
    }
}
async function getTransitions(query, userId) {
    const { page, limit, sortBy, sortOrder, status, search } = query;
    const skip = (page - 1) * limit;
    const where = {
        createdBy: userId, // Only show transitions created by this user
    };
    if (status) {
        where.status = status;
    }
    if (search) {
        where.OR = [
            { contractName: { contains: search, mode: 'insensitive' } },
            { contractNumber: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ];
    }
    const [data, total] = await prisma.$transaction([
        prisma.transition.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        Milestone: true,
                    },
                },
            },
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
async function getTransitionById(id, userId) {
    const transition = await prisma.transition.findFirst({
        where: {
            id,
            createdBy: userId, // Security: only show transitions created by this user
        },
        include: {
            creator: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
            Milestone: {
                orderBy: { dueDate: 'asc' },
            },
            _count: {
                select: {
                    Milestone: true,
                },
            },
        },
    });
    if (!transition) {
        throw new Error('Transition not found');
    }
    return transition;
}
async function updateTransition(id, data, userId) {
    const existingTransition = await prisma.transition.findFirst({
        where: { id, createdBy: userId },
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
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        Milestone: true,
                    },
                },
            },
        });
        // Create audit log
        await createAuditLog('transition', id, 'UPDATE', existingTransition, updatedTransition, userId);
        return updatedTransition;
    }
    catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('contractNumber')) {
            throw new Error('Contract number already exists');
        }
        throw error;
    }
}
async function updateTransitionStatus(id, data, userId) {
    const existingTransition = await prisma.transition.findFirst({
        where: { id, createdBy: userId },
    });
    if (!existingTransition) {
        throw new Error('Transition not found');
    }
    const updatedTransition = await prisma.transition.update({
        where: { id },
        data: { status: data.status },
        include: {
            creator: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
            _count: {
                select: {
                    milestones: true,
                },
            },
        },
    });
    // Create audit log
    await createAuditLog('transition', id, 'UPDATE', { status: existingTransition.status }, { status: data.status }, userId);
    return updatedTransition;
}
async function deleteTransition(id, userId) {
    const existingTransition = await prisma.transition.findFirst({
        where: { id, createdBy: userId },
        include: { Milestone: true },
    });
    if (!existingTransition) {
        throw new Error('Transition not found');
    }
    // Soft delete by updating status (optional - could be hard delete)
    const deletedTransition = await prisma.transition.delete({
        where: { id },
    });
    // Create audit log
    await createAuditLog('transition', id, 'DELETE', existingTransition, null, userId);
    return { message: 'Transition deleted successfully' };
}
// Audit Logging Helper
async function createAuditLog(entityType, entityId, action, oldValues, newValues, userId) {
    await prisma.auditLog.create({
        data: {
            entityType,
            entityId,
            action,
            oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
            newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
            userId,
        },
    });
}
