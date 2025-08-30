"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContractsQuerySchema = exports.updateContractSchema = exports.createContractSchema = void 0;
exports.createContract = createContract;
exports.getContracts = getContracts;
exports.getContractById = getContractById;
exports.updateContract = updateContract;
exports.deleteContract = deleteContract;
exports.getContractsByBusinessOperation = getContractsByBusinessOperation;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
// Validation schemas
exports.createContractSchema = zod_1.z.object({
    businessOperationId: zod_1.z.string().min(1, "Business operation ID is required"),
    contractName: zod_1.z.string().min(1, "Contract name is required").max(255),
    contractNumber: zod_1.z.string().min(1, "Contract number is required").max(100),
    contractorName: zod_1.z.string().min(1, "Contractor name is required").max(255),
    contractorPMId: zod_1.z.string().optional(),
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    canBeExtended: zod_1.z.boolean().default(true),
    status: zod_1.z.enum(['PLANNING', 'ACTIVE', 'RENEWAL', 'EXPIRING', 'EXPIRED', 'EXTENDED']).default('PLANNING'),
});
exports.updateContractSchema = exports.createContractSchema.partial().omit({ businessOperationId: true });
exports.getContractsQuerySchema = zod_1.z.object({
    businessOperationId: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(['PLANNING', 'ACTIVE', 'RENEWAL', 'EXPIRING', 'EXPIRED', 'EXTENDED']).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
    sortBy: zod_1.z.enum(['contractName', 'contractNumber', 'startDate', 'endDate', 'status', 'createdAt']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
// Service functions
async function createContract(data) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate <= startDate) {
        throw new Error('Contract end date must be after start date');
    }
    // Validate business operation exists
    const businessOperation = await prisma.businessOperation.findUnique({
        where: { id: data.businessOperationId }
    });
    if (!businessOperation) {
        throw new Error('Business operation not found');
    }
    try {
        const contract = await prisma.contract.create({
            data: {
                ...data,
                startDate,
                endDate,
            },
            include: {
                businessOperation: {
                    select: { id: true, name: true, businessFunction: true }
                },
                contractorPM: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                },
                transitions: {
                    select: { id: true, name: true, status: true, startDate: true, endDate: true }
                },
                _count: {
                    select: { transitions: true }
                }
            }
        });
        return contract;
    }
    catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('contractNumber')) {
            throw new Error('Contract number already exists');
        }
        console.error('Create contract error:', error);
        throw new Error('Failed to create contract');
    }
}
async function getContracts(query) {
    const { page, limit, sortBy, sortOrder, search, businessOperationId, status } = query;
    const skip = (page - 1) * limit;
    const where = {};
    if (businessOperationId) {
        where.businessOperationId = businessOperationId;
    }
    if (status) {
        where.status = status;
    }
    if (search) {
        where.OR = [
            { contractName: { contains: search, mode: 'insensitive' } },
            { contractNumber: { contains: search, mode: 'insensitive' } },
            { contractorName: { contains: search, mode: 'insensitive' } },
        ];
    }
    const [data, total] = await Promise.all([
        prisma.contract.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
                businessOperation: {
                    select: { id: true, name: true, businessFunction: true }
                },
                contractorPM: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                },
                _count: {
                    select: { transitions: true }
                }
            }
        }),
        prisma.contract.count({ where })
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
async function getContractById(id) {
    const contract = await prisma.contract.findUnique({
        where: { id },
        include: {
            businessOperation: {
                select: {
                    id: true,
                    name: true,
                    businessFunction: true,
                    technicalDomain: true,
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
            },
            transitions: {
                include: {
                    milestones: {
                        select: { id: true, title: true, status: true, dueDate: true, priority: true }
                    }
                }
            },
            _count: {
                select: { transitions: true }
            }
        }
    });
    if (!contract) {
        throw new Error('Contract not found');
    }
    return contract;
}
async function updateContract(id, data) {
    const existing = await getContractById(id);
    // Validate dates if provided
    if (data.startDate || data.endDate) {
        const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
        const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;
        if (endDate <= startDate) {
            throw new Error('Contract end date must be after start date');
        }
    }
    try {
        const updateData = { ...data };
        if (data.startDate)
            updateData.startDate = new Date(data.startDate);
        if (data.endDate)
            updateData.endDate = new Date(data.endDate);
        const contract = await prisma.contract.update({
            where: { id },
            data: updateData,
            include: {
                businessOperation: {
                    select: { id: true, name: true, businessFunction: true }
                },
                contractorPM: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                },
                transitions: {
                    select: { id: true, name: true, status: true, startDate: true, endDate: true }
                },
                _count: {
                    select: { transitions: true }
                }
            }
        });
        return contract;
    }
    catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('contractNumber')) {
            throw new Error('Contract number already exists');
        }
        console.error('Update contract error:', error);
        throw new Error('Failed to update contract');
    }
}
async function deleteContract(id) {
    const existing = await getContractById(id);
    // Check if there are active transitions
    const activeTransitions = await prisma.transition.count({
        where: {
            contractId: id,
            status: { notIn: ['COMPLETED'] }
        }
    });
    if (activeTransitions > 0) {
        throw new Error('Cannot delete contract with active transitions');
    }
    await prisma.contract.delete({
        where: { id }
    });
    return { message: 'Contract deleted successfully' };
}
async function getContractsByBusinessOperation(businessOperationId) {
    const contracts = await prisma.contract.findMany({
        where: { businessOperationId },
        include: {
            contractorPM: {
                select: {
                    id: true,
                    person: {
                        select: { firstName: true, lastName: true, primaryEmail: true }
                    }
                }
            },
            transitions: {
                select: { id: true, name: true, status: true, startDate: true, endDate: true }
            },
            _count: {
                select: { transitions: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    return contracts;
}
