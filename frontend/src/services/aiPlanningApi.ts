/**
 * AI Planning API Service
 * Story 1.4: AI-Assisted Transition Planning with Intelligent Task and Milestone Generation
 */

import axios from '../lib/axios';
import {
  PlanningSession,
  PlanningResponse,
  TaskRecommendation,
  MilestoneRecommendation,
  TransitionType,
  ExecutionMode,
  AIPlanningHealthCheck,
} from '../types/ai-planning';

const API_BASE_URL = '/ai-planning';

/**
 * Check health status of AI Planning service
 */
export const checkAIPlanningHealth = async (): Promise<AIPlanningHealthCheck> => {
  try {
    const response = await axios.get<AIPlanningHealthCheck>(`${API_BASE_URL}/health`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'AI Planning service is unavailable');
    }
    throw error;
  }
};

/**
 * Start a new AI planning session
 */
export const startPlanningSession = async (
  transitionId: string,
  transitionType: TransitionType,
  executionMode: ExecutionMode = ExecutionMode.DIRECT_LLM
): Promise<PlanningSession> => {
  try {
    const response = await axios.post<PlanningSession>(`${API_BASE_URL}/start`, {
      transitionId,
      transitionType,
      executionMode,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to start AI planning session';
      throw new Error(errorMessage);
    }
    throw error;
  }
};

/**
 * Submit user responses to planning questions
 */
export const submitPlanningResponses = async (
  sessionId: string,
  responses: PlanningResponse[]
): Promise<PlanningSession> => {
  try {
    const response = await axios.post<PlanningSession>(
      `${API_BASE_URL}/sessions/${sessionId}/respond`,
      responses
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to submit responses');
    }
    throw error;
  }
};

/**
 * Get current planning session state
 */
export const getPlanningSession = async (sessionId: string): Promise<PlanningSession> => {
  try {
    const response = await axios.get<PlanningSession>(
      `${API_BASE_URL}/sessions/${sessionId}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to get planning session');
    }
    throw error;
  }
};

/**
 * Generate AI recommendations for tasks and milestones
 */
export const generateRecommendations = async (
  sessionId: string
): Promise<{
  tasks: TaskRecommendation[];
  milestones: MilestoneRecommendation[];
}> => {
  try {
    const response = await axios.post<{
      session_id: string;
      tasks: TaskRecommendation[];
      milestones: MilestoneRecommendation[];
    }>(`${API_BASE_URL}/sessions/${sessionId}/generate`);

    return {
      tasks: response.data.tasks,
      milestones: response.data.milestones,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to generate recommendations');
    }
    throw error;
  }
};

/**
 * Accept AI recommendations and create tasks/milestones
 */
export const acceptRecommendations = async (
  sessionId: string,
  taskIds: string[],
  milestoneIds: string[],
  edits?: Record<string, any>
): Promise<{
  tasksCreated: number;
  milestonesCreated: number;
}> => {
  try {
    const response = await axios.post<{
      success: boolean;
      tasksCreated: number;
      milestonesCreated: number;
    }>(`${API_BASE_URL}/sessions/${sessionId}/accept`, {
      taskIds,
      milestoneIds,
      edits: edits || {},
    });

    return {
      tasksCreated: response.data.tasksCreated,
      milestonesCreated: response.data.milestonesCreated,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to accept recommendations');
    }
    throw error;
  }
};

/**
 * Reject AI recommendations
 */
export const rejectRecommendations = async (
  sessionId: string,
  reason?: string
): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/sessions/${sessionId}/reject`, {
      reason: reason || 'User chose manual planning',
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to reject recommendations');
    }
    throw error;
  }
};
