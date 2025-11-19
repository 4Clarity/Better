import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
export const createKnowledgeLinkSchema = z.object({
  knowledgeItemId: z.string().min(1, "Knowledge item ID is required").max(255),
  linkType: z.string().max(50).optional(),
});

export const updateKnowledgeLinkSchema = z.object({
  linkType: z.string().max(50).optional(),
});

export type CreateKnowledgeLinkInput = z.infer<typeof createKnowledgeLinkSchema>;
export type UpdateKnowledgeLinkInput = z.infer<typeof updateKnowledgeLinkSchema>;

// Transform database snake_case to API camelCase
function transformKnowledgeLinkResponse(dbLink: any) {
  return {
    id: dbLink.id,
    productProgramId: dbLink.product_program_id,
    knowledgeItemId: dbLink.knowledge_item_id,
    linkType: dbLink.link_type,
    linkedAt: dbLink.linked_at,
    linkedBy: dbLink.linked_by,
    // Include relations if present
    linkedByUser: dbLink.users_product_program_knowledge_links_linked_byTousers,
  };
}

/**
 * Create a new knowledge link for a Product/Program
 */
export async function createKnowledgeLink(
  productProgramId: string,
  data: CreateKnowledgeLinkInput,
  linkedBy: string
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

    // Check if this knowledge link already exists (unique constraint)
    const existingLink = await prisma.product_program_knowledge_links.findFirst({
      where: {
        product_program_id: productProgramId,
        knowledge_item_id: data.knowledgeItemId
      }
    });

    if (existingLink) {
      throw new Error('This knowledge item is already linked to this Product/Program');
    }

    const createData: any = {
      product_program_id: productProgramId,
      knowledge_item_id: data.knowledgeItemId,
      link_type: data.linkType || null,
      linked_by: linkedBy,
    };

    const knowledgeLink = await prisma.product_program_knowledge_links.create({
      data: createData,
      include: {
        users_product_program_knowledge_links_linked_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        }
      }
    });

    return transformKnowledgeLinkResponse(knowledgeLink);
  } catch (error: any) {
    console.error('Create knowledge link error:', error);
    throw new Error(error.message || 'Failed to create knowledge link');
  }
}

/**
 * Get a knowledge link by ID
 */
export async function getKnowledgeLinkById(linkId: string) {
  const knowledgeLink = await prisma.product_program_knowledge_links.findUnique({
    where: { id: linkId },
    include: {
      users_product_program_knowledge_links_linked_byTousers: {
        select: {
          id: true,
          person: {
            select: { firstName: true, lastName: true, primaryEmail: true }
          }
        }
      }
    }
  });

  if (!knowledgeLink) {
    throw new Error('Knowledge link not found');
  }

  return transformKnowledgeLinkResponse(knowledgeLink);
}

/**
 * Get all knowledge links for a Product/Program
 */
export async function getKnowledgeLinksByProductProgram(productProgramId: string) {
  try {
    // Validate that the product/program exists
    const productProgram = await prisma.product_programs.findUnique({
      where: { id: productProgramId },
      select: { id: true }
    });

    if (!productProgram) {
      throw new Error('Product/Program not found');
    }

    const knowledgeLinks = await prisma.product_program_knowledge_links.findMany({
      where: { product_program_id: productProgramId },
      include: {
        users_product_program_knowledge_links_linked_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        }
      },
      orderBy: [
        { linked_at: 'desc' }
      ]
    });

    return knowledgeLinks.map(link => transformKnowledgeLinkResponse(link));
  } catch (error: any) {
    console.error('Get knowledge links by product/program error:', error);
    throw new Error(error.message || 'Failed to get knowledge links');
  }
}

/**
 * Update a knowledge link (only link_type can be updated)
 */
export async function updateKnowledgeLink(
  linkId: string,
  data: UpdateKnowledgeLinkInput,
  updatedBy: string
) {
  try {
    // Verify knowledge link exists
    await getKnowledgeLinkById(linkId);

    const updateData: any = {};

    if (data.linkType !== undefined) updateData.link_type = data.linkType || null;

    const knowledgeLink = await prisma.product_program_knowledge_links.update({
      where: { id: linkId },
      data: updateData,
      include: {
        users_product_program_knowledge_links_linked_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        }
      }
    });

    return transformKnowledgeLinkResponse(knowledgeLink);
  } catch (error: any) {
    console.error('Update knowledge link error:', error);
    throw new Error(error.message || 'Failed to update knowledge link');
  }
}

/**
 * Delete a knowledge link
 */
export async function deleteKnowledgeLink(linkId: string, deletedBy: string) {
  try {
    // Verify knowledge link exists
    await getKnowledgeLinkById(linkId);

    await prisma.product_program_knowledge_links.delete({
      where: { id: linkId }
    });

    return { message: 'Knowledge link deleted successfully' };
  } catch (error: any) {
    console.error('Delete knowledge link error:', error);
    throw new Error(error.message || 'Failed to delete knowledge link');
  }
}

/**
 * Search knowledge links by knowledge item ID
 * Useful for finding all Product/Programs linked to a specific knowledge item
 */
export async function searchKnowledgeLinksByItemId(knowledgeItemId: string) {
  try {
    const knowledgeLinks = await prisma.product_program_knowledge_links.findMany({
      where: { knowledge_item_id: knowledgeItemId },
      include: {
        product_programs: {
          select: {
            id: true,
            name: true,
            description: true,
            business_operation_type: true
          }
        },
        users_product_program_knowledge_links_linked_byTousers: {
          select: {
            id: true,
            person: {
              select: { firstName: true, lastName: true, primaryEmail: true }
            }
          }
        }
      },
      orderBy: [
        { linked_at: 'desc' }
      ]
    });

    return knowledgeLinks.map(link => ({
      ...transformKnowledgeLinkResponse(link),
      productProgram: link.product_programs
    }));
  } catch (error: any) {
    console.error('Search knowledge links by item ID error:', error);
    throw new Error(error.message || 'Failed to search knowledge links');
  }
}

/**
 * Check if user has permission to modify knowledge links
 * Admin, Gov Program Director, Gov Program Manager can modify
 */
export function canModifyKnowledgeLink(userRoles: string[]): boolean {
  const authorizedRoles = ['Admin', 'Gov Program Director', 'Gov Program Manager'];
  return userRoles.some(role =>
    authorizedRoles.some(authRole =>
      role.toLowerCase() === authRole.toLowerCase()
    )
  );
}
