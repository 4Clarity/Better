/**
 * Platform Setup Service
 * Manages the 5-step platform initialization wizard for Government PM persona
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PlatformSetupStep {
  id: string;
  stepNumber: number;
  stepName: string;
  stepDescription: string | null;
  status: 'not-started' | 'in-progress' | 'complete';
  completedAt: Date | null;
  completedBy: string | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateStepStatusRequest {
  status: 'not-started' | 'in-progress' | 'complete';
  completedBy?: string;
  metadata?: any;
}

export class PlatformSetupService {
  /**
   * Get all platform setup steps
   * @returns Array of platform setup steps in order
   */
  async getPlatformSetupStatus(): Promise<PlatformSetupStep[]> {
    const steps = await prisma.platform_setup.findMany({
      orderBy: { step_number: 'asc' },
    });

    return steps.map((step) => ({
      id: step.id,
      stepNumber: step.step_number,
      stepName: step.step_name,
      stepDescription: step.step_description,
      status: step.status as 'not-started' | 'in-progress' | 'complete',
      completedAt: step.completed_at,
      completedBy: step.completed_by,
      metadata: step.metadata,
      createdAt: step.created_at,
      updatedAt: step.updated_at,
    }));
  }

  /**
   * Get a specific platform setup step by step number
   * @param stepNumber - Step number (1-5)
   * @returns Platform setup step or null if not found
   */
  async getPlatformSetupStep(stepNumber: number): Promise<PlatformSetupStep | null> {
    if (stepNumber < 1 || stepNumber > 5) {
      throw new Error('Invalid step number. Must be between 1 and 5.');
    }

    const step = await prisma.platform_setup.findFirst({
      where: { step_number: stepNumber },
    });

    if (!step) {
      return null;
    }

    return {
      id: step.id,
      stepNumber: step.step_number,
      stepName: step.step_name,
      stepDescription: step.step_description,
      status: step.status as 'not-started' | 'in-progress' | 'complete',
      completedAt: step.completed_at,
      completedBy: step.completed_by,
      metadata: step.metadata,
      createdAt: step.created_at,
      updatedAt: step.updated_at,
    };
  }

  /**
   * Update platform setup step status
   * @param stepNumber - Step number (1-5)
   * @param data - Update data including status and optional completion info
   * @returns Updated platform setup step
   */
  async updatePlatformSetupStep(
    stepNumber: number,
    data: UpdateStepStatusRequest
  ): Promise<PlatformSetupStep> {
    if (stepNumber < 1 || stepNumber > 5) {
      throw new Error('Invalid step number. Must be between 1 and 5.');
    }

    // Validate status transition
    if (!['not-started', 'in-progress', 'complete'].includes(data.status)) {
      throw new Error('Invalid status. Must be one of: not-started, in-progress, complete');
    }

    // Find the step
    const existingStep = await prisma.platform_setup.findFirst({
      where: { step_number: stepNumber },
    });

    if (!existingStep) {
      throw new Error(`Platform setup step ${stepNumber} not found`);
    }

    // Prepare update data
    const updateData: any = {
      status: data.status,
      updated_at: new Date(),
    };

    if (data.status === 'complete') {
      updateData.completed_at = new Date();
      if (data.completedBy) {
        updateData.completed_by = data.completedBy;
      }
    } else {
      // Clear completion data if moving back from complete
      updateData.completed_at = null;
      updateData.completed_by = null;
    }

    if (data.metadata) {
      updateData.metadata = data.metadata;
    }

    // Update the step
    const updatedStep = await prisma.platform_setup.update({
      where: { id: existingStep.id },
      data: updateData,
    });

    return {
      id: updatedStep.id,
      stepNumber: updatedStep.step_number,
      stepName: updatedStep.step_name,
      stepDescription: updatedStep.step_description,
      status: updatedStep.status as 'not-started' | 'in-progress' | 'complete',
      completedAt: updatedStep.completed_at,
      completedBy: updatedStep.completed_by,
      metadata: updatedStep.metadata,
      createdAt: updatedStep.created_at,
      updatedAt: updatedStep.updated_at,
    };
  }

  /**
   * Complete a platform setup step
   * @param stepNumber - Step number (1-5)
   * @param userId - User ID completing the step
   * @returns Updated platform setup step
   */
  async completePlatformSetupStep(stepNumber: number, userId: string): Promise<PlatformSetupStep> {
    return this.updatePlatformSetupStep(stepNumber, {
      status: 'complete',
      completedBy: userId,
    });
  }

  /**
   * Get platform setup progress summary
   * @returns Summary of setup progress
   */
  async getPlatformSetupProgress(): Promise<{
    totalSteps: number;
    completedSteps: number;
    inProgressSteps: number;
    notStartedSteps: number;
    percentComplete: number;
    currentStep: number | null;
  }> {
    const steps = await prisma.platform_setup.findMany({
      orderBy: { step_number: 'asc' },
    });

    const completedSteps = steps.filter((s) => s.status === 'complete').length;
    const inProgressSteps = steps.filter((s) => s.status === 'in-progress').length;
    const notStartedSteps = steps.filter((s) => s.status === 'not-started').length;
    const percentComplete = Math.round((completedSteps / steps.length) * 100);

    // Find the current step (first incomplete step)
    const currentStepRecord = steps.find((s) => s.status !== 'complete');
    const currentStep = currentStepRecord ? currentStepRecord.step_number : null;

    return {
      totalSteps: steps.length,
      completedSteps,
      inProgressSteps,
      notStartedSteps,
      percentComplete,
      currentStep,
    };
  }

  /**
   * Reset all platform setup steps (for testing/demo purposes)
   * CAUTION: This resets all progress
   */
  async resetPlatformSetup(): Promise<void> {
    await prisma.platform_setup.updateMany({
      data: {
        status: 'not-started',
        completed_at: null,
        completed_by: null,
        metadata: {},
        updated_at: new Date(),
      },
    });
  }
}

export default new PlatformSetupService();
