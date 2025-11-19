/**
 * Activity Log Service
 * Tracks and manages user activity logs for audit trails and timeline views
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ActivityLog {
  id: string;
  userId: string;
  transitionId: string | null;
  activityType: string;
  description: string;
  metadata: any;
  timestamp: Date;
  createdAt: Date;
}

export interface CreateActivityLogRequest {
  userId: string;
  transitionId?: string;
  activityType: string;
  description: string;
  metadata?: any;
}

export interface ActivityLogFilter {
  userId?: string;
  transitionId?: string;
  activityType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class ActivityLogService {
  /**
   * Create a new activity log entry
   * @param data - Activity log data
   * @returns Created activity log
   */
  async logActivity(data: CreateActivityLogRequest): Promise<ActivityLog> {
    const log = await prisma.activity_logs.create({
      data: {
        user_id: data.userId,
        transition_id: data.transitionId || null,
        activity_type: data.activityType,
        description: data.description,
        metadata: data.metadata || {},
        timestamp: new Date(),
        created_at: new Date(),
      },
    });

    return this.transformLog(log);
  }

  /**
   * Get activity logs with filters
   * @param filters - Filter criteria
   * @returns Array of activity logs
   */
  async getActivityLogs(filters: ActivityLogFilter = {}): Promise<ActivityLog[]> {
    const where: any = {};

    if (filters.userId) {
      where.user_id = filters.userId;
    }
    if (filters.transitionId) {
      where.transition_id = filters.transitionId;
    }
    if (filters.activityType) {
      where.activity_type = filters.activityType;
    }
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    const logs = await prisma.activity_logs.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });

    return logs.map(this.transformLog);
  }

  /**
   * Get activity logs for a specific user
   * @param userId - User ID
   * @param limit - Maximum number of logs to return
   * @returns Array of activity logs
   */
  async getUserActivityLogs(userId: string, limit: number = 50): Promise<ActivityLog[]> {
    return this.getActivityLogs({ userId, limit });
  }

  /**
   * Get activity logs for a specific transition
   * @param transitionId - Transition ID
   * @param limit - Maximum number of logs to return
   * @returns Array of activity logs
   */
  async getTransitionActivityLogs(transitionId: string, limit: number = 100): Promise<ActivityLog[]> {
    return this.getActivityLogs({ transitionId, limit });
  }

  /**
   * Get activity logs by type
   * @param activityType - Activity type
   * @param limit - Maximum number of logs to return
   * @returns Array of activity logs
   */
  async getActivityLogsByType(activityType: string, limit: number = 50): Promise<ActivityLog[]> {
    return this.getActivityLogs({ activityType, limit });
  }

  /**
   * Get a specific activity log by ID
   * @param logId - Activity log ID
   * @returns Activity log or null if not found
   */
  async getActivityLogById(logId: string): Promise<ActivityLog | null> {
    const log = await prisma.activity_logs.findUnique({
      where: { id: logId },
    });

    if (!log) {
      return null;
    }

    return this.transformLog(log);
  }

  /**
   * Get activity timeline for a user
   * Organizes activities by date for timeline visualization
   * @param userId - User ID
   * @param limit - Maximum number of activities
   * @returns Timeline grouped by date
   */
  async getUserActivityTimeline(
    userId: string,
    limit: number = 50
  ): Promise<
    Array<{
      date: string;
      activities: ActivityLog[];
    }>
  > {
    const logs = await this.getUserActivityLogs(userId, limit);

    // Group by date
    const dateGroups = new Map<string, ActivityLog[]>();
    logs.forEach((log) => {
      const dateKey = log.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey)!.push(log);
    });

    // Convert to array and sort by date descending
    return Array.from(dateGroups.entries())
      .map(([date, activities]) => ({ date, activities }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Get activity timeline for a transition
   * Organizes activities by date for timeline visualization
   * @param transitionId - Transition ID
   * @param limit - Maximum number of activities
   * @returns Timeline grouped by date
   */
  async getTransitionActivityTimeline(
    transitionId: string,
    limit: number = 100
  ): Promise<
    Array<{
      date: string;
      activities: ActivityLog[];
    }>
  > {
    const logs = await this.getTransitionActivityLogs(transitionId, limit);

    // Group by date
    const dateGroups = new Map<string, ActivityLog[]>();
    logs.forEach((log) => {
      const dateKey = log.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey)!.push(log);
    });

    // Convert to array and sort by date descending
    return Array.from(dateGroups.entries())
      .map(([date, activities]) => ({ date, activities }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Get activity statistics for a user
   * @param userId - User ID
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Activity statistics
   */
  async getUserActivityStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalActivities: number;
    activitiesByType: Array<{ type: string; count: number }>;
    activitiesByDate: Array<{ date: string; count: number }>;
    mostRecentActivity: Date | null;
  }> {
    const logs = await this.getActivityLogs({
      userId,
      startDate,
      endDate,
      limit: 1000,
    });

    // Count by type
    const typeMap = new Map<string, number>();
    logs.forEach((log) => {
      typeMap.set(log.activityType, (typeMap.get(log.activityType) || 0) + 1);
    });
    const activitiesByType = Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Count by date
    const dateMap = new Map<string, number>();
    logs.forEach((log) => {
      const dateKey = log.timestamp.toISOString().split('T')[0];
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    });
    const activitiesByDate = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const mostRecentActivity = logs.length > 0 ? logs[0].timestamp : null;

    return {
      totalActivities: logs.length,
      activitiesByType,
      activitiesByDate,
      mostRecentActivity,
    };
  }

  /**
   * Get activity statistics for a transition
   * @param transitionId - Transition ID
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Activity statistics
   */
  async getTransitionActivityStats(
    transitionId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalActivities: number;
    activitiesByType: Array<{ type: string; count: number }>;
    activitiesByUser: Array<{ userId: string; count: number }>;
    activitiesByDate: Array<{ date: string; count: number }>;
  }> {
    const logs = await this.getActivityLogs({
      transitionId,
      startDate,
      endDate,
      limit: 1000,
    });

    // Count by type
    const typeMap = new Map<string, number>();
    logs.forEach((log) => {
      typeMap.set(log.activityType, (typeMap.get(log.activityType) || 0) + 1);
    });
    const activitiesByType = Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Count by user
    const userMap = new Map<string, number>();
    logs.forEach((log) => {
      userMap.set(log.userId, (userMap.get(log.userId) || 0) + 1);
    });
    const activitiesByUser = Array.from(userMap.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count);

    // Count by date
    const dateMap = new Map<string, number>();
    logs.forEach((log) => {
      const dateKey = log.timestamp.toISOString().split('T')[0];
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    });
    const activitiesByDate = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      totalActivities: logs.length,
      activitiesByType,
      activitiesByUser,
      activitiesByDate,
    };
  }

  /**
   * Delete old activity logs (cleanup)
   * @param daysToKeep - Number of days of logs to keep
   * @returns Number of deleted logs
   */
  async deleteOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.activity_logs.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Helper method to log common activity types
   */
  async logDocumentUpload(userId: string, transitionId: string, documentName: string): Promise<ActivityLog> {
    return this.logActivity({
      userId,
      transitionId,
      activityType: 'document_upload',
      description: `Uploaded document: ${documentName}`,
      metadata: { documentName },
    });
  }

  async logTrainingSession(userId: string, transitionId: string, sessionTitle: string): Promise<ActivityLog> {
    return this.logActivity({
      userId,
      transitionId,
      activityType: 'training_session',
      description: `Completed training session: ${sessionTitle}`,
      metadata: { sessionTitle },
    });
  }

  async logChecklistCompletion(userId: string, transitionId: string, itemText: string): Promise<ActivityLog> {
    return this.logActivity({
      userId,
      transitionId,
      activityType: 'checklist_completion',
      description: `Completed checklist item: ${itemText}`,
      metadata: { itemText },
    });
  }

  async logModuleCompletion(userId: string, moduleName: string, quizScore?: number): Promise<ActivityLog> {
    return this.logActivity({
      userId,
      activityType: 'module_completion',
      description: `Completed learning module: ${moduleName}${quizScore ? ` (Score: ${quizScore}%)` : ''}`,
      metadata: { moduleName, quizScore },
    });
  }

  async logSkillAssessment(userId: string, skillName: string, proficiency: number): Promise<ActivityLog> {
    return this.logActivity({
      userId,
      activityType: 'skill_assessment',
      description: `Skill assessed: ${skillName} (Proficiency: ${proficiency}/5)`,
      metadata: { skillName, proficiency },
    });
  }

  async logSystemAccess(userId: string, transitionId: string, systemName: string): Promise<ActivityLog> {
    return this.logActivity({
      userId,
      transitionId,
      activityType: 'system_access',
      description: `Accessed system: ${systemName}`,
      metadata: { systemName },
    });
  }

  /**
   * Transform database log to API format
   */
  private transformLog(log: any): ActivityLog {
    return {
      id: log.id,
      userId: log.user_id,
      transitionId: log.transition_id,
      activityType: log.activity_type,
      description: log.description,
      metadata: log.metadata,
      timestamp: log.timestamp,
      createdAt: log.created_at,
    };
  }
}

export default new ActivityLogService();
