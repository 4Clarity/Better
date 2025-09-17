"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusinessOperationsQuerySchema = exports.updateBusinessOperationSchema = exports.createBusinessOperationSchema = void 0;
exports.createBusinessOperation = createBusinessOperation;
exports.getBusinessOperations = getBusinessOperations;
exports.getBusinessOperationById = getBusinessOperationById;
exports.updateBusinessOperation = updateBusinessOperation;
exports.deleteBusinessOperation = deleteBusinessOperation;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
// Validation schemas
exports.createBusinessOperationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required").max(255),
    businessFunction: zod_1.z.string().min(1, "Business function is required").max(100),
    technicalDomain: zod_1.z.string().min(1, "Technical domain is required").max(100),
    description: zod_1.z.string().optional(),
    scope: zod_1.z.string().min(1, "Scope is required"),
    objectives: zod_1.z.string().min(1, "Objectives are required"),
    performanceMetrics: zod_1.z.object({
        operational: zod_1.z.array(zod_1.z.string()).optional(),
        quality: zod_1.z.array(zod_1.z.string()).optional(),
        compliance: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    supportPeriodStart: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    supportPeriodEnd: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    currentContractEnd: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    governmentPMId: zod_1.z.string(),
    directorId: zod_1.z.string(),
    currentManagerId: zod_1.z.string().optional(),
});
exports.updateBusinessOperationSchema = exports.createBusinessOperationSchema.partial();
exports.getBusinessOperationsQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    businessFunction: zod_1.z.string().optional(),
    technicalDomain: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
    sortBy: zod_1.z.enum(['name', 'businessFunction', 'technicalDomain', 'currentContractEnd', 'createdAt']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
// Service functions
async function createBusinessOperation(data) {
    const startDate = new Date(data.supportPeriodStart);
    const endDate = new Date(data.supportPeriodEnd);
    const contractEndDate = new Date(data.currentContractEnd);
    console.log('Date validation:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        contractEndDate: contractEndDate.toISOString(),
        endDateAfterStart: endDate > startDate,
        contractEndBeforeSupport: contractEndDate <= endDate
    });
    if (endDate <= startDate) {
        throw new Error('Support period end date must be after start date');
    }
    if (contractEndDate > endDate) {
        throw new Error('Current contract end cannot be after support period end');
    }
    try {
        // Check if currentManagerId is a valid User ID, otherwise set to null
        let validCurrentManagerId = null;
        if (data.currentManagerId) {
            const userExists = await prisma.user.findUnique({
                where: { id: data.currentManagerId }
            });
            validCurrentManagerId = userExists ? data.currentManagerId : null;
        }
        const createData = {
            ...data,
            supportPeriodStart: startDate,
            supportPeriodEnd: endDate,
            currentContractEnd: contractEndDate,
            performanceMetrics: data.performanceMetrics || {},
            // Use validated currentManagerId
            currentManagerId: validCurrentManagerId,
        };
        console.log('Creating business operation with data:', JSON.stringify(createData, null, 2));
        const businessOperation = await prisma.businessOperation.create({
            data: createData,
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
                },
                currentManager: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                },
                contract: {
                    select: { id: true, contractName: true, contractNumber: true, status: true }
                },
                operationStakeholder: {
                    select: { id: true, name: true, role: true, stakeholderType: true }
                },
                _count: {
                    select: { contract: true, operationStakeholder: true }
                }
            }
        });
        return businessOperation;
    }
    catch (error) {
        console.error('Create business operation error:', error);
        // Handle Prisma-specific errors
        if (error.code === 'P2021') {
            throw new Error('Database not set up: The Business Operations feature requires database tables to be created. Please contact your administrator to run the database migration.');
        }
        if (error.code?.startsWith('P')) {
            throw new Error(`Database error: ${error.message}`);
        }
        // Handle validation errors
        if (error.message?.includes('Invalid') || error.message?.includes('required')) {
            throw new Error(`Validation error: ${error.message}`);
        }
        // Pass through other specific error messages
        const errorMessage = error.message || 'Failed to create business operation';
        throw new Error(errorMessage);
    }
}
async function getBusinessOperations(query) {
    try {
        const { page, limit, sortBy, sortOrder, search, businessFunction, technicalDomain } = query;
        const skip = (page - 1) * limit;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { businessFunction: { contains: search, mode: 'insensitive' } },
                { technicalDomain: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (businessFunction) {
            where.businessFunction = { contains: businessFunction, mode: 'insensitive' };
        }
        if (technicalDomain) {
            where.technicalDomain = { contains: technicalDomain, mode: 'insensitive' };
        }
        const [data, total] = await Promise.all([
            prisma.businessOperation.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
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
                    },
                    currentManager: {
                        select: {
                            id: true,
                            person: {
                                select: { firstName: true, lastName: true, primaryEmail: true }
                            }
                        }
                    },
                    contract: {
                        select: { id: true, contractName: true, contractNumber: true, status: true }
                    },
                    _count: {
                        select: { contract: true, operationStakeholder: true }
                    }
                }
            }),
            prisma.businessOperation.count({ where })
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
    catch (error) {
        console.error('Error in getBusinessOperations:', error);
        throw error;
    }
}
async function getBusinessOperationById(id) {
    const businessOperation = await prisma.businessOperation.findUnique({
        where: { id },
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
            },
            currentManager: {
                select: {
                    id: true,
                    person: {
                        select: { firstName: true, lastName: true, primaryEmail: true }
                    }
                }
            },
            contract: {
                include: {
                    transition: {
                        select: { id: true, name: true, status: true, startDate: true, endDate: true }
                    }
                }
            },
            operationStakeholder: {
                include: {
                    user: {
                        select: {
                            id: true,
                            person: {
                                select: { firstName: true, lastName: true, primaryEmail: true }
                            }
                        }
                    }
                }
            },
            _count: {
                select: { contract: true, operationStakeholder: true }
            }
        }
    });
    if (!businessOperation) {
        throw new Error('Business operation not found');
    }
    return businessOperation;
}
async function updateBusinessOperation(id, data) {
    const existing = await getBusinessOperationById(id);
    // Validate dates if provided
    if (data.supportPeriodStart || data.supportPeriodEnd || data.currentContractEnd) {
        const startDate = data.supportPeriodStart ? new Date(data.supportPeriodStart) : existing.supportPeriodStart;
        const endDate = data.supportPeriodEnd ? new Date(data.supportPeriodEnd) : existing.supportPeriodEnd;
        const contractEndDate = data.currentContractEnd ? new Date(data.currentContractEnd) : existing.currentContractEnd;
        if (endDate <= startDate) {
            throw new Error('Support period end date must be after start date');
        }
        if (contractEndDate > endDate) {
            throw new Error('Current contract end cannot be after support period end');
        }
    }
    try {
        const updateData = { ...data };
        if (data.supportPeriodStart)
            updateData.supportPeriodStart = new Date(data.supportPeriodStart);
        if (data.supportPeriodEnd)
            updateData.supportPeriodEnd = new Date(data.supportPeriodEnd);
        if (data.currentContractEnd)
            updateData.currentContractEnd = new Date(data.currentContractEnd);
        // Check if currentManagerId is a valid User ID, otherwise set to null
        if ('currentManagerId' in data) {
            if (data.currentManagerId) {
                const userExists = await prisma.user.findUnique({
                    where: { id: data.currentManagerId }
                });
                updateData.currentManagerId = userExists ? data.currentManagerId : null;
            }
            else {
                updateData.currentManagerId = null;
            }
        }
        const businessOperation = await prisma.businessOperation.update({
            where: { id },
            data: updateData,
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
                },
                currentManager: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                },
                contract: {
                    select: { id: true, contractName: true, contractNumber: true, status: true }
                },
                operationStakeholder: {
                    select: { id: true, name: true, role: true, stakeholderType: true }
                },
                _count: {
                    select: { contract: true, operationStakeholder: true }
                }
            }
        });
        return businessOperation;
    }
    catch (error) {
        console.error('Update business operation error:', error);
        // Handle Prisma-specific errors
        if (error.code === 'P2021') {
            throw new Error('Database not set up: The Business Operations feature requires database tables to be created. Please contact your administrator to run the database migration.');
        }
        if (error.code?.startsWith('P')) {
            throw new Error(`Database error: ${error.message}`);
        }
        // Handle validation errors
        if (error.message?.includes('Invalid') || error.message?.includes('required')) {
            throw new Error(`Validation error: ${error.message}`);
        }
        // Pass through other specific error messages
        const errorMessage = error.message || 'Failed to update business operation';
        throw new Error(errorMessage);
    }
}
async function deleteBusinessOperation(id) {
    const existing = await getBusinessOperationById(id);
    // Check if there are active contracts
    const activeContracts = await prisma.contract.count({
        where: {
            businessOperationId: id,
            status: { in: ['ACTIVE', 'RENEWAL'] }
        }
    });
    if (activeContracts > 0) {
        throw new Error('Cannot delete business operation with active contracts');
    }
    await prisma.businessOperation.delete({
        where: { id }
    });
    return { message: 'Business operation deleted successfully' };
}
