import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
export const createMilestoneSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  targetDate: z.string(), // ISO date string, required
  status: z.enum(['UPCOMING', 'IN_PROGRESS', 'ACHIEVED', 'MISSED', 'CANCELLED']).optional(),
});

export const updateMilestoneSchema = createMilestoneSchema.partial();

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

// Transform database snake_case to API camelCase
function transformMilestoneResponse(dbMilestone: any) {
  return {
    id: dbMilestone.id,
    productProgramId: dbMilestone.product_program_id,
    title: dbMilestone.title,
    description: dbMilestone.description,
    targetDate: dbMilestone.target_date,
    status: dbMilestone.status,
    achievedAt: dbMilestone.achieved_at,
    createdAt: dbMilestone.created_at,
    updatedAt: dbMilestone.updated_at,
    createdBy: dbMilestone.created_by,
    updatedBy: dbMilestone.updated_by,
    // Include relations if present
    createdByUser: dbMilestone.users_product_program_milestones_created_byTousers,
    updatedByUser: dbMilestone.users_product_program_milestones_updated_byTousers,
  };
}

/**
 * Create a new milestone for a Product/Program
 */
export async function createMilestone(
  productProgramId: string,
  data: CreateMilestoneInput,
  createdBy: string
) {
  try {
    // Validate that the product/program exists
    const productProgram = await prisma.product_programs.findUnique({
      where: { id: productProgramId },
      select: { id: true, name: true }
    });

    if (!productProgram) {
      throw new Error('Product/Program not found');
    }

    // Validate target date is in the future (optional business rule)
    const targetDate = new Date(data.targetDate);
    if (isNaN(targetDate.getTime())) {
      throw new Error('Invalid target date format');
    }

    const createData: any = {
      product_program_id: productProgramId,
      title: data.title,
      description: data.description,
      target_date: targetDate,
      status: data.status || 'UPCOMING',
      created_by: createdBy,
      updated_by: createdBy,
    };

    const milestone = await prisma.product_program_milestones.create({
      data: createData,
      include: {
        users_product_program_milestones_created_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        },
        users_product_program_milestones_updated_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        }
      }
    });

    return transformMilestoneResponse(milestone);
  } catch (error: any) {
    console.error('Create milestone error:', error);
    throw new Error(error.message || 'Failed to create milestone');
  }
}

/**
 * Get a milestone by ID
 */
export async function getMilestoneById(milestoneId: string) {
  const milestone = await prisma.product_program_milestones.findUnique({
    where: { id: milestoneId },
    include: {
      users_product_program_milestones_created_byTousers: {
        select: {
          id: true,
          person: {
            select: { firstName: true, lastName: true, primaryEmail: true }
          }
        }
      },
      users_product_program_milestones_updated_byTousers: {
        select: {
          id: true,
          person: {
            select: { firstName: true, lastName: true, primaryEmail: true }
          }
        }
      }
    }
  });

  if (!milestone) {
    throw new Error('Milestone not found');
  }

  return transformMilestoneResponse(milestone);
}

/**
 * Get all milestones for a Product/Program
 */
export async function getMilestonesByProductProgram(productProgramId: string) {
  try {
    // Validate that the product/program exists
    const productProgram = await prisma.product_programs.findUnique({
      where: { id: productProgramId },
      select: { id: true }
    });

    if (!productProgram) {
      throw new Error('Product/Program not found');
    }

    const milestones = await prisma.product_program_milestones.findMany({
      where: { product_program_id: productProgramId },
      include: {
        users_product_program_milestones_created_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        }
      },
      orderBy: [
        { target_date: 'asc' },
        { status: 'asc' }
      ]
    });

    return milestones.map(milestone => transformMilestoneResponse(milestone));
  } catch (error: any) {
    console.error('Get milestones by product/program error:', error);
    throw new Error(error.message || 'Failed to get milestones');
  }
}

/**
 * Update a milestone
 */
export async function updateMilestone(
  milestoneId: string,
  data: UpdateMilestoneInput,
  updatedBy: string
) {
  try {
    // Verify milestone exists
    await getMilestoneById(milestoneId);

    const updateData: any = {
      updated_by: updatedBy,
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.targetDate !== undefined) {
      const targetDate = new Date(data.targetDate);
      if (isNaN(targetDate.getTime())) {
        throw new Error('Invalid target date format');
      }
      updateData.target_date = targetDate;
    }

    const milestone = await prisma.product_program_milestones.update({
      where: { id: milestoneId },
      data: updateData,
      include: {
        users_product_program_milestones_created_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        },
        users_product_program_milestones_updated_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        }
      }
    });

    return transformMilestoneResponse(milestone);
  } catch (error: any) {
    console.error('Update milestone error:', error);
    throw new Error(error.message || 'Failed to update milestone');
  }
}

/**
 * Delete a milestone
 */
export async function deleteMilestone(milestoneId: string, deletedBy: string) {
  try {
    // Verify milestone exists
    await getMilestoneById(milestoneId);

    await prisma.product_program_milestones.delete({
      where: { id: milestoneId }
    });

    return { message: 'Milestone deleted successfully' };
  } catch (error: any) {
    console.error('Delete milestone error:', error);
    throw new Error(error.message || 'Failed to delete milestone');
  }
}

/**
 * Mark a milestone as achieved
 */
export async function markMilestoneAchieved(milestoneId: string, achievedBy: string) {
  try {
    const milestone = await getMilestoneById(milestoneId);

    if (milestone.status === 'ACHIEVED') {
      throw new Error('Milestone is already achieved');
    }

    const updatedMilestone = await prisma.product_program_milestones.update({
      where: { id: milestoneId },
      data: {
        status: 'ACHIEVED',
        achieved_at: new Date(),
        updated_by: achievedBy,
      },
      include: {
        users_product_program_milestones_created_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        },
        users_product_program_milestones_updated_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        }
      }
    });

    return transformMilestoneResponse(updatedMilestone);
  } catch (error: any) {
    console.error('Mark milestone achieved error:', error);
    throw new Error(error.message || 'Failed to mark milestone as achieved');
  }
}

/**
 * Check if user has permission to modify milestones
 * Admin, Gov Program Director, Gov Program Manager can modify
 */
export function canModifyMilestone(userRoles: string[]): boolean {
  const authorizedRoles = ['Admin', 'Gov Program Director', 'Gov Program Manager'];
  return userRoles.some(role =>
    authorizedRoles.some(authRole =>
      role.toLowerCase() === authRole.toLowerCase()
    )
  );
}
