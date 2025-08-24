import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';

const prisma = new PrismaClient();

// Simple schemas matching current database
const createTransitionSchema = z.object({
  contractName: z.string().min(1, "Contract name is required").max(255),
  contractNumber: z.string().min(1, "Contract number is required").max(100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export type CreateTransitionInput = z.infer<typeof createTransitionSchema>;

const updateTransitionSchema = z.object({
  contractName: z.string().min(1).max(255).optional(),
  contractNumber: z.string().min(1).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type UpdateTransitionInput = z.infer<typeof updateTransitionSchema>;

const updateTransitionStatusSchema = z.object({
  status: z.string(),
});

export type UpdateTransitionStatusInput = z.infer<typeof updateTransitionStatusSchema>;

const getTransitionsQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['contractName', 'contractNumber', 'startDate', 'endDate', 'status', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type GetTransitionsQuery = z.infer<typeof getTransitionsQuerySchema>;

const transitionResponseSchema = z.object({
  id: z.string(),
  contractName: z.string(),
  contractNumber: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
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

export const { schemas: transitionSchemas, $ref } = buildJsonSchemas({
  createTransitionSchema,
  updateTransitionSchema,
  updateTransitionStatusSchema,
  getTransitionsQuerySchema,
  transitionResponseSchema,
  transitionListResponseSchema,
}, { $id: 'TransitionSchemaSimple' });

// Service Functions
export async function createTransition(data: CreateTransitionInput) {
  // Validate date logic
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  
  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }

  try {
    const transition = await prisma.transition.create({
      data: {
        contractName: data.contractName,
        contractNumber: data.contractNumber,
        startDate,
        endDate,
      },
    });

    return transition;
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('contractNumber')) {
      throw new Error('Contract number already exists');
    }
    throw error;
  }
}

export async function getTransitions(query: GetTransitionsQuery) {
  const { page, limit, sortBy, sortOrder, search } = query;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (search) {
    where.OR = [
      { contractName: { contains: search, mode: 'insensitive' } },
      { contractNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await prisma.$transaction([
    prisma.transition.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
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

export async function getTransitionById(id: string) {
  const transition = await prisma.transition.findUnique({
    where: { id },
  });

  if (!transition) {
    throw new Error('Transition not found');
  }

  return transition;
}

export async function updateTransition(id: string, data: UpdateTransitionInput) {
  const existingTransition = await prisma.transition.findUnique({
    where: { id },
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
    });

    return updatedTransition;
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('contractNumber')) {
      throw new Error('Contract number already exists');
    }
    throw error;
  }
}

export async function updateTransitionStatus(id: string, data: UpdateTransitionStatusInput) {
  const existingTransition = await prisma.transition.findUnique({
    where: { id },
  });

  if (!existingTransition) {
    throw new Error('Transition not found');
  }

  const updatedTransition = await prisma.transition.update({
    where: { id },
    data: { status: data.status },
  });

  return updatedTransition;
}

export async function deleteTransition(id: string) {
  const existingTransition = await prisma.transition.findUnique({
    where: { id },
  });

  if (!existingTransition) {
    throw new Error('Transition not found');
  }

  await prisma.transition.delete({
    where: { id },
  });

  return { message: 'Transition deleted successfully' };
}