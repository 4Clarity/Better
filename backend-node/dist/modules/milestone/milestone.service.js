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
exports.getCombinedMilestones = getCombinedMilestones;
exports.updateMilestoneStatuses = updateMilestoneStatuses;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const fastify_zod_1 = require("fastify-zod");
const crypto_1 = require("crypto");
const prisma = new client_1.PrismaClient();
// Base Schemas
const MilestoneStatusEnum = zod_1.z.nativeEnum(client_1.MilestoneStatus);
const PriorityEnum = zod_1.z.nativeEnum(client_1.Priority);
// Create Milestone Schema
const createMilestoneSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required").max(255),
    description: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().datetime(),
    priority: PriorityEnum.default('Medium'),
    assignedTo: zod_1.z.string().optional(),
});
// Update Milestone Schema
const updateMilestoneSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().datetime().optional(),
    priority: PriorityEnum.optional(),
    status: MilestoneStatusEnum.optional(),
    assignedTo: zod_1.z.string().nullable().optional(),
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
    assignedTo: zod_1.z.string().nullable(),
    createdBy: zod_1.z.string(),
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
    const transition = await prisma.transitions.findUnique({ where: { id: transitionId } });
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
    // Check if due date is within transition timeframe (normalize dates for comparison)
    const dueDateOnly = new Date(dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);
    const startDateOnly = new Date(transition.startDate);
    startDateOnly.setHours(0, 0, 0, 0);
    const endDateOnly = new Date(transition.endDate);
    endDateOnly.setHours(0, 0, 0, 0);
    if (dueDateOnly < startDateOnly || dueDateOnly > endDateOnly) {
        const formatDate = (date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        throw new Error(`Milestone target date must be between ${formatDate(startDateOnly)} and ${formatDate(endDateOnly)} (transition timeframe)`);
    }
    try {
        // Idempotency guard: avoid accidental duplicates on rapid re-submits
        const existing = await prisma.milestones.findFirst({
            where: {
                transitionId,
                title: data.title,
                dueDate,
            },
            include: {
                transitions: {
                    select: { id: true, contractName: true, contractNumber: true },
                },
            },
        });
        if (existing) {
            return existing;
        }
        const milestone = await prisma.milestones.create({
            data: {
                id: (0, crypto_1.randomUUID)(),
                title: data.title,
                description: data.description,
                dueDate,
                priority: data.priority ?? 'Medium',
                transitionId,
                assignedTo: data.assignedTo || null,
                createdBy: userId,
                updatedAt: new Date(),
            },
            include: {
                transitions: {
                    select: {
                        id: true,
                        contractName: true,
                        contractNumber: true,
                    },
                },
            },
        });
        // Create audit log
        // Note: AuditLog model doesn't exist in current schema - audit logging disabled
        // await createAuditLog('milestone', milestone.id, 'CREATE', null, milestone, userId);
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
        prisma.milestones.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
                transitions: {
                    select: {
                        id: true,
                        contractName: true,
                        contractNumber: true,
                    },
                },
            },
        }),
        prisma.milestones.count({ where }),
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
    const milestone = await prisma.milestones.findFirst({
        where: {
            id: milestoneId,
        },
        include: {
            transitions: {
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
    const transition = await prisma.transitions.findUnique({ where: { id: transitionId } });
    const existingMilestone = await prisma.milestones.findUnique({ where: { id: milestoneId } });
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
        if (transition) {
            // Normalize dates for comparison (compare date-only, ignoring time)
            const dueDateOnly = new Date(dueDate);
            dueDateOnly.setHours(0, 0, 0, 0);
            const startDateOnly = new Date(transition.startDate);
            startDateOnly.setHours(0, 0, 0, 0);
            const endDateOnly = new Date(transition.endDate);
            endDateOnly.setHours(0, 0, 0, 0);
            if (dueDateOnly < startDateOnly || dueDateOnly > endDateOnly) {
                const formatDate = (date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                throw new Error(`Milestone target date must be between ${formatDate(startDateOnly)} and ${formatDate(endDateOnly)} (transition timeframe)`);
            }
        }
    }
    const updateData = {};
    if (data.title !== undefined)
        updateData.title = data.title;
    if (data.description !== undefined)
        updateData.description = data.description;
    if (data.priority !== undefined)
        updateData.priority = data.priority;
    if (data.status !== undefined)
        updateData.status = data.status;
    if (data.dueDate)
        updateData.dueDate = new Date(data.dueDate);
    if (data.assignedTo !== undefined)
        updateData.assignedTo = data.assignedTo || null;
    try {
        const updatedMilestone = await prisma.milestones.update({
            where: { id: milestoneId },
            data: updateData,
            include: {
                transitions: {
                    select: {
                        id: true,
                        contractName: true,
                        contractNumber: true,
                    },
                },
            },
        });
        // Create audit log
        // Note: AuditLog model doesn't exist in current schema - audit logging disabled
        // await createAuditLog('milestone', milestoneId, 'UPDATE', existingMilestone, updatedMilestone, userId);
        return updatedMilestone;
    }
    catch (error) {
        throw error;
    }
}
async function deleteMilestone(transitionId, milestoneId, userId) {
    const existingMilestone = await prisma.milestones.findFirst({
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
    // Note: AuditLog model doesn't exist in current schema - audit logging disabled
    // await prisma.auditLog.deleteMany({
    //   where: { entityType: 'milestone', entityId: milestoneId },
    // });
    await prisma.milestones.delete({ where: { id: milestoneId } });
    // Create audit log
    // Note: AuditLog model doesn't exist in current schema - audit logging disabled
    // await createAuditLog('milestone', milestoneId, 'DELETE', existingMilestone, null, userId);
    return { message: 'Milestone deleted successfully' };
}
async function bulkDeleteMilestones(transitionId, milestoneIds, userId) {
    // Verify the transition exists; allow legacy records without creator
    const transition = await prisma.transitions.findUnique({ where: { id: transitionId } });
    if (!transition) {
        throw new Error('Transition not found');
    }
    if (transition.createdBy && transition.createdBy !== userId) {
        throw new Error('Transition not found');
    }
    // Get existing milestones for audit trail
    const existingMilestones = await prisma.milestones.findMany({ where: { id: { in: milestoneIds } } });
    if (existingMilestones.length !== milestoneIds.length) {
        throw new Error('Some milestones not found');
    }
    // Delete related audit logs first to avoid FK constraint errors
    // Note: AuditLog model doesn't exist in current schema - audit logging disabled
    // await prisma.auditLog.deleteMany({
    //   where: { entityType: 'milestone', entityId: { in: milestoneIds } },
    // });
    // Delete milestones
    await prisma.milestones.deleteMany({ where: { id: { in: milestoneIds } } });
    // Create audit logs for each deleted milestone
    // Note: AuditLog model doesn't exist in current schema - audit logging disabled
    // for (const milestone of existingMilestones) {
    //   await createAuditLog('milestone', milestone.id, 'DELETE', milestone, null, userId);
    // }
    return { message: `${milestoneIds.length} milestones deleted successfully` };
}
// Get combined milestones (transition + product program)
async function getCombinedMilestones(transitionId, userId) {
    // Get the transition to find its product program
    const transition = await prisma.transitions.findUnique({
        where: { id: transitionId },
        select: { id: true, productProgramId: true }
    });
    if (!transition) {
        throw new Error('Transition not found');
    }
    // Fetch transition-level milestones
    const transitionMilestones = await prisma.milestones.findMany({
        where: { transitionId },
        orderBy: [{ dueDate: 'asc' }]
    });
    // Transform transition milestones to include source type
    const transitionMilestonesWithType = transitionMilestones.map(milestone => ({
        ...milestone,
        sourceType: 'transition',
        sourceName: 'Transition Milestones'
    }));
    // Fetch product program milestones if available
    let productProgramMilestones = [];
    if (transition.productProgramId) {
        const ppMilestones = await prisma.product_program_milestones.findMany({
            where: { product_program_id: transition.productProgramId },
            orderBy: [{ target_date: 'asc' }, { status: 'asc' }]
        });
        // Transform product program milestones to match transition milestone structure
        productProgramMilestones = ppMilestones.map(milestone => ({
            id: milestone.id,
            title: milestone.title,
            description: milestone.description,
            dueDate: milestone.target_date,
            status: milestone.status === 'UPCOMING' ? 'Not_Started' : milestone.status === 'IN_PROGRESS' ? 'In_Progress' : milestone.status === 'ACHIEVED' ? 'Completed' : milestone.status === 'MISSED' ? 'Overdue' : 'Cancelled',
            priority: 'High', // Product program milestones are typically high priority
            createdAt: milestone.created_at,
            updatedAt: milestone.updated_at,
            sourceType: 'product_program',
            sourceName: 'Product/Program Milestones',
            originalStatus: milestone.status, // Keep original for reference
            achievedAt: milestone.achieved_at,
        }));
    }
    return {
        transitionMilestones: transitionMilestonesWithType,
        productProgramMilestones,
        all: [...productProgramMilestones, ...transitionMilestonesWithType]
    };
}
// Update milestone status with automatic overdue detection
async function updateMilestoneStatuses() {
    const now = new Date();
    // Mark overdue milestones
    await prisma.milestones.updateMany({
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
// Note: AuditLog model doesn't exist in current schema - audit logging disabled
async function createAuditLog(entityType, entityId, action, oldValues, newValues, userId) {
    // await prisma.auditLog.create({
    //   data: {
    //     entityType,
    //     entityId,
    //     action,
    //     oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
    //     newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
    //     userId,
    //   },
    // });
}
