"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBusinessOperationsQuerySchema = exports.updateBusinessOperationSchema = exports.createBusinessOperationSchema = void 0;
exports.createBusinessOperation = createBusinessOperation;
exports.getBusinessOperations = getBusinessOperations;
exports.getBusinessOperationById = getBusinessOperationById;
exports.updateBusinessOperation = updateBusinessOperation;
exports.deleteBusinessOperation = deleteBusinessOperation;
exports.linkToBusinessOperation = linkToBusinessOperation;
exports.unlinkFromBusinessOperation = unlinkFromBusinessOperation;
exports.getProgramsAndProductsByOperation = getProgramsAndProductsByOperation;
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
// Helper function to transform user data from database format to API format
function transformUserResponse(dbUser) {
    if (!dbUser)
        return undefined;
    return {
        id: dbUser.id,
        firstName: dbUser.person?.firstName || '',
        lastName: dbUser.person?.lastName || '',
        email: dbUser.person?.primaryEmail || '',
    };
}
// Transform database snake_case to API camelCase
function transformBusinessOperationResponse(dbOperation) {
    return {
        id: dbOperation.id,
        name: dbOperation.name,
        businessFunction: dbOperation.business_function,
        technicalDomain: dbOperation.technical_domain,
        description: dbOperation.description,
        scope: dbOperation.scope,
        objectives: dbOperation.objectives,
        performanceMetrics: dbOperation.performance_metrics,
        supportPeriodStart: dbOperation.support_period_start,
        supportPeriodEnd: dbOperation.support_period_end,
        currentContractEnd: dbOperation.current_contract_end,
        governmentPMId: dbOperation.government_pm_id,
        directorId: dbOperation.director_id,
        currentManagerId: dbOperation.current_manager_id,
        securityClassification: dbOperation.security_classification,
        createdAt: dbOperation.created_at,
        updatedAt: dbOperation.updated_at,
        createdBy: dbOperation.created_by,
        updatedBy: dbOperation.updated_by,
        // Transform user relations to flatten the person structure
        governmentPM: transformUserResponse(dbOperation.users_business_operations_government_pm_idTousers),
        director: transformUserResponse(dbOperation.users_business_operations_director_idTousers),
        currentManager: transformUserResponse(dbOperation.users_business_operations_current_manager_idTousers),
        _count: dbOperation._count,
    };
}
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
    // Allow contracts to extend beyond support period for flexibility
    // Note: Removed validation that required contractEndDate <= endDate
    // This allows for contract extensions and transition periods
    try {
        // Validate required user IDs exist
        const [governmentPM, director] = await Promise.all([
            prisma.user.findUnique({ where: { id: data.governmentPMId } }),
            prisma.user.findUnique({ where: { id: data.directorId } })
        ]);
        if (!governmentPM) {
            throw new Error(`Government PM with ID "${data.governmentPMId}" not found. Please select a valid user.`);
        }
        if (!director) {
            throw new Error(`Director with ID "${data.directorId}" not found. Please select a valid user.`);
        }
        // Check if currentManagerId is a valid User ID, otherwise set to null
        let validCurrentManagerId = null;
        if (data.currentManagerId) {
            const userExists = await prisma.user.findUnique({
                where: { id: data.currentManagerId }
            });
            validCurrentManagerId = userExists ? data.currentManagerId : null;
        }
        // Get user ID from request context - for now use governmentPMId as creator
        // TODO: Replace with actual authenticated user ID from request context
        const creatorUserId = data.governmentPMId;
        const createData = {
            name: data.name,
            description: data.description,
            business_function: data.businessFunction,
            technical_domain: data.technicalDomain,
            scope: data.scope,
            objectives: data.objectives,
            deliverables: '', // Business Operations don't use deliverables field in same way
            performance_metrics: data.performanceMetrics || {},
            support_period_start: startDate,
            support_period_end: endDate,
            current_contract_end: contractEndDate,
            government_pm_id: data.governmentPMId,
            director_id: data.directorId,
            current_manager_id: validCurrentManagerId,
            security_classification: 'UNCLASSIFIED', // Default to UNCLASSIFIED
            // Required audit fields
            created_by: creatorUserId,
            updated_by: creatorUserId,
        };
        console.log('Creating business operation with data:', JSON.stringify(createData, null, 2));
        const businessOperation = await prisma.business_operations.create({
            data: createData,
            include: {
                users_business_operations_created_byTousers: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                },
                users_business_operations_updated_byTousers: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                },
                users_business_operations_government_pm_idTousers: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                },
                users_business_operations_director_idTousers: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                },
                users_business_operations_current_manager_idTousers: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                }
            }
        });
        return transformBusinessOperationResponse(businessOperation);
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
                { business_function: { contains: search, mode: 'insensitive' } },
                { technical_domain: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (businessFunction) {
            where.business_function = { contains: businessFunction, mode: 'insensitive' };
        }
        if (technicalDomain) {
            where.technical_domain = { contains: technicalDomain, mode: 'insensitive' };
        }
        // Map sortBy fields to snake_case database columns
        const sortByMap = {
            name: 'name',
            businessFunction: 'business_function',
            technicalDomain: 'technical_domain',
            currentContractEnd: 'current_contract_end',
            createdAt: 'created_at'
        };
        const dbSortBy = sortByMap[sortBy] || 'created_at';
        const [data, total] = await Promise.all([
            prisma.business_operations.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [dbSortBy]: sortOrder },
                include: {
                    users_business_operations_government_pm_idTousers: {
                        select: {
                            id: true,
                            person: {
                                select: { firstName: true, lastName: true, primaryEmail: true }
                            }
                        }
                    },
                    users_business_operations_director_idTousers: {
                        select: {
                            id: true,
                            person: {
                                select: { firstName: true, lastName: true, primaryEmail: true }
                            }
                        }
                    },
                    users_business_operations_current_manager_idTousers: {
                        select: {
                            id: true,
                            person: {
                                select: { firstName: true, lastName: true, primaryEmail: true }
                            }
                        }
                    }
                }
            }),
            prisma.business_operations.count({ where })
        ]);
        return {
            data: data.map(op => transformBusinessOperationResponse(op)),
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
    const businessOperation = await prisma.business_operations.findUnique({
        where: { id },
        include: {
            users_business_operations_government_pm_idTousers: {
                select: {
                    id: true,
                    person: {
                        select: { firstName: true, lastName: true, primaryEmail: true }
                    }
                }
            },
            users_business_operations_director_idTousers: {
                select: {
                    id: true,
                    person: {
                        select: { firstName: true, lastName: true, primaryEmail: true }
                    }
                }
            },
            users_business_operations_current_manager_idTousers: {
                select: {
                    id: true,
                    person: {
                        select: { firstName: true, lastName: true, primaryEmail: true }
                    }
                }
            },
            _count: {
                select: {
                    contracts: true,
                    product_programs: true
                }
            }
        }
    });
    if (!businessOperation) {
        throw new Error('Business operation not found');
    }
    return transformBusinessOperationResponse(businessOperation);
}
async function updateBusinessOperation(id, data) {
    const existing = await getBusinessOperationById(id);
    console.log('Update business operation - received data:', JSON.stringify(data, null, 2));
    // Validate dates if provided
    if (data.supportPeriodStart || data.supportPeriodEnd) {
        const startDate = data.supportPeriodStart ? new Date(data.supportPeriodStart) : existing.support_period_start;
        const endDate = data.supportPeriodEnd ? new Date(data.supportPeriodEnd) : existing.support_period_end;
        if (endDate <= startDate) {
            throw new Error('Support period end date must be after start date');
        }
    }
    try {
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.description !== undefined)
            updateData.description = data.description;
        if (data.businessFunction !== undefined)
            updateData.business_function = data.businessFunction;
        if (data.technicalDomain !== undefined)
            updateData.technical_domain = data.technicalDomain;
        if (data.scope !== undefined)
            updateData.scope = data.scope;
        if (data.objectives !== undefined)
            updateData.objectives = data.objectives;
        if (data.performanceMetrics !== undefined)
            updateData.performance_metrics = data.performanceMetrics;
        if (data.supportPeriodStart !== undefined)
            updateData.support_period_start = new Date(data.supportPeriodStart);
        if (data.supportPeriodEnd !== undefined)
            updateData.support_period_end = new Date(data.supportPeriodEnd);
        if (data.currentContractEnd !== undefined)
            updateData.current_contract_end = new Date(data.currentContractEnd);
        console.log('Update business operation - updateData:', JSON.stringify(updateData, null, 2));
        // Validate required user IDs exist if they're being updated
        if ('governmentPMId' in data && data.governmentPMId) {
            const governmentPM = await prisma.user.findUnique({ where: { id: data.governmentPMId } });
            if (!governmentPM) {
                throw new Error(`Government PM with ID "${data.governmentPMId}" not found. Please select a valid user.`);
            }
            updateData.government_pm_id = data.governmentPMId;
        }
        if ('directorId' in data && data.directorId) {
            const director = await prisma.user.findUnique({ where: { id: data.directorId } });
            if (!director) {
                throw new Error(`Director with ID "${data.directorId}" not found. Please select a valid user.`);
            }
            updateData.director_id = data.directorId;
        }
        // Check if currentManagerId is a valid User ID, otherwise set to null
        if ('currentManagerId' in data) {
            if (data.currentManagerId) {
                const userExists = await prisma.user.findUnique({
                    where: { id: data.currentManagerId }
                });
                updateData.current_manager_id = userExists ? data.currentManagerId : null;
            }
            else {
                updateData.current_manager_id = null;
            }
        }
        const businessOperation = await prisma.business_operations.update({
            where: { id },
            data: updateData,
            include: {
                users_business_operations_government_pm_idTousers: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                },
                users_business_operations_director_idTousers: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                },
                users_business_operations_current_manager_idTousers: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                }
            }
        });
        return transformBusinessOperationResponse(businessOperation);
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
    // Verify the business operation exists
    await getBusinessOperationById(id);
    // Check if there are any programs/products linked to this operation
    const linkedItems = await prisma.product_programs.count({
        where: {
            business_operation_id: id
        }
    });
    if (linkedItems > 0) {
        throw new Error('Cannot delete business operation with linked programs or products. Please unlink them first.');
    }
    await prisma.business_operations.delete({
        where: { id }
    });
    return { message: 'Business operation deleted successfully' };
}
// ============================================
// Business Operation Linking Methods
// Story 4.2 - Phase 3
// ============================================
/**
 * Link a Program or Product to a Business Operation
 * @param programProductId - The ID of the Program or Product to link
 * @param businessOperationId - The ID of the Business Operation to link to
 * @returns The updated Program/Product with business operation data
 */
