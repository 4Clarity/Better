"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnhancedTransitionsQuerySchema = exports.updateEnhancedTransitionSchema = exports.createEnhancedTransitionSchema = void 0;
exports.createEnhancedTransition = createEnhancedTransition;
exports.getEnhancedTransitions = getEnhancedTransitions;
exports.getEnhancedTransitionById = getEnhancedTransitionById;
exports.updateEnhancedTransition = updateEnhancedTransition;
exports.deleteEnhancedTransition = deleteEnhancedTransition;
exports.createMilestone = createMilestone;
exports.updateMilestoneStatus = updateMilestoneStatus;
exports.getLegacyTransitions = getLegacyTransitions;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
// Enhanced schemas for the new hierarchy
exports.createEnhancedTransitionSchema = zod_1.z.object({
    contractId: zod_1.z.string().min(1, "Contract ID is required"),
    name: zod_1.z.string().min(1, "Transition name is required").max(255),
    description: zod_1.z.string().optional(),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    duration: zod_1.z.enum(['IMMEDIATE', 'THIRTY_DAYS', 'FORTY_FIVE_DAYS', 'SIXTY_DAYS', 'NINETY_DAYS']).default('THIRTY_DAYS'),
    keyPersonnel: zod_1.z.string().optional(),
    status: zod_1.z.enum(['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED']).default('NOT_STARTED'),
    requiresContinuousService: zod_1.z.boolean().default(true),
    createdBy: zod_1.z.string().optional(),
});
exports.updateEnhancedTransitionSchema = exports.createEnhancedTransitionSchema.partial();
exports.getEnhancedTransitionsQuerySchema = zod_1.z.object({
    contractId: zod_1.z.string().optional(),
    businessOperationId: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED']).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
    sortBy: zod_1.z.enum(['name', 'startDate', 'endDate', 'status', 'createdAt']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
// Enhanced service functions
async function createEnhancedTransition(data) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate <= startDate) {
        throw new Error('End date must be after start date');
    }
    // Validate contract exists
    const contract = await prisma.contract.findUnique({
        where: { id: data.contractId },
        include: {
            businessOperation: {
                select: { id: true, name: true }
            }
        }
    });
    if (!contract) {
        throw new Error('Contract not found');
    }
    try {
        const transition = await prisma.transition.create({
            data: {
                ...data,
                startDate,
                endDate,
                // Clear legacy fields for new transitions
                contractName: null,
                contractNumber: null,
            },
            include: {
                contract: {
                    include: {
                        businessOperation: {
                            select: { id: true, name: true, businessFunction: true }
                        }
                    }
                },
                creator: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                },
                milestones: {
                    select: { id: true, title: true, status: true, dueDate: true, priority: true }
                },
                _count: {
                    select: { milestones: true }
                }
            }
        });
        return transition;
    }
    catch (error) {
        console.error('Create enhanced transition error:', error);
        throw new Error('Failed to create transition');
    }
}
async function getEnhancedTransitions(query) {
    const { page, limit, sortBy, sortOrder, search, contractId, businessOperationId, status } = query;
    const skip = (page - 1) * limit;
    const where = {};
    if (contractId) {
        where.contractId = contractId;
    }
    if (businessOperationId) {
        where.contract = {
            businessOperationId: businessOperationId
        };
    }
    if (status) {
        where.status = status;
    }
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { contract: { contractName: { contains: search, mode: 'insensitive' } } },
            { contract: { contractNumber: { contains: search, mode: 'insensitive' } } },
        ];
    }
    const [data, total] = await Promise.all([
        prisma.transition.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
                contract: {
                    include: {
                        businessOperation: {
                            select: { id: true, name: true, businessFunction: true }
                        }
                    }
                },
                creator: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                },
                _count: {
                    select: { milestones: true }
                }
            }
        }),
        prisma.transition.count({ where })
    ]);
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        }
    };
}
async function getEnhancedTransitionById(id) {
    const transition = await prisma.transition.findUnique({
        where: { id },
        include: {
            contract: {
                include: {
                    businessOperation: {
                        include: {
                            governmentPM: {
                                select: {
                                    id: true,
                                    person: {
                                        select: { firstName: true, lastName: true, primaryEmail: true }
                                    }
                                }
                            },
                            director: {
                                select: {
                                    id: true,
                                    person: {
                                        select: { firstName: true, lastName: true, primaryEmail: true }
                                    }
                                }
                            }
                        }
                    },
                    contractorPM: {
                        select: {
                            id: true,
                            person: {
                                select: { firstName: true, lastName: true, primaryEmail: true }
                            }
                        }
                    }
                }
            },
            creator: {
                select: {
                    id: true,
                    person: {
                        select: { firstName: true, lastName: true, primaryEmail: true }
                    }
                }
            },
            milestones: {
                include: {
                    _count: {
                        select: { auditLogs: true }
                    }
                },
                orderBy: { dueDate: 'asc' }
            },
            auditLogs: {
                include: {
                    user: {
                        select: {
                            id: true,
                            person: {
                                select: { firstName: true, lastName: true, primaryEmail: true }
                            }
                        }
                    }
                },
                orderBy: { timestamp: 'desc' },
                take: 10
            }
        }
    });
    if (!transition) {
        throw new Error('Transition not found');
    }
    return transition;
}
async function updateEnhancedTransition(id, data) {
    const existing = await getEnhancedTransitionById(id);
    // Validate contract if being changed
    if (data.contractId && data.contractId !== existing.contractId) {
        const contract = await prisma.contract.findUnique({
            where: { id: data.contractId },
            include: {
                businessOperation: {
                    select: { id: true, name: true }
                }
            }
        });
        if (!contract) {
            throw new Error('Contract not found');
        }
    }
    // Validate dates if provided
    if (data.startDate || data.endDate) {
        const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
        const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;
        if (endDate <= startDate) {
            throw new Error('End date must be after start date');
        }
    }
    try {
        const updateData = { ...data };
        if (data.startDate)
            updateData.startDate = new Date(data.startDate);
        if (data.endDate)
            updateData.endDate = new Date(data.endDate);
        const transition = await prisma.transition.update({
            where: { id },
            data: updateData,
            include: {
                contract: {
                    include: {
                        businessOperation: {
                            select: { id: true, name: true, businessFunction: true }
                        }
                    }
                },
                creator: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                },
                milestones: {
                    select: { id: true, title: true, status: true, dueDate: true, priority: true }
                },
                _count: {
                    select: { milestones: true }
                }
            }
        });
        return transition;
    }
    catch (error) {
        console.error('Update enhanced transition error:', error);
        throw new Error('Failed to update transition');
    }
}
async function deleteEnhancedTransition(id) {
    // Validate transition exists before deleting
    await getEnhancedTransitionById(id);
    await prisma.transition.delete({
        where: { id }
    });
    return { message: 'Transition deleted successfully' };
}
// Milestone management functions
async function createMilestone(transitionId, data) {
    const transition = await prisma.transition.findUnique({
        where: { id: transitionId }
    });
    if (!transition) {
        throw new Error('Transition not found');
    }
    const milestone = await prisma.milestone.create({
        data: {
            ...data,
            dueDate: new Date(data.dueDate),
            transitionId,
        }
    });
    return milestone;
}
async function updateMilestoneStatus(milestoneId, status) {
    const milestone = await prisma.milestone.update({
        where: { id: milestoneId },
        data: { status }
    });
    return milestone;
}
// Legacy compatibility functions
async function getLegacyTransitions() {
    // Return transitions that still use the legacy format
    const legacyTransitions = await prisma.transition.findMany({
        where: {
            contractId: null,
            contractName: { not: null },
            contractNumber: { not: null }
        },
        select: {
            id: true,
            contractName: true,
            contractNumber: true,
            startDate: true,
            endDate: true,
            status: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { createdAt: 'desc' }
    });
    return legacyTransitions;
}
