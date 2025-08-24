import { PrismaClient, TransitionStatus, PriorityLevel, MilestoneStatus } from '@prisma/client';
import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';

const prisma = new PrismaClient();

// Base Schemas
const TransitionStatusEnum = z.nativeEnum(TransitionStatus);
const PriorityLevelEnum = z.nativeEnum(PriorityLevel);
const MilestoneStatusEnum = z.nativeEnum(MilestoneStatus);

// Create Transition Schema
const createTransitionSchema = z.object({
  contractName: z.string().min(1, "Contract name is required").max(255),
  contractNumber: z.string().min(1, "Contract number is required").max(100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  keyPersonnel: z.string().optional(),
  description: z.string().optional(),
});

export type CreateTransitionInput = z.infer<typeof createTransitionSchema>;

// Update Transition Schema
const updateTransitionSchema = z.object({
  contractName: z.string().min(1).max(255).optional(),
  contractNumber: z.string().min(1).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  keyPersonnel: z.string().optional(),
  description: z.string().optional(),
});

export type UpdateTransitionInput = z.infer<typeof updateTransitionSchema>;

// Update Status Schema
const updateTransitionStatusSchema = z.object({
  status: TransitionStatusEnum,
});

export type UpdateTransitionStatusInput = z.infer<typeof updateTransitionStatusSchema>;

// Query Schemas
const getTransitionsQuerySchema = z.object({
  status: TransitionStatusEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['contractName', 'contractNumber', 'startDate', 'endDate', 'status', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type GetTransitionsQuery = z.infer<typeof getTransitionsQuerySchema>;

// Response Schemas
const transitionResponseSchema = z.object({
  id: z.string(),
  contractName: z.string(),
  contractNumber: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  keyPersonnel: z.string().nullable(),
  description: z.string().nullable(),
  status: TransitionStatusEnum,
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  creator: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
  }).optional(),
  _count: z.object({
    milestones: z.number(),
  }).optional(),
});

const transitionListResponseSchema = z.object({
  data: z.array(transitionResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

const milestoneResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.string(),
  priority: PriorityLevelEnum,
  status: MilestoneStatusEnum,
  transitionId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const transitionWithMilestonesSchema = transitionResponseSchema.extend({
  milestones: z.array(milestoneResponseSchema),
});

export const { schemas: transitionSchemas, $ref } = buildJsonSchemas({
  createTransitionSchema,
  updateTransitionSchema,
  updateTransitionStatusSchema,
  getTransitionsQuerySchema,
  transitionResponseSchema,
  transitionListResponseSchema,
  transitionWithMilestonesSchema,
}, { $id: 'TransitionSchema' });

// Service Functions
export async function createTransition(data: CreateTransitionInput, userId: string) {
  // Validate date logic
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  
  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }

  try {
    const transition = await prisma.transition.create({
      data: {
        ...data,
        startDate,
        endDate,
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            milestones: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog('transition', transition.id, 'CREATE', null, transition, userId);

    return transition;
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('contractNumber')) {
      throw new Error('Contract number already exists');
    }
    throw error;
  }
}

export async function getTransitions(query: GetTransitionsQuery, userId: string) {
  const { page, limit, sortBy, sortOrder, status, search } = query;
  const skip = (page - 1) * limit;

  const where: any = {
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
    prisma.transition.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            milestones: true,
          },
        },
      },
    }),
    prisma.transition.count({ where }),
  ]);

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

export async function getTransitionById(id: string, userId: string) {
  const transition = await prisma.transition.findFirst({
    where: {
      id,
      createdBy: userId, // Security: only show transitions created by this user
    },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
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

export async function updateTransition(id: string, data: UpdateTransitionInput, userId: string) {
  const existingTransition = await prisma.transition.findFirst({
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

  const updateData: any = { ...data };
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);

  try {
    const updatedTransition = await prisma.transition.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            milestones: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog('transition', id, 'UPDATE', existingTransition, updatedTransition, userId);

    return updatedTransition;
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('contractNumber')) {
      throw new Error('Contract number already exists');
    }
    throw error;
  }
}

export async function updateTransitionStatus(id: string, data: UpdateTransitionStatusInput, userId: string) {
  const existingTransition = await prisma.transition.findFirst({
    where: { id, createdBy: userId },
  });

  if (!existingTransition) {
    throw new Error('Transition not found');
  }

  const updatedTransition = await prisma.transition.update({
    where: { id },
    data: { status: data.status },
    include: {
      creator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      _count: {
        select: {
          milestones: true,
        },
      },
    },
  });

  // Create audit log
  await createAuditLog('transition', id, 'UPDATE', 
    { status: existingTransition.status }, 
    { status: data.status }, 
    userId
  );

  return updatedTransition;
}

export async function deleteTransition(id: string, userId: string) {
  const existingTransition = await prisma.transition.findFirst({
    where: { id, createdBy: userId },
    include: { milestones: true },
  });

  if (!existingTransition) {
    throw new Error('Transition not found');
  }

  // Soft delete by updating status (optional - could be hard delete)
  const deletedTransition = await prisma.transition.delete({
    where: { id },
  });

  // Create audit log
  await createAuditLog('transition', id, 'DELETE', existingTransition, null, userId);

  return { message: 'Transition deleted successfully' };
}

// Audit Logging Helper
async function createAuditLog(
  entityType: string,
  entityId: string,
  action: string,
  oldValues: any,
  newValues: any,
  userId: string
) {
  await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
      newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
      userId,
    },
  });
}