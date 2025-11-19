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
exports.createMajorTransition = createMajorTransition;
exports.createPersonnelTransition = createPersonnelTransition;
exports.createOperationalChange = createOperationalChange;
exports.getMajorTransitions = getMajorTransitions;
exports.getPersonnelTransitions = getPersonnelTransitions;
exports.getOperationalChanges = getOperationalChanges;
exports.getTransitionCounts = getTransitionCounts;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
// Map enhanced status to database status
function mapStatusToDb(status) {
    const statusMap = {
        'NOT_STARTED': 'Planning',
        'ON_TRACK': 'Active',
        'AT_RISK': 'Active',
        'BLOCKED': 'On_Hold',
        'COMPLETED': 'Completed',
    };
    return status ? (statusMap[status] || 'Planning') : 'Planning';
}
// Map database status to frontend status
function mapStatusFromDb(status) {
    const statusMap = {
        'Planning': 'NOT_STARTED',
        'Active': 'ON_TRACK',
        'On_Hold': 'BLOCKED',
        'Completed': 'COMPLETED',
    };
    return statusMap[status] || 'NOT_STARTED';
}
// Transform database transition to API response format
function transformTransition(transition) {
    return {
        ...transition,
        status: mapStatusFromDb(transition.status)
    };
}
// Enhanced schemas for the new hierarchy
exports.createEnhancedTransitionSchema = zod_1.z.object({
    contractName: zod_1.z.string().min(1, "Contract name is required").max(255),
    contractNumber: zod_1.z.string().min(1, "Contract number is required").max(100),
    name: zod_1.z.string().min(1, "Transition name is required").max(255),
    description: zod_1.z.string().optional(),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: zod_1.z.enum(['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED']).default('NOT_STARTED'),
    createdBy: zod_1.z.string().optional(),
    keyPersonnel: zod_1.z.string().optional(),
    duration: zod_1.z.enum(['IMMEDIATE', 'THIRTY_DAYS', 'FORTY_FIVE_DAYS', 'SIXTY_DAYS', 'NINETY_DAYS']).default('THIRTY_DAYS'),
    requiresContinuousService: zod_1.z.boolean().default(true),
    transitionLevel: zod_1.z.enum(['MAJOR', 'PERSONNEL', 'OPERATIONAL']).default('OPERATIONAL'),
});
exports.updateEnhancedTransitionSchema = exports.createEnhancedTransitionSchema.partial();
exports.getEnhancedTransitionsQuerySchema = zod_1.z.object({
    contractId: zod_1.z.string().optional(),
    contractName: zod_1.z.string().optional(),
    businessOperationId: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED']).optional(),
    transitionLevel: zod_1.z.enum(['MAJOR', 'PERSONNEL', 'OPERATIONAL']).optional(),
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
    // Note: Contract validation removed - using contractName/contractNumber instead
    try {
        // Remove contractId from data since it's not a valid field in the schema
        const { contractId, duration, requiresContinuousService, ...transitionData } = data;
        // Create cleaned data object and explicitly omit problematic fields
        // duration and requiresContinuousService are not in the database schema
        const cleanedData = { ...transitionData };
        // Always remove createdBy field to avoid foreign key constraint issues
        // The field should be set by authentication middleware, not by client
        delete cleanedData.createdBy;
        // Get or create default organization if not provided
        let organizationId = cleanedData.organizationId;
        if (!organizationId) {
            let defaultOrg = await prisma.organizations.findFirst({
                where: { type: 'Government_Agency' },
            });
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
        console.log('Final cleaned data for Prisma:', JSON.stringify(cleanedData, null, 2));
        const transition = await prisma.transitions.create({
            data: {
                ...cleanedData,
                id: 'trans-' + Date.now() + '-' + Math.random().toString(36).substring(7),
                organizationId,
                startDate,
                endDate,
                status: mapStatusToDb(cleanedData.status),
                updatedAt: new Date(),
                createdBy: 'system', // Default createdBy since auth middleware not always available
            },
            include: {
                // contract: {
                //   include: {
                //     businessOperation: {
                //       select: { id: true, name: true, businessFunction: true }
                //     }
                //   }
                // },
                // Note: No direct user relation - transitions use transition_users for many-to-many
                milestones: {
                    select: { id: true, title: true, status: true, dueDate: true, priority: true }
                },
                _count: {
                    select: { milestones: true }
                }
            }
        });
        return transformTransition(transition);
    }
    catch (error) {
        console.error('Create enhanced transition error:', error);
        throw error; // Re-throw the original error instead of masking it
    }
}
async function getEnhancedTransitions(query) {
    const { page, limit, sortBy, sortOrder, search, contractId, businessOperationId, status, transitionLevel } = query;
    const skip = (page - 1) * limit;
    const where = {};
    if (contractId) {
        // Transitions don't have a foreign key to contracts - they store contractName and contractNumber
        // So we need to look up the contract first to get these values
        const contract = await prisma.contracts.findUnique({
            where: { id: contractId },
            select: { contract_name: true, contract_number: true }
        });
        if (contract) {
            where.contractName = contract.contract_name;
            where.contractNumber = contract.contract_number;
        }
        else {
            // If contract not found, return empty results
            return {
                data: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0,
                }
            };
        }
    }
    // Note: businessOperationId filtering disabled - no contract relation available
    // if (businessOperationId) {
    //   where.contract = {
    //     businessOperationId: businessOperationId
    //   };
    // }
    if (status) {
        where.status = status;
    }
    if (transitionLevel) {
        where.transitionLevel = transitionLevel;
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
        prisma.transitions.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
                // contract: {
                //   include: {
                //     businessOperation: {
                //       select: { id: true, name: true, businessFunction: true }
                //     }
                //   }
                // },
                // Note: No direct user relation - transitions use transition_users for many-to-many
                _count: {
                    select: { milestones: true }
                }
            }
        }),
        prisma.transitions.count({ where })
    ]);
    return {
        data: data.map(transformTransition),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        }
    };
}
async function getEnhancedTransitionById(id) {
    const transition = await prisma.transitions.findUnique({
        where: { id },
        include: {
            // Note: contract relation disabled - transitions only have contractName/contractNumber
            // contract: {
            //   include: {
            //     businessOperation: {
            //       include: {
            //         governmentPM: {
            //           select: {
            //       id: true,
            //       person: {
            //         select: { firstName: true, lastName: true, primaryEmail: true }
            //       }
            //     }
            //         },
            //         director: {
            //           select: {
            //       id: true,
            //       person: {
            //         select: { firstName: true, lastName: true, primaryEmail: true }
            //       }
            //     }
            //         }
            //       }
            //     },
            //     contractorPM: {
            //       select: {
            //       id: true,
            //       person: {
            //         select: { firstName: true, lastName: true, primaryEmail: true }
            //       }
            //     }
            //     }
            //   }
            // },
            milestones: {
                orderBy: { dueDate: 'asc' }
            },
            tasks: {
                orderBy: { dueDate: 'asc' }
            },
            // Note: No direct user relation - transitions use transition_users for many-to-many
            // transition_users relation disabled due to complex nested relation names
            // transition_users: {
            //   include: {
            //     users_transition_users_userIdTousers: {
            //       select: {
            //         id: true,
            //         username: true
            //       }
            //     }
            //   }
            // }
        }
    });
    if (!transition) {
        throw new Error('Transition not found');
    }
    return transformTransition(transition);
}
async function updateEnhancedTransition(id, data) {
    const existing = await getEnhancedTransitionById(id);
    // Validate contract if being changed
    if (data.contractId && data.contractId !== existing.contractId) {
        const contract = await prisma.contracts.findUnique({
            where: { id: data.contractId },
            include: {
                business_operations: {
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
        // Remove unsupported fields and contractId
        const { contractId, duration, requiresContinuousService, ...cleanData } = data;
        const updateData = { ...cleanData };
        if (data.startDate)
            updateData.startDate = new Date(data.startDate);
        if (data.endDate)
            updateData.endDate = new Date(data.endDate);
        // Map status from frontend format to database format
        if (data.status) {
            updateData.status = mapStatusToDb(data.status);
        }
        const transition = await prisma.transitions.update({
            where: { id },
            data: updateData,
            include: {
                // contract: {
                //   include: {
                //     businessOperation: {
                //       select: { id: true, name: true, businessFunction: true }
                //     }
                //   }
                // },
                // Note: No direct user relation - transitions use transition_users for many-to-many
                milestones: {
                    select: { id: true, title: true, status: true, dueDate: true, priority: true }
                },
                _count: {
                    select: { milestones: true }
                }
            }
        });
        return transformTransition(transition);
    }
    catch (error) {
        console.error('Update enhanced transition error:', error);
        throw new Error('Failed to update transition');
    }
}
async function deleteEnhancedTransition(id) {
    // Validate transition exists before deleting
    await getEnhancedTransitionById(id);
    await prisma.transitions.delete({
        where: { id }
    });
    return { message: 'Transition deleted successfully' };
}
// Milestone management functions
async function createMilestone(transitionId, data) {
    const transition = await prisma.transitions.findUnique({
        where: { id: transitionId }
    });
    if (!transition) {
        throw new Error('Transition not found');
    }
    const milestone = await prisma.milestones.create({
        data: {
            ...data,
            dueDate: new Date(data.dueDate),
            transitionId,
        }
    });
    return milestone;
}
async function updateMilestoneStatus(milestoneId, status) {
    const milestone = await prisma.milestones.update({
        where: { id: milestoneId },
        data: { status }
    });
    return milestone;
}
// Legacy compatibility functions
async function getLegacyTransitions() {
    // Return transitions that still use the legacy format
    const legacyTransitions = await prisma.transitions.findMany({
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
// Level-specific creation functions
async function createMajorTransition(data) {
    return createEnhancedTransition(data);
}
async function createPersonnelTransition(data) {
    return createEnhancedTransition(data);
}
async function createOperationalChange(data) {
    return createEnhancedTransition(data);
}
// Level-specific query functions
async function getMajorTransitions(query) {
    return getEnhancedTransitions({ ...query, transitionLevel: 'MAJOR' });
}
async function getPersonnelTransitions(query) {
    return getEnhancedTransitions({ ...query, transitionLevel: 'PERSONNEL' });
}
async function getOperationalChanges(query) {
    return getEnhancedTransitions({ ...query, transitionLevel: 'OPERATIONAL' });
}
// Analytics functions for dashboard
async function getTransitionCounts() {
    const [major, personnel, operational, total] = await Promise.all([
        prisma.transitions.count({ where: { transitionLevel: 'MAJOR' } }),
        prisma.transitions.count({ where: { transitionLevel: 'PERSONNEL' } }),
        prisma.transitions.count({ where: { transitionLevel: 'OPERATIONAL' } }),
        prisma.transitions.count()
    ]);
    return {
        major,
        personnel,
        operational,
        total
    };
}
