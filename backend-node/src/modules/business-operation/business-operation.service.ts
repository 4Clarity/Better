import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
export const createBusinessOperationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  businessFunction: z.string().min(1, "Business function is required").max(100),
  technicalDomain: z.string().min(1, "Technical domain is required").max(100),
  description: z.string().optional(),
  scope: z.string().min(1, "Scope is required"),
  objectives: z.string().min(1, "Objectives are required"),
  performanceMetrics: z.object({
    operational: z.array(z.string()).optional(),
    quality: z.array(z.string()).optional(),
    compliance: z.array(z.string()).optional(),
  }),
  supportPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supportPeriodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currentContractEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  governmentPMId: z.string(),
  directorId: z.string(),
  currentManagerId: z.string().optional(),
});

export const updateBusinessOperationSchema = createBusinessOperationSchema.partial();

export const getBusinessOperationsQuerySchema = z.object({
  search: z.string().optional(),
  businessFunction: z.string().optional(),
  technicalDomain: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['name', 'businessFunction', 'technicalDomain', 'currentContractEnd', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateBusinessOperationInput = z.infer<typeof createBusinessOperationSchema>;
export type UpdateBusinessOperationInput = z.infer<typeof updateBusinessOperationSchema>;
export type GetBusinessOperationsQuery = z.infer<typeof getBusinessOperationsQuerySchema>;

// Service functions
export async function createBusinessOperation(data: CreateBusinessOperationInput) {
  const startDate = new Date(data.supportPeriodStart);
  const endDate = new Date(data.supportPeriodEnd);
  const contractEndDate = new Date(data.currentContractEnd);

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
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        director: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        currentManager: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        contracts: {
          select: { id: true, contractName: true, contractNumber: true, status: true }
        },
        stakeholders: {
          select: { id: true, name: true, role: true, stakeholderType: true }
        },
        _count: {
          select: { contracts: true, stakeholders: true }
        }
      }
    });

    return businessOperation;
  } catch (error: any) {
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

export async function getBusinessOperations(query: GetBusinessOperationsQuery) {
  const { page, limit, sortBy, sortOrder, search, businessFunction, technicalDomain } = query;
  const skip = (page - 1) * limit;

  const where: any = {};

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
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        director: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        currentManager: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        contracts: {
          select: { id: true, contractName: true, contractNumber: true, status: true }
        },
        _count: {
          select: { contracts: true, stakeholders: true }
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

export async function getBusinessOperationById(id: string) {
  const businessOperation = await prisma.businessOperation.findUnique({
    where: { id },
    include: {
      governmentPM: {
        select: { id: true, firstName: true, lastName: true, email: true }
      },
      director: {
        select: { id: true, firstName: true, lastName: true, email: true }
      },
      currentManager: {
        select: { id: true, firstName: true, lastName: true, email: true }
      },
      contracts: {
        include: {
          transitions: {
            select: { id: true, name: true, status: true, startDate: true, endDate: true }
          }
        }
      },
      stakeholders: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      },
      _count: {
        select: { contracts: true, stakeholders: true }
      }
    }
  });

  if (!businessOperation) {
    throw new Error('Business operation not found');
  }

  return businessOperation;
}

export async function updateBusinessOperation(id: string, data: UpdateBusinessOperationInput) {
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
    const updateData: any = { ...data };
    
    if (data.supportPeriodStart) updateData.supportPeriodStart = new Date(data.supportPeriodStart);
    if (data.supportPeriodEnd) updateData.supportPeriodEnd = new Date(data.supportPeriodEnd);
    if (data.currentContractEnd) updateData.currentContractEnd = new Date(data.currentContractEnd);

    const businessOperation = await prisma.businessOperation.update({
      where: { id },
      data: updateData,
      include: {
        governmentPM: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        director: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        currentManager: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        contracts: {
          select: { id: true, contractName: true, contractNumber: true, status: true }
        },
        stakeholders: {
          select: { id: true, name: true, role: true, stakeholderType: true }
        },
        _count: {
          select: { contracts: true, stakeholders: true }
        }
      }
    });

    return businessOperation;
  } catch (error: any) {
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

export async function deleteBusinessOperation(id: string) {
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