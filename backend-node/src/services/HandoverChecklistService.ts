/**
 * Handover Checklist Service
 * Manages handover checklist items and completion tracking for Outgoing Contractor persona
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface HandoverChecklistItem {
  id: string;
  transitionId: string;
  userId: string;
  itemText: string;
  description: string | null;
  category: string;
  orderIndex: number;
  completed: boolean;
  completedAt: Date | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChecklistItemRequest {
  transitionId: string;
  userId: string;
  itemText: string;
  description?: string;
  category: string;
  orderIndex: number;
}

export interface UpdateChecklistItemRequest {
  itemText?: string;
  description?: string;
  category?: string;
  orderIndex?: number;
  completed?: boolean;
  completedAt?: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
}

export class HandoverChecklistService {
  /**
   * Get all checklist items for a transition
   * @param transitionId - Transition ID
   * @returns Array of checklist items
   */
  async getChecklistByTransition(transitionId: string): Promise<HandoverChecklistItem[]> {
    const items = await prisma.handover_checklist_items.findMany({
      where: { transition_id: transitionId },
      orderBy: [{ category: 'asc' }, { order_index: 'asc' }],
    });

    return items.map(this.transformItem);
  }

  /**
   * Get all checklist items for a user
   * @param userId - User ID
   * @returns Array of checklist items
   */
  async getChecklistByUser(userId: string): Promise<HandoverChecklistItem[]> {
    const items = await prisma.handover_checklist_items.findMany({
      where: { user_id: userId },
      orderBy: [{ category: 'asc' }, { order_index: 'asc' }],
    });

    return items.map(this.transformItem);
  }

  /**
   * Get checklist items for a user in a specific transition
   * @param transitionId - Transition ID
   * @param userId - User ID
   * @returns Array of checklist items
   */
  async getChecklistByTransitionAndUser(transitionId: string, userId: string): Promise<HandoverChecklistItem[]> {
    const items = await prisma.handover_checklist_items.findMany({
      where: {
        transition_id: transitionId,
        user_id: userId,
      },
      orderBy: [{ category: 'asc' }, { order_index: 'asc' }],
    });

    return items.map(this.transformItem);
  }

  /**
   * Get a specific checklist item by ID
   * @param itemId - Checklist item ID
   * @returns Checklist item or null if not found
   */
  async getChecklistItemById(itemId: string): Promise<HandoverChecklistItem | null> {
    const item = await prisma.handover_checklist_items.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return null;
    }

    return this.transformItem(item);
  }

  /**
   * Create a new checklist item
   * @param data - Item creation data
   * @returns Created checklist item
   */
  async createChecklistItem(data: CreateChecklistItemRequest): Promise<HandoverChecklistItem> {
    const item = await prisma.handover_checklist_items.create({
      data: {
        transition_id: data.transitionId,
        user_id: data.userId,
        item_text: data.itemText,
        description: data.description || null,
        category: data.category,
        order_index: data.orderIndex,
        completed: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return this.transformItem(item);
  }

  /**
   * Create multiple checklist items (bulk creation)
   * @param items - Array of item creation data
   * @returns Array of created checklist items
   */
  async createChecklistItems(items: CreateChecklistItemRequest[]): Promise<HandoverChecklistItem[]> {
    const createData = items.map((item) => ({
      transition_id: item.transitionId,
      user_id: item.userId,
      item_text: item.itemText,
      description: item.description || null,
      category: item.category,
      order_index: item.orderIndex,
      completed: false,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await prisma.handover_checklist_items.createMany({
      data: createData,
    });

    // Fetch the created items to return
    const createdItems = await prisma.handover_checklist_items.findMany({
      where: {
        transition_id: items[0].transitionId,
        user_id: items[0].userId,
      },
      orderBy: { created_at: 'desc' },
      take: items.length,
    });

    return createdItems.map(this.transformItem);
  }

  /**
   * Update a checklist item
   * @param itemId - Checklist item ID
   * @param data - Update data
   * @returns Updated checklist item
   */
  async updateChecklistItem(itemId: string, data: UpdateChecklistItemRequest): Promise<HandoverChecklistItem> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (data.itemText !== undefined) updateData.item_text = data.itemText;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.orderIndex !== undefined) updateData.order_index = data.orderIndex;
    if (data.completed !== undefined) {
      updateData.completed = data.completed;
      if (data.completed && !data.completedAt) {
        updateData.completed_at = new Date();
      } else if (!data.completed) {
        updateData.completed_at = null;
      }
    }
    if (data.completedAt !== undefined) updateData.completed_at = data.completedAt;
    if (data.verifiedBy !== undefined) updateData.verified_by = data.verifiedBy;
    if (data.verifiedAt !== undefined) updateData.verified_at = data.verifiedAt;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const item = await prisma.handover_checklist_items.update({
      where: { id: itemId },
      data: updateData,
    });

    return this.transformItem(item);
  }

  /**
   * Mark a checklist item as completed
   * @param itemId - Checklist item ID
   * @param userId - User ID completing the item
   * @param notes - Optional completion notes
   * @returns Updated checklist item
   */
  async completeChecklistItem(itemId: string, userId: string, notes?: string): Promise<HandoverChecklistItem> {
    return this.updateChecklistItem(itemId, {
      completed: true,
      completedAt: new Date(),
      notes,
    });
  }

  /**
   * Verify a checklist item (typically by a supervisor/government PM)
   * @param itemId - Checklist item ID
   * @param verifierId - ID of user verifying the item
   * @param notes - Optional verification notes
   * @returns Updated checklist item
   */
  async verifyChecklistItem(itemId: string, verifierId: string, notes?: string): Promise<HandoverChecklistItem> {
    return this.updateChecklistItem(itemId, {
      verifiedBy: verifierId,
      verifiedAt: new Date(),
      notes,
    });
  }

  /**
   * Delete a checklist item
   * @param itemId - Checklist item ID
   */
  async deleteChecklistItem(itemId: string): Promise<void> {
    await prisma.handover_checklist_items.delete({
      where: { id: itemId },
    });
  }

  /**
   * Get checklist completion summary
   * @param transitionId - Transition ID
   * @param userId - Optional user ID to filter by
   * @returns Summary with completion statistics
   */
  async getChecklistSummary(
    transitionId: string,
    userId?: string
  ): Promise<{
    totalItems: number;
    completedItems: number;
    verifiedItems: number;
    percentComplete: number;
    percentVerified: number;
    itemsByCategory: Array<{
      category: string;
      total: number;
      completed: number;
      verified: number;
    }>;
  }> {
    const where: any = { transition_id: transitionId };
    if (userId) {
      where.user_id = userId;
    }

    const items = await prisma.handover_checklist_items.findMany({
      where,
    });

    const totalItems = items.length;
    const completedItems = items.filter((item) => item.completed).length;
    const verifiedItems = items.filter((item) => item.verified_by !== null).length;
    const percentComplete = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const percentVerified = totalItems > 0 ? Math.round((verifiedItems / totalItems) * 100) : 0;

    // Group by category
    const categoryMap = new Map<string, { total: number; completed: number; verified: number }>();
    items.forEach((item) => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, { total: 0, completed: 0, verified: 0 });
      }
      const stats = categoryMap.get(item.category)!;
      stats.total++;
      if (item.completed) stats.completed++;
      if (item.verified_by !== null) stats.verified++;
    });

    const itemsByCategory = Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      ...stats,
    }));

    return {
      totalItems,
      completedItems,
      verifiedItems,
      percentComplete,
      percentVerified,
      itemsByCategory,
    };
  }

  /**
   * Get checklist categories for a transition
   * @param transitionId - Transition ID
   * @returns Array of unique categories
   */
  async getChecklistCategories(transitionId: string): Promise<string[]> {
    const categories = await prisma.handover_checklist_items.findMany({
      where: { transition_id: transitionId },
      select: { category: true },
      distinct: ['category'],
    });

    return categories.map((c) => c.category);
  }

  /**
   * Initialize standard checklist template for a transition
   * @param transitionId - Transition ID
   * @param userId - User ID
   * @returns Array of created checklist items
   */
  async initializeStandardChecklist(transitionId: string, userId: string): Promise<HandoverChecklistItem[]> {
    const standardItems: CreateChecklistItemRequest[] = [
      // Documentation Category
      {
        transitionId,
        userId,
        itemText: 'Document all system architectures and dependencies',
        description: 'Create comprehensive documentation of system architecture, integrations, and dependencies',
        category: 'Documentation',
        orderIndex: 1,
      },
      {
        transitionId,
        userId,
        itemText: 'Document operational procedures and runbooks',
        description: 'Compile all operational procedures, troubleshooting guides, and runbooks',
        category: 'Documentation',
        orderIndex: 2,
      },
      {
        transitionId,
        userId,
        itemText: 'Document security protocols and access controls',
        description: 'Detail all security configurations, access controls, and authentication mechanisms',
        category: 'Documentation',
        orderIndex: 3,
      },
      // Knowledge Transfer Category
      {
        transitionId,
        userId,
        itemText: 'Conduct system overview training sessions',
        description: 'Provide comprehensive overview of all systems and their interactions',
        category: 'Knowledge Transfer',
        orderIndex: 1,
      },
      {
        transitionId,
        userId,
        itemText: 'Complete hands-on operational training',
        description: 'Conduct practical training on day-to-day operations and common tasks',
        category: 'Knowledge Transfer',
        orderIndex: 2,
      },
      {
        transitionId,
        userId,
        itemText: 'Review incident response procedures',
        description: 'Walk through incident response protocols and escalation procedures',
        category: 'Knowledge Transfer',
        orderIndex: 3,
      },
      // Access & Credentials Category
      {
        transitionId,
        userId,
        itemText: 'Transfer system access credentials',
        description: 'Securely transfer all necessary system access credentials',
        category: 'Access & Credentials',
        orderIndex: 1,
      },
      {
        transitionId,
        userId,
        itemText: 'Update access control lists',
        description: 'Update all ACLs to reflect incoming contractor permissions',
        category: 'Access & Credentials',
        orderIndex: 2,
      },
      {
        transitionId,
        userId,
        itemText: 'Document credential rotation procedures',
        description: 'Explain credential rotation policies and procedures',
        category: 'Access & Credentials',
        orderIndex: 3,
      },
      // Final Verification Category
      {
        transitionId,
        userId,
        itemText: 'Complete knowledge verification assessment',
        description: 'Incoming contractor demonstrates understanding of all key systems',
        category: 'Final Verification',
        orderIndex: 1,
      },
      {
        transitionId,
        userId,
        itemText: 'Conduct shadowing sessions',
        description: 'Incoming contractor shadows outgoing contractor for full operational cycle',
        category: 'Final Verification',
        orderIndex: 2,
      },
      {
        transitionId,
        userId,
        itemText: 'Obtain government PM sign-off',
        description: 'Government PM approves completion of handover process',
        category: 'Final Verification',
        orderIndex: 3,
      },
    ];

    return this.createChecklistItems(standardItems);
  }

  /**
   * Transform database item to API format
   */
  private transformItem(item: any): HandoverChecklistItem {
    return {
      id: item.id,
      transitionId: item.transition_id,
      userId: item.user_id,
      itemText: item.item_text,
      description: item.description,
      category: item.category,
      orderIndex: item.order_index,
      completed: item.completed,
      completedAt: item.completed_at,
      verifiedBy: item.verified_by,
      verifiedAt: item.verified_at,
      notes: item.notes,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }
}

export default new HandoverChecklistService();
