/**
 * Platform Setup API Service
 * API calls for platform initialization wizard
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { api } from './api';

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

export interface PlatformSetupProgress {
  totalSteps: number;
  completedSteps: number;
  inProgressSteps: number;
  notStartedSteps: number;
  percentComplete: number;
  currentStep: number | null;
}

export const platformSetupApi = {
  /**
   * Get all platform setup steps
   */
  async getSetupStatus(): Promise<PlatformSetupStep[]> {
    const response = await api.get('/platform/setup-status');
    const data = await response.json();
    return data.data;
  },

  /**
   * Get platform setup progress summary
   */
  async getProgress(): Promise<PlatformSetupProgress> {
    const response = await api.get('/platform/setup/progress');
    const data = await response.json();
    return data.data;
  },

  /**
   * Get a specific setup step
   */
  async getStep(stepNumber: number): Promise<PlatformSetupStep> {
    const response = await api.get(`/platform/setup/${stepNumber}`);
    const data = await response.json();
    return data.data;
  },

  /**
   * Update a setup step status
   */
  async updateStep(
    stepNumber: number,
    data: {
      status: 'not-started' | 'in-progress' | 'complete';
      completedBy?: string;
      metadata?: any;
    }
  ): Promise<PlatformSetupStep> {
    const response = await api.patch(`/platform/setup/${stepNumber}`, data);
    const responseData = await response.json();
    return responseData.data;
  },

  /**
   * Mark a step as complete
   */
  async completeStep(stepNumber: number): Promise<PlatformSetupStep> {
    const response = await api.post(`/platform/setup/${stepNumber}/complete`);
    const data = await response.json();
    return data.data;
  },
};
