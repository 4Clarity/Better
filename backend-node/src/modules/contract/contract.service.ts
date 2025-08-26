import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
export const createContractSchema = z.object({
  businessOperationId: z.string().min(1, "Business operation ID is required"),
  contractName: z.string().min(1, "Contract name is required").max(255),
  contractNumber: z.string().min(1, "Contract number is required").max(100),
  contractorName: z.string().min(1, "Contractor name is required").max(255),
  contractorPMId: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  canBeExtended: z.boolean().default(true),
  status: z.enum(['PLANNING', 'ACTIVE', 'RENEWAL', 'EXPIRING', 'EXPIRED', 'EXTENDED']).default('PLANNING'),
});

export const updateContractSchema = createContractSchema.partial().omit({ businessOperationId: true });

export const getContractsQuerySchema = z.object({
  businessOperationId: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'RENEWAL', 'EXPIRING', 'EXPIRED', 'EXTENDED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['contractName', 'contractNumber', 'startDate', 'endDate', 'status', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type GetContractsQuery = z.infer<typeof getContractsQuerySchema>;

// Service functions
export async function createContract(data: CreateContractInput) {
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
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('contractNumber')) {
      throw new Error('Contract number already exists');
    }
    console.error('Create contract error:', error);
    throw new Error('Failed to create contract');
  }
}

export async function getContracts(query: GetContractsQuery) {
  const { page, limit, sortBy, sortOrder, search, businessOperationId, status } = query;
  const skip = (page - 1) * limit;

  const where: any = {};

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

export async function getContractById(id: string) {
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

export async function updateContract(id: string, data: UpdateContractInput) {
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
    const updateData: any = { ...data };
    
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

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
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('contractNumber')) {
      throw new Error('Contract number already exists');
    }
    console.error('Update contract error:', error);
    throw new Error('Failed to update contract');
  }
}

export async function deleteContract(id: string) {
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

export async function getContractsByBusinessOperation(businessOperationId: string) {
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