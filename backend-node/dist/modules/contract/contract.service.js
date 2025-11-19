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
// Helper function to transform database contract to API format
function transformContract(contract) {
    return {
        id: contract.id,
        businessOperationId: contract.business_operation_id,
        contractName: contract.contract_name,
        contractNumber: contract.contract_number,
        contractorName: contract.contractor_name,
        contractorPMId: contract.contractor_pm_id,
        startDate: contract.start_date.toISOString().split('T')[0],
        endDate: contract.end_date.toISOString().split('T')[0],
        canBeExtended: contract.can_be_extended,
        status: contract.status,
        createdAt: contract.created_at.toISOString(),
        updatedAt: contract.updated_at.toISOString(),
        businessOperation: contract.business_operations ? {
            id: contract.business_operations.id,
            name: contract.business_operations.name,
            businessFunction: contract.business_operations.business_function,
            technicalDomain: contract.business_operations.technical_domain,
            governmentPM: contract.business_operations.users_business_operations_government_pm_idTousers,
            director: contract.business_operations.users_business_operations_director_idTousers,
        } : undefined,
        contractorPM: contract.users_contracts_contractor_pm_idTousers,
        _count: contract._count,
    };
}
// Service functions
async function createContract(data) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate <= startDate) {
        throw new Error('Contract end date must be after start date');
    }
    // Validate business operation exists
    const businessOperation = await prisma.business_operations.findUnique({
        where: { id: data.businessOperationId }
    });
    if (!businessOperation) {
        throw new Error('Business operation not found');
    }
    // Validate contractor PM if provided
    let contractorPMId = null;
    if (data.contractorPMId && data.contractorPMId.trim() !== '') {
        const contractorPM = await prisma.user.findUnique({
            where: { id: data.contractorPMId }
        });
        if (!contractorPM) {
            throw new Error('Contractor PM not found. Please select a valid user.');
        }
        contractorPMId = data.contractorPMId;
    }
    try {
        const contract = await prisma.contracts.create({
            data: {
                business_operation_id: data.businessOperationId,
                contractor_pm_id: contractorPMId,
                contract_name: data.contractName,
                contract_number: data.contractNumber,
                contractor_name: data.contractorName,
                start_date: startDate,
                end_date: endDate,
                can_be_extended: data.canBeExtended,
                status: data.status,
            },
            include: {
                business_operations: {
                    select: { id: true, name: true, business_function: true }
                },
                users_contracts_contractor_pm_idTousers: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                }
            }
        });
        return transformContract(contract);
    }
    catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('contract_number')) {
            throw new Error('Contract number already exists');
        }
        if (error.code === 'P2003') {
            // Foreign key constraint violation
            throw new Error('Invalid reference: Please ensure all selected users exist in the system');
        }
        console.error('Create contract error:', error);
        throw new Error('Failed to create contract: ' + (error.message || 'Unknown error'));
    }
}
async function getContracts(query) {
    const { page, limit, sortBy, sortOrder, search, businessOperationId, status } = query;
    const skip = (page - 1) * limit;
    const where = {};
    if (businessOperationId) {
        where.business_operation_id = businessOperationId;
    }
    if (status) {
        where.status = status;
    }
    if (search) {
        where.OR = [
            { contract_name: { contains: search, mode: 'insensitive' } },
            { contract_number: { contains: search, mode: 'insensitive' } },
            { contractor_name: { contains: search, mode: 'insensitive' } },
        ];
    }
    // Map camelCase sortBy to snake_case database columns
    const sortByMap = {
        contractName: 'contract_name',
        contractNumber: 'contract_number',
        startDate: 'start_date',
        endDate: 'end_date',
        status: 'status',
        createdAt: 'created_at'
    };
    const dbSortBy = sortByMap[sortBy] || 'created_at';
    const [data, total] = await Promise.all([
        prisma.contracts.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [dbSortBy]: sortOrder },
            include: {
                business_operations: {
                    select: { id: true, name: true, business_function: true }
                },
                users_contracts_contractor_pm_idTousers: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                }
            }
        }),
        prisma.contracts.count({ where })
    ]);
    return {
        data: data.map(transformContract),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        }
    };
}
async function getContractById(id) {
    const contract = await prisma.contracts.findUnique({
        where: { id },
        include: {
            business_operations: {
                select: {
                    id: true,
                    name: true,
                    business_function: true,
                    technical_domain: true,
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
                    }
                }
            },
            users_contracts_contractor_pm_idTousers: {
                select: {
                    id: true,
                    person: {
                        select: { firstName: true, lastName: true, primaryEmail: true }
                    }
                }
            }
        }
    });
    if (!contract) {
        throw new Error('Contract not found');
    }
    return transformContract(contract);
}
async function updateContract(id, data) {
    const existing = await getContractById(id);
    // Validate dates if provided
    if (data.startDate || data.endDate) {
        const startDate = data.startDate ? new Date(data.startDate) : existing.start_date;
        const endDate = data.endDate ? new Date(data.endDate) : existing.end_date;
        if (endDate <= startDate) {
            throw new Error('Contract end date must be after start date');
        }
    }
    // Validate contractor PM if provided
    if (data.contractorPMId !== undefined && data.contractorPMId !== null && data.contractorPMId.trim() !== '') {
        const contractorPM = await prisma.user.findUnique({
            where: { id: data.contractorPMId }
        });
        if (!contractorPM) {
            throw new Error('Contractor PM not found. Please select a valid user.');
        }
    }
    try {
        const updateData = {};
        if (data.contractName)
            updateData.contract_name = data.contractName;
        if (data.contractNumber)
            updateData.contract_number = data.contractNumber;
        if (data.contractorName)
            updateData.contractor_name = data.contractorName;
        if (data.contractorPMId !== undefined) {
            updateData.contractor_pm_id = (data.contractorPMId && data.contractorPMId.trim() !== '') ? data.contractorPMId : null;
        }
        if (data.startDate)
            updateData.start_date = new Date(data.startDate);
        if (data.endDate)
            updateData.end_date = new Date(data.endDate);
        if (data.canBeExtended !== undefined)
            updateData.can_be_extended = data.canBeExtended;
        if (data.status)
            updateData.status = data.status;
        const contract = await prisma.contracts.update({
            where: { id },
            data: updateData,
            include: {
                business_operations: {
                    select: { id: true, name: true, business_function: true }
                },
                users_contracts_contractor_pm_idTousers: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                }
            }
        });
        return transformContract(contract);
    }
    catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('contract_number')) {
            throw new Error('Contract number already exists');
        }
        if (error.code === 'P2003') {
            // Foreign key constraint violation
            throw new Error('Invalid reference: Please ensure all selected users exist in the system');
        }
        console.error('Update contract error:', error);
        throw new Error('Failed to update contract: ' + (error.message || 'Unknown error'));
    }
}
async function deleteContract(id) {
    const existing = await getContractById(id);
    // TODO: Check if there are active Transitions linked to this contract
    // For now, allow deletion since transitions don't have contractId yet
    await prisma.contracts.delete({
        where: { id }
    });
    return { message: 'Contract deleted successfully' };
}
async function getContractsByBusinessOperation(businessOperationId) {
    try {
        const contracts = await prisma.contracts.findMany({
            where: { business_operation_id: businessOperationId },
            include: {
                users_contracts_contractor_pm_idTousers: {
                    select: {
                        id: true,
                        person: {
                            select: { firstName: true, lastName: true, primaryEmail: true }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        // Note: Transitions are not directly linked to contracts in the current schema
        // They are linked to product_programs instead. Return contracts without transition counts.
        return contracts.map(transformContract);
    }
    catch (error) {
        console.error('Get contracts by business operation error:', error);
        throw new Error('Failed to fetch contracts');
    }
}
