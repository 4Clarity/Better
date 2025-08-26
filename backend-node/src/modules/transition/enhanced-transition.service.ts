import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Enhanced schemas for the new hierarchy
export const createEnhancedTransitionSchema = z.object({
  contractId: z.string().min(1, "Contract ID is required"),
  name: z.string().min(1, "Transition name is required").max(255),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.enum(['IMMEDIATE', 'THIRTY_DAYS', 'FORTY_FIVE_DAYS', 'SIXTY_DAYS', 'NINETY_DAYS']).default('THIRTY_DAYS'),
  keyPersonnel: z.string().optional(),
  status: z.enum(['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED']).default('NOT_STARTED'),
  requiresContinuousService: z.boolean().default(true),
  createdBy: z.string().optional(),
});

export const updateEnhancedTransitionSchema = createEnhancedTransitionSchema.partial().omit({ contractId: true });

export const getEnhancedTransitionsQuerySchema = z.object({
  contractId: z.string().optional(),
  businessOperationId: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['NOT_STARTED', 'ON_TRACK', 'AT_RISK', 'BLOCKED', 'COMPLETED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['name', 'startDate', 'endDate', 'status', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateEnhancedTransitionInput = z.infer<typeof createEnhancedTransitionSchema>;
export type UpdateEnhancedTransitionInput = z.infer<typeof updateEnhancedTransitionSchema>;
export type GetEnhancedTransitionsQuery = z.infer<typeof getEnhancedTransitionsQuerySchema>;

// Enhanced service functions
export async function createEnhancedTransition(data: CreateEnhancedTransitionInput) {
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
  } catch (error: any) {
    console.error('Create enhanced transition error:', error);
    throw new Error('Failed to create transition');
  }
}

export async function getEnhancedTransitions(query: GetEnhancedTransitionsQuery) {
  const { page, limit, sortBy, sortOrder, search, contractId, businessOperationId, status } = query;
  const skip = (page - 1) * limit;

  const where: any = {};

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

export async function getEnhancedTransitionById(id: string) {
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

export async function updateEnhancedTransition(id: string, data: UpdateEnhancedTransitionInput) {
  const existing = await getEnhancedTransitionById(id);

  // Validate dates if provided
  if (data.startDate || data.endDate) {
    const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;

    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }
  }

  try {
    const updateData: any = { ...data };
    
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

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
  } catch (error: any) {
    console.error('Update enhanced transition error:', error);
    throw new Error('Failed to update transition');
  }
}

export async function deleteEnhancedTransition(id: string) {
  const existing = await getEnhancedTransitionById(id);

  await prisma.transition.delete({
    where: { id }
  });

  return { message: 'Transition deleted successfully' };
}

// Milestone management functions
export async function createMilestone(transitionId: string, data: {
  title: string;
  description?: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}) {
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

export async function updateMilestoneStatus(milestoneId: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'OVERDUE') {
  const milestone = await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status }
  });

  return milestone;
}

// Legacy compatibility functions
export async function getLegacyTransitions() {
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