import { PrismaClient, PriorityLevel, TaskStatus } from '@prisma/client';
import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';

const prisma = new PrismaClient();

const PriorityEnum = z.nativeEnum(PriorityLevel);
const TaskStatusEnum = z.nativeEnum(TaskStatus);

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  dueDate: z.string().datetime(),
  priority: PriorityEnum.default('MEDIUM'),
  status: TaskStatusEnum.default('NOT_STARTED'),
  milestoneId: z.string().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: PriorityEnum.optional(),
  status: TaskStatusEnum.optional(),
  milestoneId: z.string().nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

const getTasksQuerySchema = z.object({
  status: TaskStatusEnum.optional(),
  priority: PriorityEnum.optional(),
  overdue: z.boolean().optional(),
  upcoming: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['title','dueDate','priority','status','createdAt']).default('dueDate'),
  sortOrder: z.enum(['asc','desc']).default('asc'),
});
export type GetTasksQuery = z.infer<typeof getTasksQuerySchema>;

const taskResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.string(),
  priority: PriorityEnum,
  status: TaskStatusEnum,
  transitionId: z.string(),
  milestoneId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const taskListResponseSchema = z.object({
  data: z.array(taskResponseSchema),
  pagination: z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() }),
});

export const { schemas: taskSchemas, $ref } = buildJsonSchemas({
  createTaskSchema,
  updateTaskSchema,
  getTasksQuerySchema,
  taskResponseSchema,
  taskListResponseSchema,
},{ $id: 'TaskSchema' });

export async function createTask(transitionId: string, data: CreateTaskInput) {
  const transition = await prisma.transition.findUnique({ where: { id: transitionId } });
  if (!transition) throw new Error('Transition not found');

  const dueDate = new Date(data.dueDate);
  const now = new Date(); now.setHours(0,0,0,0);
  if (dueDate < now) throw new Error('Due date cannot be in the past');
  if (dueDate < transition.startDate || dueDate > transition.endDate) throw new Error('Task due date must be within transition timeframe');

  // Idempotency: same title + dueDate + transitionId returns existing
  const existing = await prisma.task.findFirst({ where: { transitionId, title: data.title, dueDate } });
  if (existing) return existing;

  const task = await prisma.task.create({ data: { ...data, dueDate, transitionId } });
  return task;
}

export async function getTasks(transitionId: string, query: GetTasksQuery) {
  const { page, limit, sortBy, sortOrder, status, priority, overdue, upcoming } = query;
  const skip = (page-1)*limit;
  const where: any = { transitionId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (overdue === true) { where.dueDate = { lt: new Date() }; where.status = { not: 'COMPLETED' }; }
  if (upcoming) {
    const future = new Date(); future.setDate(future.getDate()+upcoming);
    where.dueDate = { gte: new Date(), lte: future };
    where.status = { not: 'COMPLETED' };
  }
  const [data,total] = await prisma.$transaction([
    prisma.task.findMany({ where, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
    prisma.task.count({ where })
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } };
}

export async function getTaskById(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error('Task not found');
  return task;
}

export async function updateTask(taskId: string, data: UpdateTaskInput) {
  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) throw new Error('Task not found');
  if (data.dueDate) {
    const dueDate = new Date(data.dueDate);
    const now = new Date(); now.setHours(0,0,0,0);
    if (dueDate < now) throw new Error('Due date cannot be in the past');
    const transition = await prisma.transition.findUnique({ where: { id: existing.transitionId } });
    if (transition && (dueDate < transition.startDate || dueDate > transition.endDate)) throw new Error('Task due date must be within transition timeframe');
  }
  const updateData: any = { ...data }; if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
  return prisma.task.update({ where: { id: taskId }, data: updateData });
}

export async function deleteTask(taskId: string) {
  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) throw new Error('Task not found');
  await prisma.auditLog.deleteMany({ where: { entityType: 'task', entityId: taskId }});
  await prisma.task.delete({ where: { id: taskId } });
  return { message: 'Task deleted' };
}

