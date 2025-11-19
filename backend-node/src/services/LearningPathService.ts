/**
 * Learning Path Service
 * Manages learning modules and tracks user progress for Incoming Contractor persona
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LearningModule {
  id: string;
  moduleName: string;
  description: string | null;
  orderIndex: number;
  estimatedMinutes: number;
  contentUrl: string | null;
  prerequisites: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserLearningProgress {
  id: string;
  userId: string;
  moduleId: string;
  progressPercentage: number;
  timeSpentMinutes: number;
  quizScore: number | null;
  lastAccessedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  module?: LearningModule;
}

export interface CreateLearningModuleRequest {
  moduleName: string;
  description?: string;
  orderIndex: number;
  estimatedMinutes: number;
  contentUrl?: string;
  prerequisites?: string;
  isActive?: boolean;
}

export interface UpdateLearningModuleRequest {
  moduleName?: string;
  description?: string;
  orderIndex?: number;
  estimatedMinutes?: number;
  contentUrl?: string;
  prerequisites?: string;
  isActive?: boolean;
}

export interface UpdateProgressRequest {
  progressPercentage?: number;
  timeSpentMinutes?: number;
  quizScore?: number;
  lastAccessedAt?: Date;
  completedAt?: Date;
}

export class LearningPathService {
  /**
   * Get all active learning modules in order
   * @returns Array of active learning modules
   */
  async getAllModules(): Promise<LearningModule[]> {
    const modules = await prisma.learning_modules.findMany({
      where: { is_active: true },
      orderBy: { order_index: 'asc' },
    });

    return modules.map(this.transformModule);
  }

  /**
   * Get a specific learning module by ID
   * @param moduleId - Module ID
   * @returns Learning module or null if not found
   */
  async getModuleById(moduleId: string): Promise<LearningModule | null> {
    const module = await prisma.learning_modules.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      return null;
    }

    return this.transformModule(module);
  }

  /**
   * Create a new learning module
   * @param data - Module creation data
   * @returns Created learning module
   */
  async createModule(data: CreateLearningModuleRequest): Promise<LearningModule> {
    const module = await prisma.learning_modules.create({
      data: {
        module_name: data.moduleName,
        description: data.description || null,
        order_index: data.orderIndex,
        estimated_minutes: data.estimatedMinutes,
        content_url: data.contentUrl || null,
        prerequisites: data.prerequisites || null,
        is_active: data.isActive !== undefined ? data.isActive : true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return this.transformModule(module);
  }

  /**
   * Update a learning module
   * @param moduleId - Module ID
   * @param data - Update data
   * @returns Updated learning module
   */
  async updateModule(moduleId: string, data: UpdateLearningModuleRequest): Promise<LearningModule> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (data.moduleName !== undefined) updateData.module_name = data.moduleName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.orderIndex !== undefined) updateData.order_index = data.orderIndex;
    if (data.estimatedMinutes !== undefined) updateData.estimated_minutes = data.estimatedMinutes;
    if (data.contentUrl !== undefined) updateData.content_url = data.contentUrl;
    if (data.prerequisites !== undefined) updateData.prerequisites = data.prerequisites;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const module = await prisma.learning_modules.update({
      where: { id: moduleId },
      data: updateData,
    });

    return this.transformModule(module);
  }

  /**
   * Delete (deactivate) a learning module
   * @param moduleId - Module ID
   */
  async deleteModule(moduleId: string): Promise<void> {
    await prisma.learning_modules.update({
      where: { id: moduleId },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Get user's learning progress for all modules
   * @param userId - User ID
   * @returns Array of user progress records with module details
   */
  async getUserProgress(userId: string): Promise<UserLearningProgress[]> {
    const progressRecords = await prisma.user_learning_progress.findMany({
      where: { user_id: userId },
      include: {
        learning_modules: true,
      },
      orderBy: { updated_at: 'desc' },
    });

    return progressRecords.map((record) => this.transformProgress(record));
  }

  /**
   * Get user's progress for a specific module
   * @param userId - User ID
   * @param moduleId - Module ID
   * @returns User progress record or null if not found
   */
  async getUserModuleProgress(userId: string, moduleId: string): Promise<UserLearningProgress | null> {
    const progress = await prisma.user_learning_progress.findFirst({
      where: {
        user_id: userId,
        module_id: moduleId,
      },
      include: {
        learning_modules: true,
      },
    });

    if (!progress) {
      return null;
    }

    return this.transformProgress(progress);
  }

  /**
   * Update user's progress for a module
   * @param userId - User ID
   * @param moduleId - Module ID
   * @param data - Progress update data
   * @returns Updated progress record
   */
  async updateUserProgress(
    userId: string,
    moduleId: string,
    data: UpdateProgressRequest
  ): Promise<UserLearningProgress> {
    // Check if progress record exists
    const existingProgress = await prisma.user_learning_progress.findFirst({
      where: {
        user_id: userId,
        module_id: moduleId,
      },
    });

    const updateData: any = {
      updated_at: new Date(),
    };

    if (data.progressPercentage !== undefined) {
      updateData.progress_percentage = Math.min(100, Math.max(0, data.progressPercentage));
    }
    if (data.timeSpentMinutes !== undefined) {
      updateData.time_spent_minutes = Math.max(0, data.timeSpentMinutes);
    }
    if (data.quizScore !== undefined) {
      updateData.quiz_score = data.quizScore;
    }
    if (data.lastAccessedAt !== undefined) {
      updateData.last_accessed_at = data.lastAccessedAt;
    }
    if (data.completedAt !== undefined) {
      updateData.completed_at = data.completedAt;
    }

    let progress;
    if (existingProgress) {
      // Update existing record
      progress = await prisma.user_learning_progress.update({
        where: { id: existingProgress.id },
        data: updateData,
        include: {
          learning_modules: true,
        },
      });
    } else {
      // Create new progress record
      progress = await prisma.user_learning_progress.create({
        data: {
          user_id: userId,
          module_id: moduleId,
          progress_percentage: data.progressPercentage || 0,
          time_spent_minutes: data.timeSpentMinutes || 0,
          quiz_score: data.quizScore || null,
          last_accessed_at: data.lastAccessedAt || new Date(),
          completed_at: data.completedAt || null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        include: {
          learning_modules: true,
        },
      });
    }

    return this.transformProgress(progress);
  }

  /**
   * Mark a module as completed for a user
   * @param userId - User ID
   * @param moduleId - Module ID
   * @param quizScore - Optional quiz score (0-100)
   * @returns Updated progress record
   */
  async completeModule(userId: string, moduleId: string, quizScore?: number): Promise<UserLearningProgress> {
    return this.updateUserProgress(userId, moduleId, {
      progressPercentage: 100,
      completedAt: new Date(),
      lastAccessedAt: new Date(),
      quizScore: quizScore,
    });
  }

  /**
   * Get learning path summary for a user
   * @param userId - User ID
   * @returns Summary with overall progress and module breakdown
   */
  async getLearningPathSummary(userId: string): Promise<{
    overallProgress: number;
    totalModules: number;
    completedModules: number;
    inProgressModules: number;
    notStartedModules: number;
    totalTimeSpent: number;
    averageQuizScore: number;
    modules: Array<{
      moduleId: string;
      moduleName: string;
      progress: number;
      status: 'not-started' | 'in-progress' | 'complete';
      timeSpent: number;
      quizScore: number | null;
    }>;
  }> {
    const allModules = await this.getAllModules();
    const userProgress = await this.getUserProgress(userId);

    const progressMap = new Map(userProgress.map((p) => [p.moduleId, p]));

    const modules = allModules.map((module) => {
      const progress = progressMap.get(module.id);
      let status: 'not-started' | 'in-progress' | 'complete' = 'not-started';
      if (progress) {
        if (progress.progressPercentage === 100) status = 'complete';
        else if (progress.progressPercentage > 0) status = 'in-progress';
      }

      return {
        moduleId: module.id,
        moduleName: module.moduleName,
        progress: progress?.progressPercentage || 0,
        status,
        timeSpent: progress?.timeSpentMinutes || 0,
        quizScore: progress?.quizScore || null,
      };
    });

    const completedModules = modules.filter((m) => m.status === 'complete').length;
    const inProgressModules = modules.filter((m) => m.status === 'in-progress').length;
    const notStartedModules = modules.filter((m) => m.status === 'not-started').length;
    const totalTimeSpent = modules.reduce((sum, m) => sum + m.timeSpent, 0);
    const quizScores = modules.filter((m) => m.quizScore !== null).map((m) => m.quizScore!);
    const averageQuizScore =
      quizScores.length > 0 ? Math.round(quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length) : 0;
    const overallProgress =
      modules.length > 0 ? Math.round(modules.reduce((sum, m) => sum + m.progress, 0) / modules.length) : 0;

    return {
      overallProgress,
      totalModules: allModules.length,
      completedModules,
      inProgressModules,
      notStartedModules,
      totalTimeSpent,
      averageQuizScore,
      modules,
    };
  }

  /**
   * Transform database learning module to API format
   */
  private transformModule(module: any): LearningModule {
    return {
      id: module.id,
      moduleName: module.module_name,
      description: module.description,
      orderIndex: module.order_index,
      estimatedMinutes: module.estimated_minutes,
      contentUrl: module.content_url,
      prerequisites: module.prerequisites,
      isActive: module.is_active,
      createdAt: module.created_at,
      updatedAt: module.updated_at,
    };
  }

  /**
   * Transform database progress record to API format
   */
  private transformProgress(progress: any): UserLearningProgress {
    return {
      id: progress.id,
      userId: progress.user_id,
      moduleId: progress.module_id,
      progressPercentage: progress.progress_percentage,
      timeSpentMinutes: progress.time_spent_minutes,
      quizScore: progress.quiz_score,
      lastAccessedAt: progress.last_accessed_at,
      completedAt: progress.completed_at,
      createdAt: progress.created_at,
      updatedAt: progress.updated_at,
      module: progress.learning_modules ? this.transformModule(progress.learning_modules) : undefined,
    };
  }
}

export default new LearningPathService();
