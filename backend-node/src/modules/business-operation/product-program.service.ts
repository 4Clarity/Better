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
  sortBy: z.enum(['name', 'security_classification', 'created_at']).default('created_at'),
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

    const productProgram = await prisma.product_programs.create({
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
    const productProgram = await prisma.product_programs.findUnique({
      where: { id },
      include: {
        users_product_programs_created_byTousers: {
          select: {
            id: true,
            username: true,
          },
        },
        users_product_programs_updated_byTousers: {
          select: {
            id: true,
            username: true,
          },
        },
        product_program_stakeholders: {
          include: {
            users_product_program_stakeholders_user_idTousers: {
              select: {
                id: true,
                username: true,
              },
            },
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
      where.security_classification = securityClassification;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch data and total count
    const [productPrograms, total] = await Promise.all([
      prisma.product_programs.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.product_programs.count({ where }),
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
    const existing = await prisma.product_programs.findUnique({ where: { id } });
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

    const productProgram = await prisma.product_programs.update({
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
    const existing = await prisma.product_programs.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Product/Program with ID "${id}" not found`);
    }

    // TODO: In Story 4.2, add cascade checks for relationships with:
    // - Support Contracts
    // - Transitions
    // - Knowledge Management links

    await prisma.product_programs.delete({
      where: { id },
    });

    console.log(`Product/Program deleted: ${id} by user: ${userId}`);
    return { success: true, message: 'Product/Program deleted successfully' };
  } catch (error: any) {
    console.error(`Error deleting product/program ${id}:`, error);
    throw new Error(`Failed to delete product/program: ${error.message}`);
  }
}

/**
 * Stakeholder Management Methods (Story 4.2 - Phase 1)
 */

// Validation schema for stakeholder operations
export const addStakeholderSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.string().max(100).optional(),
});

export type AddStakeholderInput = z.infer<typeof addStakeholderSchema>;

/**
 * Add a stakeholder to a Product/Program
 */
export async function addStakeholder(
  productProgramId: string,
  data: AddStakeholderInput,
  assignedBy: string
) {
  const prisma = getPrismaClient();

  try {
    // Validate product/program exists
    const productProgram = await prisma.product_programs.findUnique({
      where: { id: productProgramId },
    });
    if (!productProgram) {
      throw new Error(`Product/Program with ID "${productProgramId}" not found`);
    }

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user) {
      throw new Error(`User with ID "${data.userId}" not found`);
    }

    // Validate assignedBy user exists
    const assigningUser = await prisma.user.findUnique({
      where: { id: assignedBy },
    });
    if (!assigningUser) {
      throw new Error(`Assigning user with ID "${assignedBy}" not found`);
    }

    // Check if stakeholder already exists
    const existingStakeholder = await prisma.product_program_stakeholders.findUnique({
      where: {
        productProgramId_userId: {
          productProgramId,
          userId: data.userId,
        },
      },
    });

    if (existingStakeholder) {
      throw new Error('User is already a stakeholder for this Product/Program');
    }

    // Create stakeholder
    const stakeholder = await prisma.product_program_stakeholders.create({
      data: {
        productProgramId,
        userId: data.userId,
        role: data.role || null,
        assignedBy,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(
      `Stakeholder added: ${data.userId} to product/program: ${productProgramId} by user: ${assignedBy}`
    );
    return stakeholder;
  } catch (error: any) {
    console.error('Error adding stakeholder:', error);
    throw new Error(`Failed to add stakeholder: ${error.message}`);
  }
}

/**
 * Remove a stakeholder from a Product/Program
 */
export async function removeStakeholder(
  productProgramId: string,
  userId: string,
  removedBy: string
) {
  const prisma = getPrismaClient();

  try {
    // Validate product/program exists
    const productProgram = await prisma.product_programs.findUnique({
      where: { id: productProgramId },
    });
    if (!productProgram) {
      throw new Error(`Product/Program with ID "${productProgramId}" not found`);
    }

    // Validate stakeholder exists
    const stakeholder = await prisma.product_program_stakeholders.findUnique({
      where: {
        productProgramId_userId: {
          productProgramId,
          userId,
        },
      },
    });

    if (!stakeholder) {
      throw new Error('Stakeholder not found for this Product/Program');
    }

    // Delete stakeholder
    await prisma.product_program_stakeholders.delete({
      where: {
        productProgramId_userId: {
          productProgramId,
          userId,
        },
      },
    });

    console.log(
      `Stakeholder removed: ${userId} from product/program: ${productProgramId} by user: ${removedBy}`
    );
    return { success: true, message: 'Stakeholder removed successfully' };
  } catch (error: any) {
    console.error('Error removing stakeholder:', error);
    throw new Error(`Failed to remove stakeholder: ${error.message}`);
  }
}

/**
 * Get all stakeholders for a Product/Program
 */
export async function getStakeholders(productProgramId: string) {
  const prisma = getPrismaClient();

  try {
    // Validate product/program exists
    const productProgram = await prisma.product_programs.findUnique({
      where: { id: productProgramId },
    });
    if (!productProgram) {
      throw new Error(`Product/Program with ID "${productProgramId}" not found`);
    }

    const stakeholders = await prisma.product_program_stakeholders.findMany({
      where: { product_program_id: productProgramId },
      include: {
        users_product_program_stakeholders_user_idTousers: {
          select: {
            id: true,
            username: true,
          },
        },
        users_product_program_stakeholders_assigned_byTousers: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        assigned_at: 'desc',
      },
    });

    return stakeholders;
  } catch (error: any) {
    console.error(`Error fetching stakeholders for product/program ${productProgramId}:`, error);
    throw new Error(`Failed to fetch stakeholders: ${error.message}`);
  }
}

/**
 * Update a stakeholder's role
 */
export async function updateStakeholderRole(
  productProgramId: string,
  userId: string,
  newRole: string | null,
  updatedBy: string
) {
  const prisma = getPrismaClient();

  try {
    // Validate product/program exists
    const productProgram = await prisma.product_programs.findUnique({
      where: { id: productProgramId },
    });
    if (!productProgram) {
      throw new Error(`Product/Program with ID "${productProgramId}" not found`);
    }

    // Validate stakeholder exists
    const stakeholder = await prisma.product_program_stakeholders.findUnique({
      where: {
        productProgramId_userId: {
          productProgramId,
          userId,
        },
      },
    });

    if (!stakeholder) {
      throw new Error('Stakeholder not found for this Product/Program');
    }

    // Update role
    const updatedStakeholder = await prisma.product_program_stakeholders.update({
      where: {
        productProgramId_userId: {
          productProgramId,
          userId,
        },
      },
      data: {
        role: newRole,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(
      `Stakeholder role updated: ${userId} in product/program: ${productProgramId} by user: ${updatedBy}`
    );
    return updatedStakeholder;
  } catch (error: any) {
    console.error('Error updating stakeholder role:', error);
    throw new Error(`Failed to update stakeholder role: ${error.message}`);
  }
}
