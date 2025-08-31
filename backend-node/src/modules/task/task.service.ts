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
  milestoneId: z.string().nullable().optional(),
  parentTaskId: z.string().nullable().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: PriorityEnum.optional(),
  status: TaskStatusEnum.optional(),
  milestoneId: z.string().nullable().optional(),
  parentTaskId: z.string().nullable().optional(),
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
  parentTaskId: z.string().nullable(),
  orderIndex: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const taskListResponseSchema = z.object({
  data: z.array(taskResponseSchema),
  pagination: z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() }),
});

// Move/reorder task schema (declare before registering schemas)
export const moveTaskSchema = z.object({
  parentTaskId: z.string().nullable().optional(),
  milestoneId: z.string().nullable().optional(),
  beforeTaskId: z.string().optional(),
  afterTaskId: z.string().optional(),
  position: z.coerce.number().int().min(0).optional(),
});
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

export const { schemas: taskSchemas, $ref } = buildJsonSchemas({
  createTaskSchema,
  updateTaskSchema,
  getTasksQuerySchema,
  taskResponseSchema,
  taskListResponseSchema,
  moveTaskSchema,
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

  // Validate parent task if provided and compute orderIndex
  let parentTaskId: string | null = null;
  if (data.parentTaskId) {
    const parent = await prisma.task.findUnique({ where: { id: data.parentTaskId } });
    if (!parent || parent.transitionId !== transitionId) throw new Error('Parent task must belong to the same transition');
    parentTaskId = parent.id;
  }
  // Validate milestone if provided
  let milestoneId: string | null = null;
  if (data.milestoneId) {
    const ms = await prisma.milestone.findUnique({ where: { id: data.milestoneId } });
    if (!ms) throw new Error('Milestone not found');
    if (ms.transitionId !== transitionId) throw new Error('Milestone must belong to the same transition');
    milestoneId = ms.id;
  }
  const lastSibling = await prisma.task.findFirst({ where: { transitionId, parentTaskId }, orderBy: { orderIndex: 'desc' } });
  const orderIndex = lastSibling ? lastSibling.orderIndex + 1 : 0;

  const task = await prisma.task.create({ data: { title: data.title, description: data.description, dueDate, priority: data.priority ?? 'MEDIUM', status: data.status ?? 'NOT_STARTED', transitionId, milestoneId, parentTaskId, orderIndex } });
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
  // Validate parentTask changes if provided
  if (data.parentTaskId !== undefined && data.parentTaskId !== null) {
    const parent = await prisma.task.findUnique({ where: { id: data.parentTaskId } });
    if (!parent || parent.transitionId !== existing.transitionId) throw new Error('Parent task must belong to the same transition');
  }
  // Validate milestone changes if provided
  if (data.milestoneId !== undefined && data.milestoneId !== null) {
    const ms = await prisma.milestone.findUnique({ where: { id: data.milestoneId } });
    if (!ms) throw new Error('Milestone not found');
    if (ms.transitionId !== existing.transitionId) throw new Error('Milestone must belong to the same transition');
  }
  const updateData: any = { title: data.title, description: data.description, priority: data.priority, status: data.status, milestoneId: data.milestoneId ?? undefined, parentTaskId: data.parentTaskId ?? undefined };
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
  return prisma.task.update({ where: { id: taskId }, data: updateData });
}

export async function deleteTask(taskId: string) {
  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) throw new Error('Task not found');
  await prisma.auditLog.deleteMany({ where: { entityType: 'task', entityId: taskId }});
  await prisma.task.delete({ where: { id: taskId } });
  // Compact orderIndex for remaining siblings
  const siblings = await prisma.task.findMany({ where: { transitionId: existing.transitionId, parentTaskId: existing.parentTaskId ?? null }, orderBy: { orderIndex: 'asc' } });
  await Promise.all(siblings.map((s, i) => prisma.task.update({ where: { id: s.id }, data: { orderIndex: i } })));
  return { message: 'Task deleted' };
}

// Hierarchical tree and sequence numbers
export async function getTaskTree(transitionId: string) {
  const tasks = await prisma.task.findMany({ where: { transitionId }, orderBy: [{ parentTaskId: 'asc' }, { orderIndex: 'asc' }] });
  const byParent = new Map<string|null, any[]>();
  tasks.forEach(t => {
    const key = (t.parentTaskId ?? null);
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push({ ...t, sequence: '', children: [] as any[] });
  });
  const roots = (byParent.get(null) ?? []).sort((a,b)=>a.orderIndex-b.orderIndex);
  const attach = (node: any) => {
    const kids = byParent.get(node.id) ?? [];
    node.children = kids.sort((a,b)=>a.orderIndex-b.orderIndex);
    node.children.forEach(attach);
  };
  roots.forEach(attach);
  const computeSeq = (nodes: any[], prefix: number[] = []) => {
    nodes.forEach((n, i) => {
      const seqArr = [...prefix, i+1];
      n.sequence = seqArr.join('.');
      computeSeq(n.children, seqArr);
    });
  };
  computeSeq(roots);
  return roots;
}

// Move/reorder task
// (moveTaskSchema and MoveTaskInput declared above)

export async function moveTask(transitionId: string, taskId: string, body: MoveTaskInput) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.transitionId !== transitionId) throw new Error('Task not found');
  const newParent = body.parentTaskId === undefined ? task.parentTaskId : (body.parentTaskId ?? null);
  const newMilestone = body.milestoneId === undefined ? task.milestoneId : (body.milestoneId ?? null);

  if (newParent) {
    const parent = await prisma.task.findUnique({ where: { id: newParent } });
    if (!parent || parent.transitionId !== transitionId) throw new Error('Parent task must belong to the same transition');
  }

  // Compute target index in new sibling group
  const siblings = await prisma.task.findMany({ where: { transitionId, parentTaskId: newParent ?? null, NOT: { id: taskId } }, orderBy: { orderIndex: 'asc' } });
  let targetIndex = siblings.length;
  if (body.beforeTaskId) {
    const idx = siblings.findIndex(s => s.id === body.beforeTaskId);
    if (idx >= 0) targetIndex = idx;
  } else if (body.afterTaskId) {
    const idx = siblings.findIndex(s => s.id === body.afterTaskId);
    if (idx >= 0) targetIndex = idx + 1;
  } else if (typeof body.position === 'number') {
    targetIndex = Math.max(0, Math.min(body.position, siblings.length));
  }

  const ops: any[] = [];
  // Shift indices to make space
  for (let i = 0; i < siblings.length; i++) {
    const s = siblings[i];
    const newIdx = i >= targetIndex ? i + 1 : i;
    if (s.orderIndex !== newIdx) ops.push(prisma.task.update({ where: { id: s.id }, data: { orderIndex: newIdx } }));
  }

  // Compact old group if parent changed
  if (task.parentTaskId !== newParent) {
    const oldSiblings = await prisma.task.findMany({ where: { transitionId, parentTaskId: task.parentTaskId ?? null, NOT: { id: taskId } }, orderBy: { orderIndex: 'asc' } });
    for (let i = 0; i < oldSiblings.length; i++) {
      const s = oldSiblings[i];
      if (s.orderIndex !== i) ops.push(prisma.task.update({ where: { id: s.id }, data: { orderIndex: i } }));
    }
  }

  await prisma.$transaction([
    ...ops,
    prisma.task.update({ where: { id: taskId }, data: { parentTaskId: newParent ?? null, orderIndex: targetIndex, milestoneId: newMilestone } })
  ]);

  return prisma.task.findUnique({ where: { id: taskId } });
}
