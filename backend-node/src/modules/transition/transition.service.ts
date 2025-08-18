import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';

const prisma = new PrismaClient();

const createTransitionSchema = z.object({
  contractName: z.string(),
  contractNumber: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export type CreateTransitionInput = z.infer<typeof createTransitionSchema>;

const transitionResponseSchema = z.object({
  id: z.string(),
  contractName: z.string(),
  contractNumber: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  status: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const updateTransitionStatusSchema = z.object({
  status: z.enum(['On Track', 'At Risk', 'Blocked']),
});

export type UpdateTransitionStatusInput = z.infer<typeof updateTransitionStatusSchema>;

export const { schemas: transitionSchemas, $ref } = buildJsonSchemas({
  createTransitionSchema,
  transitionResponseSchema,
  updateTransitionStatusSchema,
}, { $id: 'TransitionSchema' });


export async function createTransition(data: CreateTransitionInput) {
  return prisma.transition.create({
    data,
  });
}

export async function getTransitions() {
  return prisma.transition.findMany();
}

export async function updateTransitionStatus(id: string, data: UpdateTransitionStatusInput) {
  return prisma.transition.update({
    where: { id },
    data,
  });
}