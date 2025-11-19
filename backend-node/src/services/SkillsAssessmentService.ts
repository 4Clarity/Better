/**
 * Skills Assessment Service
 * Manages skills tracking and proficiency assessment for Incoming Contractor persona
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface Skill {
  id: string;
  skillName: string;
  category: string;
  description: string | null;
  requiredProficiency: number;
  assessmentCriteria: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSkillProgress {
  id: string;
  userId: string;
  skillId: string;
  progressPercentage: number;
  currentProficiency: number;
  assessedBy: string | null;
  assessedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  skill?: Skill;
}

export interface CreateSkillRequest {
  skillName: string;
  category: string;
  description?: string;
  requiredProficiency: number;
  assessmentCriteria?: string;
  isActive?: boolean;
}

export interface UpdateSkillRequest {
  skillName?: string;
  category?: string;
  description?: string;
  requiredProficiency?: number;
  assessmentCriteria?: string;
  isActive?: boolean;
}

export interface UpdateSkillProgressRequest {
  progressPercentage?: number;
  currentProficiency?: number;
  assessedBy?: string;
  assessedAt?: Date;
  notes?: string;
}

export class SkillsAssessmentService {
  /**
   * Get all active skills
   * @returns Array of active skills
   */
  async getAllSkills(): Promise<Skill[]> {
    const skills = await prisma.skills_master.findMany({
      where: { is_active: true },
      orderBy: { category: 'asc' },
    });

    return skills.map(this.transformSkill);
  }

  /**
   * Get skills by category
   * @param category - Skill category
   * @returns Array of skills in the category
   */
  async getSkillsByCategory(category: string): Promise<Skill[]> {
    const skills = await prisma.skills_master.findMany({
      where: {
        category,
        is_active: true,
      },
      orderBy: { skill_name: 'asc' },
    });

    return skills.map(this.transformSkill);
  }

  /**
   * Get a specific skill by ID
   * @param skillId - Skill ID
   * @returns Skill or null if not found
   */
  async getSkillById(skillId: string): Promise<Skill | null> {
    const skill = await prisma.skills_master.findUnique({
      where: { id: skillId },
    });

    if (!skill) {
      return null;
    }

    return this.transformSkill(skill);
  }

  /**
   * Create a new skill
   * @param data - Skill creation data
   * @returns Created skill
   */
  async createSkill(data: CreateSkillRequest): Promise<Skill> {
    const skill = await prisma.skills_master.create({
      data: {
        skill_name: data.skillName,
        category: data.category,
        description: data.description || null,
        required_proficiency: data.requiredProficiency,
        assessment_criteria: data.assessmentCriteria || null,
        is_active: data.isActive !== undefined ? data.isActive : true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return this.transformSkill(skill);
  }

  /**
   * Update a skill
   * @param skillId - Skill ID
   * @param data - Update data
   * @returns Updated skill
   */
  async updateSkill(skillId: string, data: UpdateSkillRequest): Promise<Skill> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (data.skillName !== undefined) updateData.skill_name = data.skillName;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.requiredProficiency !== undefined) updateData.required_proficiency = data.requiredProficiency;
    if (data.assessmentCriteria !== undefined) updateData.assessment_criteria = data.assessmentCriteria;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const skill = await prisma.skills_master.update({
      where: { id: skillId },
      data: updateData,
    });

    return this.transformSkill(skill);
  }

  /**
   * Delete (deactivate) a skill
   * @param skillId - Skill ID
   */
  async deleteSkill(skillId: string): Promise<void> {
    await prisma.skills_master.update({
      where: { id: skillId },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Get user's skill progress for all skills
   * @param userId - User ID
   * @returns Array of user skill progress records
   */
  async getUserSkillProgress(userId: string): Promise<UserSkillProgress[]> {
    const progressRecords = await prisma.user_skills_progress.findMany({
      where: { user_id: userId },
      include: {
        skills_master: true,
      },
      orderBy: { updated_at: 'desc' },
    });

    return progressRecords.map((record) => this.transformProgress(record));
  }

  /**
   * Get user's progress for a specific skill
   * @param userId - User ID
   * @param skillId - Skill ID
   * @returns User skill progress or null if not found
   */
  async getUserSkillById(userId: string, skillId: string): Promise<UserSkillProgress | null> {
    const progress = await prisma.user_skills_progress.findFirst({
      where: {
        user_id: userId,
        skill_id: skillId,
      },
      include: {
        skills_master: true,
      },
    });

    if (!progress) {
      return null;
    }

    return this.transformProgress(progress);
  }

  /**
   * Update user's skill progress
   * @param userId - User ID
   * @param skillId - Skill ID
   * @param data - Progress update data
   * @returns Updated progress record
   */
  async updateUserSkillProgress(
    userId: string,
    skillId: string,
    data: UpdateSkillProgressRequest
  ): Promise<UserSkillProgress> {
    // Check if progress record exists
    const existingProgress = await prisma.user_skills_progress.findFirst({
      where: {
        user_id: userId,
        skill_id: skillId,
      },
    });

    const updateData: any = {
      updated_at: new Date(),
    };

    if (data.progressPercentage !== undefined) {
      updateData.progress_percentage = Math.min(100, Math.max(0, data.progressPercentage));
    }
    if (data.currentProficiency !== undefined) {
      updateData.current_proficiency = Math.min(5, Math.max(1, data.currentProficiency));
    }
    if (data.assessedBy !== undefined) {
      updateData.assessed_by = data.assessedBy;
    }
    if (data.assessedAt !== undefined) {
      updateData.assessed_at = data.assessedAt;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    let progress;
    if (existingProgress) {
      // Update existing record
      progress = await prisma.user_skills_progress.update({
        where: { id: existingProgress.id },
        data: updateData,
        include: {
          skills_master: true,
        },
      });
    } else {
      // Create new progress record
      progress = await prisma.user_skills_progress.create({
        data: {
          user_id: userId,
          skill_id: skillId,
          progress_percentage: data.progressPercentage || 0,
          current_proficiency: data.currentProficiency || 1,
          assessed_by: data.assessedBy || null,
          assessed_at: data.assessedAt || null,
          notes: data.notes || null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        include: {
          skills_master: true,
        },
      });
    }

    return this.transformProgress(progress);
  }

  /**
   * Assess a user's skill proficiency
   * @param userId - User ID
   * @param skillId - Skill ID
   * @param proficiency - Proficiency level (1-5)
   * @param assessorId - ID of user performing assessment
   * @param notes - Assessment notes
   * @returns Updated progress record
   */
  async assessSkill(
    userId: string,
    skillId: string,
    proficiency: number,
    assessorId: string,
    notes?: string
  ): Promise<UserSkillProgress> {
    // Calculate progress percentage based on proficiency
    const skill = await this.getSkillById(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    const progressPercentage = Math.round((proficiency / skill.requiredProficiency) * 100);

    return this.updateUserSkillProgress(userId, skillId, {
      currentProficiency: proficiency,
      progressPercentage,
      assessedBy: assessorId,
      assessedAt: new Date(),
      notes,
    });
  }

  /**
   * Get skills assessment summary for a user
   * @param userId - User ID
   * @returns Summary with overall proficiency and skill breakdown
   */
  async getSkillsAssessmentSummary(userId: string): Promise<{
    overallProgress: number;
    totalSkills: number;
    masteredSkills: number;
    proficientSkills: number;
    developingSkills: number;
    notStartedSkills: number;
    averageProficiency: number;
    skillsByCategory: Array<{
      category: string;
      skills: Array<{
        skillId: string;
        skillName: string;
        progress: number;
        currentProficiency: number;
        requiredProficiency: number;
        status: 'mastered' | 'proficient' | 'developing' | 'not-started';
        assessedAt: Date | null;
      }>;
    }>;
  }> {
    const allSkills = await this.getAllSkills();
    const userProgress = await this.getUserSkillProgress(userId);

    const progressMap = new Map(userProgress.map((p) => [p.skillId, p]));

    // Group skills by category
    const categoryMap = new Map<string, any[]>();
    allSkills.forEach((skill) => {
      if (!categoryMap.has(skill.category)) {
        categoryMap.set(skill.category, []);
      }

      const progress = progressMap.get(skill.id);
      const currentProficiency = progress?.currentProficiency || 0;
      const progressPercentage = progress?.progressPercentage || 0;

      let status: 'mastered' | 'proficient' | 'developing' | 'not-started' = 'not-started';
      if (currentProficiency >= skill.requiredProficiency) {
        status = 'mastered';
      } else if (currentProficiency >= skill.requiredProficiency * 0.75) {
        status = 'proficient';
      } else if (currentProficiency > 0) {
        status = 'developing';
      }

      categoryMap.get(skill.category)!.push({
        skillId: skill.id,
        skillName: skill.skillName,
        progress: progressPercentage,
        currentProficiency,
        requiredProficiency: skill.requiredProficiency,
        status,
        assessedAt: progress?.assessedAt || null,
      });
    });

    // Convert category map to array
    const skillsByCategory = Array.from(categoryMap.entries()).map(([category, skills]) => ({
      category,
      skills,
    }));

    // Calculate summary statistics
    const allSkillsWithProgress = allSkills.map((skill) => {
      const progress = progressMap.get(skill.id);
      return {
        skill,
        progress: progress?.progressPercentage || 0,
        proficiency: progress?.currentProficiency || 0,
      };
    });

    const masteredSkills = allSkillsWithProgress.filter(
      (s) => s.proficiency >= s.skill.requiredProficiency
    ).length;
    const proficientSkills = allSkillsWithProgress.filter(
      (s) => s.proficiency >= s.skill.requiredProficiency * 0.75 && s.proficiency < s.skill.requiredProficiency
    ).length;
    const developingSkills = allSkillsWithProgress.filter(
      (s) => s.proficiency > 0 && s.proficiency < s.skill.requiredProficiency * 0.75
    ).length;
    const notStartedSkills = allSkillsWithProgress.filter((s) => s.proficiency === 0).length;

    const overallProgress =
      allSkillsWithProgress.length > 0
        ? Math.round(allSkillsWithProgress.reduce((sum, s) => sum + s.progress, 0) / allSkillsWithProgress.length)
        : 0;

    const proficiencies = allSkillsWithProgress.filter((s) => s.proficiency > 0).map((s) => s.proficiency);
    const averageProficiency =
      proficiencies.length > 0
        ? Math.round((proficiencies.reduce((sum, p) => sum + p, 0) / proficiencies.length) * 10) / 10
        : 0;

    return {
      overallProgress,
      totalSkills: allSkills.length,
      masteredSkills,
      proficientSkills,
      developingSkills,
      notStartedSkills,
      averageProficiency,
      skillsByCategory,
    };
  }

  /**
   * Get all skill categories
   * @returns Array of unique skill categories
   */
  async getSkillCategories(): Promise<string[]> {
    const categories = await prisma.skills_master.findMany({
      where: { is_active: true },
      select: { category: true },
      distinct: ['category'],
    });

    return categories.map((c) => c.category);
  }

  /**
   * Transform database skill to API format
   */
  private transformSkill(skill: any): Skill {
    return {
      id: skill.id,
      skillName: skill.skill_name,
      category: skill.category,
      description: skill.description,
      requiredProficiency: skill.required_proficiency,
      assessmentCriteria: skill.assessment_criteria,
      isActive: skill.is_active,
      createdAt: skill.created_at,
      updatedAt: skill.updated_at,
    };
  }

  /**
   * Transform database progress record to API format
   */
  private transformProgress(progress: any): UserSkillProgress {
    return {
      id: progress.id,
      userId: progress.user_id,
      skillId: progress.skill_id,
      progressPercentage: progress.progress_percentage,
      currentProficiency: progress.current_proficiency,
      assessedBy: progress.assessed_by,
      assessedAt: progress.assessed_at,
      notes: progress.notes,
      createdAt: progress.created_at,
      updatedAt: progress.updated_at,
      skill: progress.skills_master ? this.transformSkill(progress.skills_master) : undefined,
    };
  }
}

export default new SkillsAssessmentService();
