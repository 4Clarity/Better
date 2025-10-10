import { PrismaClient, SecurityClassification } from '@prisma/client';
import { z } from 'zod';

// Use singleton pattern for Prisma Client to avoid connection exhaustion
// In production, this should be imported from a shared database module
let prisma: PrismaClient;

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  return prisma;
}

// Validation schemas
export const criticalDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(['milestone', 'deadline', 'review', 'other']).optional(),
});

export const createProductProgramSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  description: z.string().min(1, "Description is required"),
  objectives: z.string().min(1, "Objectives are required"),
  deliverables: z.string().min(1, "Deliverables are required"),
  dependencies: z.string().optional(),
  securityClassification: z.enum(['UNCLASSIFIED', 'CUI', 'SECRET', 'TOP_SECRET']),
  criticalDates: z.array(criticalDateSchema).default([]),
});

export const updateProductProgramSchema = createProductProgramSchema.partial();

export const getProductProgramsQuerySchema = z.object({
  search: z.string().optional(),
  securityClassification: z.enum(['UNCLASSIFIED', 'CUI', 'SECRET', 'TOP_SECRET']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'securityClassification', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateProductProgramInput = z.infer<typeof createProductProgramSchema>;
export type UpdateProductProgramInput = z.infer<typeof updateProductProgramSchema>;
export type GetProductProgramsQuery = z.infer<typeof getProductProgramsQuerySchema>;
export type CriticalDate = z.infer<typeof criticalDateSchema>;

// Service functions

/**
 * Create a new Product/Program
 */
export async function createProductProgram(
  data: CreateProductProgramInput,
  userId: string
) {
  const prisma = getPrismaClient();

  try {
    // Validate user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User with ID "${userId}" not found`);
    }

    const productProgram = await prisma.productProgram.create({
      data: {
        ...data,
        securityClassification: data.securityClassification as SecurityClassification,
        criticalDates: data.criticalDates || [],
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(`Product/Program created: ${productProgram.id} by user: ${userId}`);
    return productProgram;
  } catch (error: any) {
    console.error('Error creating product/program:', error);
    throw new Error(`Failed to create product/program: ${error.message}`);
  }
}

/**
 * Get a single Product/Program by ID
 */
export async function getProductProgramById(id: string, userId: string) {
  const prisma = getPrismaClient();

  try {
    const productProgram = await prisma.productProgram.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!productProgram) {
      throw new Error(`Product/Program with ID "${id}" not found`);
    }

    return productProgram;
  } catch (error: any) {
    console.error(`Error fetching product/program ${id}:`, error);
    throw new Error(`Failed to fetch product/program: ${error.message}`);
  }
}

/**
 * Get all Product/Programs with filtering, pagination, and sorting
 */
export async function getAllProductPrograms(
  userId: string,
  query: GetProductProgramsQuery
) {
  const prisma = getPrismaClient();

  try {
    const { search, securityClassification, page, limit, sortBy, sortOrder } = query;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { objectives: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (securityClassification) {
      where.securityClassification = securityClassification;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch data and total count
    const [productPrograms, total] = await Promise.all([
      prisma.productProgram.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.productProgram.count({ where }),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      data: productPrograms,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  } catch (error: any) {
    console.error('Error fetching product/programs:', error);
    throw new Error(`Failed to fetch product/programs: ${error.message}`);
  }
}

/**
 * Update an existing Product/Program
 */
export async function updateProductProgram(
  id: string,
  data: UpdateProductProgramInput,
  userId: string
) {
  const prisma = getPrismaClient();

  try {
    // Validate user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User with ID "${userId}" not found`);
    }

    // Check if product/program exists
    const existing = await prisma.productProgram.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Product/Program with ID "${id}" not found`);
    }

    const updateData: any = {
      updatedBy: userId,
      updatedAt: new Date(), // Manually set instead of relying on @updatedAt
    };

    // Only include fields that are provided in the update
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.objectives !== undefined) updateData.objectives = data.objectives;
    if (data.deliverables !== undefined) updateData.deliverables = data.deliverables;
    if (data.dependencies !== undefined) updateData.dependencies = data.dependencies;
    if (data.criticalDates !== undefined) updateData.criticalDates = data.criticalDates;
    if (data.securityClassification) {
      updateData.securityClassification = data.securityClassification as SecurityClassification;
    }

    const productProgram = await prisma.productProgram.update({
      where: { id },
      data: updateData,
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(`Product/Program updated: ${productProgram.id} by user: ${userId}`);
    return productProgram;
  } catch (error: any) {
    console.error(`Error updating product/program ${id}:`, error);
    throw new Error(`Failed to update product/program: ${error.message}`);
  }
}

/**
 * Delete a Product/Program
 */
export async function deleteProductProgram(id: string, userId: string) {
  const prisma = getPrismaClient();

  try {
    // Validate user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User with ID "${userId}" not found`);
    }

    // Check if product/program exists
    const existing = await prisma.productProgram.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Product/Program with ID "${id}" not found`);
    }

    // TODO: In Story 4.2, add cascade checks for relationships with:
    // - Support Contracts
    // - Transitions
    // - Knowledge Management links

    await prisma.productProgram.delete({
      where: { id },
    });

    console.log(`Product/Program deleted: ${id} by user: ${userId}`);
    return { success: true, message: 'Product/Program deleted successfully' };
  } catch (error: any) {
    console.error(`Error deleting product/program ${id}:`, error);
    throw new Error(`Failed to delete product/program: ${error.message}`);
  }
}
