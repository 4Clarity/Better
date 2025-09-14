import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { buildJsonSchemas } from 'fastify-zod';

const prisma = new PrismaClient();

// Simple schemas matching current database
const createTransitionSchema = z.object({
  // Allow either explicit contract fields or a contractId to derive them
  contractId: z.string().optional(),
  contractName: z.string().min(1, "Contract name is required").max(255).optional(),
  contractNumber: z.string().min(1, "Contract number is required").max(100).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine((val) => !!val.contractId || (!!val.contractName && !!val.contractNumber), {
  message: 'Provide either contractId or both contractName and contractNumber',
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
}, { $id: 'TransitionSchemaRaw' });

// Helper function to generate CUID (since we can't use Prisma's cuid() directly in raw queries)
function generateCuid() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Service Functions using raw queries
export async function createTransition(data: CreateTransitionInput) {
  // Validate date logic
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  
  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }

  try {
    // If contractId provided, fetch and derive contract fields and validate timeframe
    let contractId: string | null = null;
    let contractName = data.contractName ?? null;
    let contractNumber = data.contractNumber ?? null;

    if (data.contractId) {
      const contract = await prisma.contract.findUnique({
        where: { id: data.contractId },
        include: { businessOperation: true },
      });
      if (!contract) {
        throw new Error('Contract not found');
      }
      contractId = contract.id;
      contractName = contract.contractName;
      contractNumber = contract.contractNumber;
      // Validate within contract timeframe
      if (startDate < contract.startDate || endDate > contract.endDate) {
        throw new Error('Transition dates must be within contract timeframe');
      }
    }

    const id = `clz${generateCuid()}`;
    const now = new Date();
    
    const result = await prisma.$executeRaw`
      INSERT INTO "transitions" 
      (id, "contractName", "contractNumber", "contractId", "startDate", "endDate", status, "createdAt", "updatedAt")
      VALUES (${id}, ${contractName}, ${contractNumber}, ${contractId}, ${startDate}, ${endDate}, 'NOT_STARTED', ${now}, ${now})
    `;

    // Fetch the created transition
    const transition = await prisma.$queryRaw`
      SELECT id, "contractName", "contractNumber", "startDate", "endDate", status, "createdAt", "updatedAt"
      FROM "transitions" 
      WHERE id = ${id}
    `;

    return (transition as any)[0];
  } catch (error: any) {
    if (error.message?.includes('duplicate key') || error.code === '23505') {
      throw new Error('Contract number already exists');
    }
    throw error;
  }
}

export async function getTransitions(query: GetTransitionsQuery) {
  const { page, limit, sortBy, sortOrder, search } = query;
  const skip = (page - 1) * limit;

  let whereClause = '';
  let searchValues: any[] = [];
  
  if (search) {
    whereClause = `WHERE ("contractName" ILIKE $1 OR "contractNumber" ILIKE $2)`;
    searchValues = [`%${search}%`, `%${search}%`];
  }

  // Get data with pagination
  const dataQuery = `
    SELECT id, "contractName", "contractNumber", "startDate", "endDate", status, "createdAt", "updatedAt"
    FROM "transitions" 
    ${whereClause}
    ORDER BY "${sortBy}" ${sortOrder.toUpperCase()}
    LIMIT $${searchValues.length + 1} OFFSET $${searchValues.length + 2}
  `;

  // Get count
  const countQuery = `SELECT COUNT(*) as count FROM "transitions" ${whereClause}`;

  const data = await prisma.$queryRawUnsafe(dataQuery, ...searchValues, limit, skip);
  const countResult = await prisma.$queryRawUnsafe(countQuery, ...searchValues);
  const total = Number((countResult as any)[0].count);

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
  const transition = await prisma.$queryRaw`
    SELECT id, "contractName", "contractNumber", "startDate", "endDate", status, "createdAt", "updatedAt"
    FROM "transitions" 
    WHERE id = ${id}
  `;

  if (!Array.isArray(transition) || transition.length === 0) {
    throw new Error('Transition not found');
  }

  return transition[0];
}

export async function updateTransition(id: string, data: UpdateTransitionInput) {
  // First check if transition exists
  const existing = await getTransitionById(id);
  
  // Validate date logic if dates are being updated
  if (data.startDate || data.endDate) {
    const startDate = data.startDate ? new Date(data.startDate) : new Date((existing as any).startDate);
    const endDate = data.endDate ? new Date(data.endDate) : new Date((existing as any).endDate);
    
    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }
  }

  const updateFields = [];
  const updateValues = [];
  let valueIndex = 1;

  if (data.contractName) {
    updateFields.push(`"contractName" = $${valueIndex++}`);
    updateValues.push(data.contractName);
  }
  if (data.contractNumber) {
    updateFields.push(`"contractNumber" = $${valueIndex++}`);
    updateValues.push(data.contractNumber);
  }
  if (data.startDate) {
    updateFields.push(`"startDate" = $${valueIndex++}`);
    updateValues.push(new Date(data.startDate));
  }
  if (data.endDate) {
    updateFields.push(`"endDate" = $${valueIndex++}`);
    updateValues.push(new Date(data.endDate));
  }

  if (updateFields.length === 0) {
    return existing; // No updates to make
  }

  updateFields.push(`"updatedAt" = $${valueIndex++}`);
  updateValues.push(new Date());
  updateValues.push(id); // id for WHERE clause

  const updateQuery = `
    UPDATE "transitions" 
    SET ${updateFields.join(', ')}
    WHERE id = $${valueIndex}
  `;

  try {
    await prisma.$executeRawUnsafe(updateQuery, ...updateValues);
    return await getTransitionById(id);
  } catch (error: any) {
    if (error.message?.includes('duplicate key') || error.code === '23505') {
      throw new Error('Contract number already exists');
    }
    throw error;
  }
}

export async function updateTransitionStatus(id: string, data: UpdateTransitionStatusInput) {
  // Check if transition exists
  await getTransitionById(id);

  await prisma.$executeRaw`
    UPDATE "transitions" 
    SET status = ${data.status}, "updatedAt" = ${new Date()}
    WHERE id = ${id}
  `;

  return await getTransitionById(id);
}

export async function deleteTransition(id: string) {
  // Check if transition exists
  await getTransitionById(id);

  await prisma.$executeRaw`
    DELETE FROM "transitions" 
    WHERE id = ${id}
  `;

  return { message: 'Transition deleted successfully' };
}