async function linkToBusinessOperation(programProductId, businessOperationId) {
    // Validate that the program/product exists and is not an Operation itself
    const programProduct = await prisma.product_programs.findUnique({
        where: { id: programProductId },
        select: { id: true, name: true, business_operation_type: true }
    });
    if (!programProduct) {
        throw new Error('Program/Product not found');
    }
    if (programProduct.business_operation_type === 'Operation') {
        throw new Error('Cannot link an Operation to another Operation. Only Programs and Products can be linked to Operations.');
    }
    // Validate that the business operation exists
    // Business Operations are now in the business_operations table
    const businessOperation = await prisma.business_operations.findUnique({
        where: { id: businessOperationId },
        select: { id: true, name: true }
    });
    if (!businessOperation) {
        throw new Error('Business Operation not found');
    }
    // Update the program/product with the business operation link
    const updated = await prisma.product_programs.update({
        where: { id: programProductId },
        data: { business_operation_id: businessOperationId },
        include: {
            business_operation: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                    business_function: true,
                    technical_domain: true
                }
            }
        }
    });
    console.log(`${programProduct.business_operation_type} ${programProductId} linked to Business Operation ${businessOperationId}`);
    return updated;
}
/**
 * Unlink a Program or Product from its Business Operation
 * @param programProductId - The ID of the Program or Product to unlink
 * @returns The updated Program/Product
 */
