import { PrismaClient, MilestoneStatus, PriorityLevel } from '@prisma/client';
import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';

const prisma = new PrismaClient();

// Base Schemas
const MilestoneStatusEnum = z.nativeEnum(MilestoneStatus);
const PriorityLevelEnum = z.nativeEnum(PriorityLevel);

// Create Milestone Schema
const createMilestoneSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  dueDate: z.string().datetime(),
  priority: PriorityLevelEnum.default('MEDIUM'),
});

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

// Update Milestone Schema
const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: PriorityLevelEnum.optional(),
  status: MilestoneStatusEnum.optional(),
});

export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

// Query Schemas
const getMilestonesQuerySchema = z.object({
  status: MilestoneStatusEnum.optional(),
  priority: PriorityLevelEnum.optional(),
  overdue: z.boolean().optional(),
  upcoming: z.coerce.number().int().min(1).optional(), // Days ahead
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['title', 'dueDate', 'priority', 'status', 'createdAt']).default('dueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type GetMilestonesQuery = z.infer<typeof getMilestonesQuerySchema>;

// Response Schemas
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
  transition: z.object({
    id: z.string(),
    contractName: z.string(),
    contractNumber: z.string(),
  }).optional(),
});

const milestoneListResponseSchema = z.object({
  data: z.array(milestoneResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const { schemas: milestoneSchemas, $ref } = buildJsonSchemas({
  createMilestoneSchema,
  updateMilestoneSchema,
  getMilestonesQuerySchema,
  milestoneResponseSchema,
  milestoneListResponseSchema,
}, { $id: 'MilestoneSchema' });

// Service Functions
export async function createMilestone(transitionId: string, data: CreateMilestoneInput, userId: string) {
  // Verify the transition exists and user has access
  const transition = await prisma.transition.findFirst({
    where: {
      id: transitionId,
      createdBy: userId,
    },
  });

  if (!transition) {
    throw new Error('Transition not found');
  }

  // Validate due date is not in the past (allow some buffer)
  const dueDate = new Date(data.dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today

  if (dueDate < now) {
    throw new Error('Due date cannot be in the past');
  }

  // Check if due date is within transition timeframe
  if (dueDate < transition.startDate || dueDate > transition.endDate) {
    throw new Error('Milestone due date must be within transition timeframe');
  }

  try {
    const milestone = await prisma.milestone.create({
      data: {
        ...data,
        dueDate,
        transitionId,
      },
      include: {
        transition: {
          select: {
            id: true,
            contractName: true,
            contractNumber: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog('milestone', milestone.id, 'CREATE', null, milestone, userId);

    return milestone;
  } catch (error: any) {
    throw error;
  }
}

export async function getMilestones(transitionId: string, query: GetMilestonesQuery, userId: string) {
  // Verify the transition exists and user has access
  const transition = await prisma.transition.findFirst({
    where: {
      id: transitionId,
      createdBy: userId,
    },
  });

  if (!transition) {
    throw new Error('Transition not found');
  }

  const { page, limit, sortBy, sortOrder, status, priority, overdue, upcoming } = query;
  const skip = (page - 1) * limit;

  const where: any = {
    transitionId,
  };

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  // Handle overdue filter
  if (overdue === true) {
    where.dueDate = { lt: new Date() };
    where.status = { not: 'COMPLETED' };
  }

  // Handle upcoming filter (milestones due within N days)
  if (upcoming) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + upcoming);
    where.dueDate = {
      gte: new Date(),
      lte: futureDate,
    };
    where.status = { not: 'COMPLETED' };
  }

  const [data, total] = await prisma.$transaction([
    prisma.milestone.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        transition: {
          select: {
            id: true,
            contractName: true,
            contractNumber: true,
          },
        },
      },
    }),
    prisma.milestone.count({ where }),
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

export async function getMilestoneById(transitionId: string, milestoneId: string, userId: string) {
  // Verify the transition exists and user has access
  const transition = await prisma.transition.findFirst({
    where: {
      id: transitionId,
      createdBy: userId,
    },
  });

  if (!transition) {
    throw new Error('Transition not found');
  }

  const milestone = await prisma.milestone.findFirst({
    where: {
      id: milestoneId,
      transitionId,
    },
    include: {
      transition: {
        select: {
          id: true,
          contractName: true,
          contractNumber: true,
        },
      },
    },
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  return milestone;
}

export async function updateMilestone(transitionId: string, milestoneId: string, data: UpdateMilestoneInput, userId: string) {
  // Verify the transition exists and user has access
  const transition = await prisma.transition.findFirst({
    where: {
      id: transitionId,
      createdBy: userId,
    },
  });

  if (!transition) {
    throw new Error('Transition not found');
  }

  const existingMilestone = await prisma.milestone.findFirst({
    where: {
      id: milestoneId,
      transitionId,
    },
  });

  if (!existingMilestone) {
    throw new Error('Milestone not found');
  }

  // Validate due date if being updated
  if (data.dueDate) {
    const dueDate = new Date(data.dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (dueDate < now) {
      throw new Error('Due date cannot be in the past');
    }

    if (dueDate < transition.startDate || dueDate > transition.endDate) {
      throw new Error('Milestone due date must be within transition timeframe');
    }
  }

  const updateData: any = { ...data };
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);

  try {
    const updatedMilestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: updateData,
      include: {
        transition: {
          select: {
            id: true,
            contractName: true,
            contractNumber: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog('milestone', milestoneId, 'UPDATE', existingMilestone, updatedMilestone, userId);

    return updatedMilestone;
  } catch (error: any) {
    throw error;
  }
}

export async function deleteMilestone(transitionId: string, milestoneId: string, userId: string) {
  // Verify the transition exists and user has access
  const transition = await prisma.transition.findFirst({
    where: {
      id: transitionId,
      createdBy: userId,
    },
  });

  if (!transition) {
    throw new Error('Transition not found');
  }

  const existingMilestone = await prisma.milestone.findFirst({
    where: {
      id: milestoneId,
      transitionId,
    },
  });

  if (!existingMilestone) {
    throw new Error('Milestone not found');
  }

  // Check if milestone has dependencies (this could be expanded based on business rules)
  // For now, we'll allow deletion of any milestone

  await prisma.milestone.delete({
    where: { id: milestoneId },
  });

  // Create audit log
  await createAuditLog('milestone', milestoneId, 'DELETE', existingMilestone, null, userId);

  return { message: 'Milestone deleted successfully' };
}

export async function bulkDeleteMilestones(transitionId: string, milestoneIds: string[], userId: string) {
  // Verify the transition exists and user has access
  const transition = await prisma.transition.findFirst({
    where: {
      id: transitionId,
      createdBy: userId,
    },
  });

  if (!transition) {
    throw new Error('Transition not found');
  }

  // Get existing milestones for audit trail
  const existingMilestones = await prisma.milestone.findMany({
    where: {
      id: { in: milestoneIds },
      transitionId,
    },
  });

  if (existingMilestones.length !== milestoneIds.length) {
    throw new Error('Some milestones not found');
  }

  // Delete milestones
  await prisma.milestone.deleteMany({
    where: {
      id: { in: milestoneIds },
      transitionId,
    },
  });

  // Create audit logs for each deleted milestone
  for (const milestone of existingMilestones) {
    await createAuditLog('milestone', milestone.id, 'DELETE', milestone, null, userId);
  }

  return { message: `${milestoneIds.length} milestones deleted successfully` };
}

// Update milestone status with automatic overdue detection
export async function updateMilestoneStatuses() {
  const now = new Date();
  
  // Mark overdue milestones
  await prisma.milestone.updateMany({
    where: {
      dueDate: { lt: now },
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
    data: {
      status: 'OVERDUE',
    },
  });

  // This could be called by a cron job
  return { message: 'Milestone statuses updated' };
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