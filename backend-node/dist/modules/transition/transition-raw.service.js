"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.$ref = exports.transitionSchemas = void 0;
exports.createTransition = createTransition;
exports.getTransitions = getTransitions;
exports.getTransitionById = getTransitionById;
exports.updateTransition = updateTransition;
exports.updateTransitionStatus = updateTransitionStatus;
exports.deleteTransition = deleteTransition;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const fastify_zod_1 = require("fastify-zod");
const prisma = new client_1.PrismaClient();
// Simple schemas matching current database
const createTransitionSchema = zod_1.z.object({
    // Allow either explicit contract fields or a contractId to derive them
    contractId: zod_1.z.string().optional(),
    contractName: zod_1.z.string().min(1, "Contract name is required").max(255).optional(),
    contractNumber: zod_1.z.string().min(1, "Contract number is required").max(100).optional(),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
}).refine((val) => !!val.contractId || (!!val.contractName && !!val.contractNumber), {
    message: 'Provide either contractId or both contractName and contractNumber',
});
const updateTransitionSchema = zod_1.z.object({
    contractName: zod_1.z.string().min(1).max(255).optional(),
    contractNumber: zod_1.z.string().min(1).max(100).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
});
const updateTransitionStatusSchema = zod_1.z.object({
    status: zod_1.z.string(),
});
const getTransitionsQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(10),
    sortBy: zod_1.z.enum(['contractName', 'contractNumber', 'startDate', 'endDate', 'status', 'createdAt']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
const transitionResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    contractName: zod_1.z.string(),
    contractNumber: zod_1.z.string(),
    startDate: zod_1.z.string(),
    endDate: zod_1.z.string(),
    status: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
const transitionListResponseSchema = zod_1.z.object({
    data: zod_1.z.array(transitionResponseSchema),
    pagination: zod_1.z.object({
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
        total: zod_1.z.number(),
        totalPages: zod_1.z.number(),
    }),
});
_a = (0, fastify_zod_1.buildJsonSchemas)({
    createTransitionSchema,
    updateTransitionSchema,
    updateTransitionStatusSchema,
    getTransitionsQuerySchema,
    transitionResponseSchema,
    transitionListResponseSchema,
}, { $id: 'TransitionSchemaRaw' }), exports.transitionSchemas = _a.schemas, exports.$ref = _a.$ref;
// Helper function to generate CUID (since we can't use Prisma's cuid() directly in raw queries)
function generateCuid() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
// Service Functions using raw queries
async function createTransition(data) {
    // Validate date logic
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate <= startDate) {
        throw new Error('End date must be after start date');
    }
    try {
        // If contractId provided, fetch and derive contract fields and validate timeframe
        let contractId = null;
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
        const result = await prisma.$executeRaw `
      INSERT INTO "Transition" 
      (id, "contractName", "contractNumber", "contractId", "startDate", "endDate", status, "createdAt", "updatedAt")
      VALUES (${id}, ${contractName}, ${contractNumber}, ${contractId}, ${startDate}, ${endDate}, 'NOT_STARTED', ${now}, ${now})
    `;
        // Fetch the created transition
        const transition = await prisma.$queryRaw `
      SELECT id, "contractName", "contractNumber", "startDate", "endDate", status, "createdAt", "updatedAt"
      FROM "Transition" 
      WHERE id = ${id}
    `;
        return transition[0];
    }
    catch (error) {
        if (error.message?.includes('duplicate key') || error.code === '23505') {
            throw new Error('Contract number already exists');
        }
        throw error;
    }
}
async function getTransitions(query) {
    const { page, limit, sortBy, sortOrder, search } = query;
    const skip = (page - 1) * limit;
    let whereClause = '';
    let searchValues = [];
    if (search) {
        whereClause = `WHERE ("contractName" ILIKE $1 OR "contractNumber" ILIKE $2)`;
        searchValues = [`%${search}%`, `%${search}%`];
    }
    // Get data with pagination
    const dataQuery = `
    SELECT id, "contractName", "contractNumber", "startDate", "endDate", status, "createdAt", "updatedAt"
    FROM "Transition" 
    ${whereClause}
    ORDER BY "${sortBy}" ${sortOrder.toUpperCase()}
    LIMIT $${searchValues.length + 1} OFFSET $${searchValues.length + 2}
  `;
    // Get count
    const countQuery = `SELECT COUNT(*) as count FROM "Transition" ${whereClause}`;
    const data = await prisma.$queryRawUnsafe(dataQuery, ...searchValues, limit, skip);
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...searchValues);
    const total = Number(countResult[0].count);
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
async function getTransitionById(id) {
    const transition = await prisma.$queryRaw `
    SELECT id, "contractName", "contractNumber", "startDate", "endDate", status, "createdAt", "updatedAt"
    FROM "Transition" 
    WHERE id = ${id}
  `;
    if (!Array.isArray(transition) || transition.length === 0) {
        throw new Error('Transition not found');
    }
    return transition[0];
}
async function updateTransition(id, data) {
    // First check if transition exists
    const existing = await getTransitionById(id);
    // Validate date logic if dates are being updated
    if (data.startDate || data.endDate) {
        const startDate = data.startDate ? new Date(data.startDate) : new Date(existing.startDate);
        const endDate = data.endDate ? new Date(data.endDate) : new Date(existing.endDate);
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
    UPDATE "Transition" 
    SET ${updateFields.join(', ')}
    WHERE id = $${valueIndex}
  `;
    try {
        await prisma.$executeRawUnsafe(updateQuery, ...updateValues);
        return await getTransitionById(id);
    }
    catch (error) {
        if (error.message?.includes('duplicate key') || error.code === '23505') {
            throw new Error('Contract number already exists');
        }
        throw error;
    }
}
async function updateTransitionStatus(id, data) {
    // Check if transition exists
    await getTransitionById(id);
    await prisma.$executeRaw `
    UPDATE "Transition" 
    SET status = ${data.status}, "updatedAt" = ${new Date()}
    WHERE id = ${id}
  `;
    return await getTransitionById(id);
}
async function deleteTransition(id) {
    // Check if transition exists
    await getTransitionById(id);
    await prisma.$executeRaw `
    DELETE FROM "Transition" 
    WHERE id = ${id}
  `;
    return { message: 'Transition deleted successfully' };
}
