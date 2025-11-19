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
exports.assignToProductProgram = assignToProductProgram;
exports.removeFromProductProgram = removeFromProductProgram;
exports.getTransitionsByProductProgram = getTransitionsByProductProgram;
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
    organizationId: zod_1.z.string().optional(), // Optional - will use default if not provided
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
    name: zod_1.z.string(),
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
    // Get or create a default organization if not provided
    let organizationId = data.organizationId;
    if (!organizationId) {
        // Try to find an existing default organization
        let defaultOrg = await prisma.organizations.findFirst({
            where: { type: 'Government_Agency' },
        });
        // If no organization exists, create a default one
        if (!defaultOrg) {
            defaultOrg = await prisma.organizations.create({
                data: {
                    id: 'default-org-' + Date.now(),
                    name: 'Default Organization',
                    type: 'Government_Agency',
                    isActive: true,
                    updatedAt: new Date(),
                },
            });
        }
        organizationId = defaultOrg.id;
    }
    try {
        const transition = await prisma.transitions.create({
            data: {
                ...data,
                id: 'trans-' + Date.now() + '-' + Math.random().toString(36).substring(7),
                name: data.contractName, // Set name to contractName to satisfy schema requirement
                organizationId,
                startDate,
                endDate,
                updatedAt: new Date(),
                createdBy: userId,
            },
            include: {
                _count: {
                    select: {
                        milestones: true,
                    },
                },
            },
        });
        // Note: Audit logging removed - no general audit_logs model exists
        console.log(`Transition created: ${transition.id} by user ${userId}`);
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
        prisma.transitions.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
                _count: {
                    select: {
                        milestones: true,
                    },
                },
            },
        }),
        prisma.transitions.count({ where }),
    ]);
    // Debug: Log the first transition to see all fields
    if (data.length > 0) {
        console.log('Sample transition from DB:', JSON.stringify(data[0], null, 2));
    }
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
    const transition = await prisma.transitions.findFirst({
        where: {
            id,
            createdBy: userId, // Security: only show transitions created by this user
        },
        include: {
            milestones: {
                orderBy: { dueDate: 'asc' },
            },
            _count: {
                select: {
                    milestones: true,
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
    const existingTransition = await prisma.transitions.findFirst({
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
        const updatedTransition = await prisma.transitions.update({
            where: { id },
            data: updateData,
            include: {
                _count: {
                    select: {
                        milestones: true,
                    },
                },
            },
        });
        // Note: Audit logging removed - no general audit_logs model exists
        console.log(`Transition updated: ${id} by user ${userId}`);
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
    const existingTransition = await prisma.transitions.findFirst({
        where: { id, createdBy: userId },
    });
    if (!existingTransition) {
        throw new Error('Transition not found');
    }
    const updatedTransition = await prisma.transitions.update({
        where: { id },
        data: { status: data.status },
        include: {
            _count: {
                select: {
                    milestones: true,
                },
            },
        },
    });
    // Note: Audit logging removed - no general audit_logs model exists
    console.log(`Transition status updated: ${id} from ${existingTransition.status} to ${data.status} by user ${userId}`);
    return updatedTransition;
}
async function deleteTransition(id, userId) {
    const existingTransition = await prisma.transitions.findFirst({
        where: { id, createdBy: userId },
        include: { milestones: true },
    });
    if (!existingTransition) {
        throw new Error('Transition not found');
    }
    // Hard delete the transition
    await prisma.transitions.delete({
        where: { id },
    });
    // Note: Audit logging removed - no general audit_logs model exists
    console.log(`Transition deleted: ${id} by user ${userId}`);
    return { message: 'Transition deleted successfully' };
}
// ============================================
// Product/Program Categorization Functions
// Story 4.2 - Phase 2
// ============================================
/**
 * Assigns a transition to a Product/Program
 * @param transitionId - The ID of the transition to assign
 * @param productProgramId - The ID of the product/program to assign to
 * @param assignedBy - The user ID performing the assignment
 * @returns The updated transition with product/program data
 */
async function assignToProductProgram(transitionId, productProgramId, assignedBy) {
    // Validate transition exists
    const transition = await prisma.transitions.findUnique({
        where: { id: transitionId },
    });
    if (!transition) {
        throw new Error('Transition not found');
    }
    // Validate product/program exists
    const productProgram = await prisma.product_programs.findUnique({
        where: { id: productProgramId },
    });
    if (!productProgram) {
        throw new Error('Product/Program not found');
    }
    // Update transition with product/program assignment
    const updatedTransition = await prisma.transitions.update({
        where: { id: transitionId },
        data: { productProgramId: productProgramId },
        include: {
            product_programs: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                },
            },
        },
    });
    console.log(`Transition ${transitionId} assigned to Product/Program ${productProgramId} by user ${assignedBy}`);
    return updatedTransition;
}
/**
 * Removes the Product/Program assignment from a transition
 * @param transitionId - The ID of the transition to unassign
 * @param removedBy - The user ID performing the removal
 * @returns The updated transition
 */
async function removeFromProductProgram(transitionId, removedBy) {
    // Validate transition exists
    const transition = await prisma.transitions.findUnique({
        where: { id: transitionId },
    });
    if (!transition) {
        throw new Error('Transition not found');
    }
    if (!transition.productProgramId) {
        throw new Error('Transition is not assigned to any Product/Program');
    }
    // Remove product/program assignment
    const updatedTransition = await prisma.transitions.update({
        where: { id: transitionId },
        data: { productProgramId: null },
    });
    console.log(`Transition ${transitionId} unassigned from Product/Program by user ${removedBy}`);
    return updatedTransition;
}
/**
 * Gets all transitions assigned to a specific Product/Program
 * @param productProgramId - The ID of the product/program
 * @returns Array of transitions with basic details
 */
async function getTransitionsByProductProgram(productProgramId) {
    // Validate product/program exists
    const productProgram = await prisma.product_programs.findUnique({
        where: { id: productProgramId },
    });
    if (!productProgram) {
        throw new Error('Product/Program not found');
    }
    // Get all transitions assigned to this product/program
    const transitions = await prisma.transitions.findMany({
        where: { productProgramId: productProgramId },
        select: {
            id: true,
            name: true,
            contractName: true,
            contractNumber: true,
            status: true,
            startDate: true,
            endDate: true,
            description: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { startDate: 'desc' },
    });
    return transitions;
}