async function unlinkFromBusinessOperation(programProductId) {
    // Validate that the program/product exists
    const programProduct = await prisma.product_programs.findUnique({
        where: { id: programProductId },
        select: { id: true, business_operation_id: true, business_operation_type: true }
    });
    if (!programProduct) {
        throw new Error('Program/Product not found');
    }
    if (!programProduct.business_operation_id) {
        throw new Error('Program/Product is not currently linked to any Business Operation');
    }
    if (programProduct.business_operation_type === 'Operation') {
        throw new Error('Cannot unlink an Operation. Only Programs and Products can be unlinked.');
    }
    // Remove the business operation link
    const updated = await prisma.product_programs.update({
        where: { id: programProductId },
        data: { business_operation_id: null }
    });
    console.log(`${programProduct.business_operation_type} ${programProductId} unlinked from Business Operation`);
    return updated;
}
/**
 * Get all Programs and Products linked to a specific Business Operation
 * @param businessOperationId - The ID of the Business Operation
 * @returns Array of Programs and Products
 */
async function getProgramsAndProductsByOperation(businessOperationId) {
    // Validate that the business operation exists
    // Business Operations are now in the business_operations table
    const businessOperation = await prisma.business_operations.findUnique({
        where: { id: businessOperationId },
        select: { id: true, name: true }
    });
    if (!businessOperation) {
        throw new Error('Business Operation not found');
    }
    // Get all programs and products linked to this operation
    const programsAndProducts = await prisma.product_programs.findMany({
        where: { business_operation_id: businessOperationId },
        select: {
            id: true,
            name: true,
            description: true,
            objectives: true,
            deliverables: true,
            business_operation_type: true,
            security_classification: true,
            created_at: true,
            updated_at: true,
            _count: {
                select: {
                    transitions: true,
                    product_program_stakeholders: true
                }
            }
        },
        orderBy: [
            { business_operation_type: 'asc' }, // Operations, then Programs, then Products
            { name: 'asc' }
        ]
    });
    return programsAndProducts;
}
