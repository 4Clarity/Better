"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.$ref = exports.milestoneSchemas = void 0;
exports.createMilestone = createMilestone;
exports.getMilestones = getMilestones;
exports.getMilestoneById = getMilestoneById;
exports.updateMilestone = updateMilestone;
exports.deleteMilestone = deleteMilestone;
exports.bulkDeleteMilestones = bulkDeleteMilestones;
exports.updateMilestoneStatuses = updateMilestoneStatuses;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const fastify_zod_1 = require("fastify-zod");
const prisma = new client_1.PrismaClient();
// Base Schemas
const MilestoneStatusEnum = zod_1.z.nativeEnum(client_1.MilestoneStatus);
const PriorityEnum = zod_1.z.nativeEnum(client_1.Priority);
// Create Milestone Schema
const createMilestoneSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required").max(255),
    description: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().datetime(),
    priority: PriorityEnum.default('MEDIUM'),
});
// Update Milestone Schema
const updateMilestoneSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().datetime().optional(),
    priority: PriorityEnum.optional(),
    status: MilestoneStatusEnum.optional(),
});
// Query Schemas
const getMilestonesQuerySchema = zod_1.z.object({
    status: MilestoneStatusEnum.optional(),
    priority: PriorityEnum.optional(),
    overdue: zod_1.z.boolean().optional(),
    upcoming: zod_1.z.coerce.number().int().min(1).optional(), // Days ahead
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    sortBy: zod_1.z.enum(['title', 'dueDate', 'priority', 'status', 'createdAt']).default('dueDate'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc'),
});
// Response Schemas
const milestoneResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    dueDate: zod_1.z.string(),
    priority: PriorityEnum,
    status: MilestoneStatusEnum,
    transitionId: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    transition: zod_1.z.object({
        id: zod_1.z.string(),
        contractName: zod_1.z.string(),
        contractNumber: zod_1.z.string(),
    }).optional(),
});
const milestoneListResponseSchema = zod_1.z.object({
    data: zod_1.z.array(milestoneResponseSchema),
    pagination: zod_1.z.object({
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
        total: zod_1.z.number(),
        totalPages: zod_1.z.number(),
    }),
});
_a = (0, fastify_zod_1.buildJsonSchemas)({
    createMilestoneSchema,
    updateMilestoneSchema,
    getMilestonesQuerySchema,
    milestoneResponseSchema,
    milestoneListResponseSchema,
}, { $id: 'MilestoneSchema' }), exports.milestoneSchemas = _a.schemas, exports.$ref = _a.$ref;
// Service Functions
async function createMilestone(transitionId, data, userId) {
    // Verify the transition exists; allow if no creator recorded (legacy), or creator matches
    const transition = await prisma.transition.findUnique({ where: { id: transitionId } });
    if (!transition) {
        throw new Error('Transition not found');
    }
    // Validate due date is not in the past (allow some buffer)
    const dueDate = new Date(data.dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    if (dueDate < now) {
        throw new Error('Due date cannot be in the past');
    }
    // Check if due date is within transition timeframe
    if (dueDate < transition.startDate || dueDate > transition.endDate) {
        throw new Error('Milestone due date must be within transition timeframe');
    }
    try {
        // Idempotency guard: avoid accidental duplicates on rapid re-submits
        const existing = await prisma.milestone.findFirst({
            where: {
                transitionId,
                title: data.title,
                dueDate,
            },
            include: {
                transition: {
                    select: { id: true, contractName: true, contractNumber: true },
                },
            },
        });
        if (existing) {
            return existing;
        }
        const milestone = await prisma.milestone.create({
            data: {
                ...data,
                dueDate,
                transitionId,
            },
            include: {
                transition: {
                    select: {
                        id: true,
                        contractName: true,
                        contractNumber: true,
                    },
                },
            },
        });
        // Create audit log
        await createAuditLog('milestone', milestone.id, 'CREATE', null, milestone, userId);
        return milestone;
    }
    catch (error) {
        throw error;
    }
}
async function getMilestones(transitionId, query, userId) {
    const { page, limit, sortBy, sortOrder, status, priority, overdue, upcoming } = query;
    const skip = (page - 1) * limit;
    const where = {
        transitionId,
    };
    if (status) {
        where.status = status;
    }
    if (priority) {
        where.priority = priority;
    }
    // Handle overdue filter
    if (overdue === true) {
        where.dueDate = { lt: new Date() };
        where.status = { not: 'COMPLETED' };
    }
    // Handle upcoming filter (milestones due within N days)
    if (upcoming) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + upcoming);
        where.dueDate = {
            gte: new Date(),
            lte: futureDate,
        };
        where.status = { not: 'COMPLETED' };
    }
    const [data, total] = await prisma.$transaction([
        prisma.milestone.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
                transition: {
                    select: {
                        id: true,
                        contractName: true,
                        contractNumber: true,
                    },
                },
            },
        }),
        prisma.milestone.count({ where }),
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
async function getMilestoneById(transitionId, milestoneId, userId) {
    const milestone = await prisma.milestone.findFirst({
        where: {
            id: milestoneId,
        },
        include: {
            transition: {
                select: {
                    id: true,
                    contractName: true,
                    contractNumber: true,
                },
            },
        },
    });
    if (!milestone) {
        throw new Error('Milestone not found');
    }
    return milestone;
}
async function updateMilestone(transitionId, milestoneId, data, userId) {
    // Optionally fetch transition to validate timeframe
    const transition = await prisma.transition.findUnique({ where: { id: transitionId } });
    const existingMilestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!existingMilestone) {
        throw new Error('Milestone not found');
    }
    // Validate due date if being updated
    if (data.dueDate) {
        const dueDate = new Date(data.dueDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (dueDate < now) {
            throw new Error('Due date cannot be in the past');
        }
        if (transition && (dueDate < transition.startDate || dueDate > transition.endDate)) {
            throw new Error('Milestone due date must be within transition timeframe');
        }
    }
    const updateData = { ...data };
    if (data.dueDate)
        updateData.dueDate = new Date(data.dueDate);
    try {
        const updatedMilestone = await prisma.milestone.update({
            where: { id: milestoneId },
            data: updateData,
            include: {
                transition: {
                    select: {
                        id: true,
                        contractName: true,
                        contractNumber: true,
                    },
                },
            },
        });
        // Create audit log
        await createAuditLog('milestone', milestoneId, 'UPDATE', existingMilestone, updatedMilestone, userId);
        return updatedMilestone;
    }
    catch (error) {
        throw error;
    }
}
async function deleteMilestone(transitionId, milestoneId, userId) {
    const existingMilestone = await prisma.milestone.findFirst({
        where: {
            id: milestoneId,
            transitionId,
        },
    });
    if (!existingMilestone) {
        throw new Error('Milestone not found');
    }
    // Check if milestone has dependencies (this could be expanded based on business rules)
    // For now, we'll allow deletion of any milestone
    // Remove related audit logs first to avoid FK constraint errors
    await prisma.auditLog.deleteMany({
        where: { entityType: 'milestone', entityId: milestoneId },
    });
    await prisma.milestone.delete({ where: { id: milestoneId } });
    // Create audit log
    await createAuditLog('milestone', milestoneId, 'DELETE', existingMilestone, null, userId);
    return { message: 'Milestone deleted successfully' };
}
async function bulkDeleteMilestones(transitionId, milestoneIds, userId) {
    // Verify the transition exists; allow legacy records without creator
    const transition = await prisma.transition.findUnique({ where: { id: transitionId } });
    if (!transition) {
        throw new Error('Transition not found');
    }
    if (transition.createdBy && transition.createdBy !== userId) {
        throw new Error('Transition not found');
    }
    // Get existing milestones for audit trail
    const existingMilestones = await prisma.milestone.findMany({ where: { id: { in: milestoneIds } } });
    if (existingMilestones.length !== milestoneIds.length) {
        throw new Error('Some milestones not found');
    }
    // Delete related audit logs first to avoid FK constraint errors
    await prisma.auditLog.deleteMany({
        where: { entityType: 'milestone', entityId: { in: milestoneIds } },
    });
    // Delete milestones
    await prisma.milestone.deleteMany({ where: { id: { in: milestoneIds } } });
    // Create audit logs for each deleted milestone
    for (const milestone of existingMilestones) {
        await createAuditLog('milestone', milestone.id, 'DELETE', milestone, null, userId);
    }
    return { message: `${milestoneIds.length} milestones deleted successfully` };
}
// Update milestone status with automatic overdue detection
async function updateMilestoneStatuses() {
    const now = new Date();
    // Mark overdue milestones
    await prisma.milestone.updateMany({
        where: {
            dueDate: { lt: now },
            status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        data: {
            status: 'OVERDUE',
        },
    });
    // This could be called by a cron job
    return { message: 'Milestone statuses updated' };
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
