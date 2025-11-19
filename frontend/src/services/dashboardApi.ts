/**
 * Dashboard API Service
 * API calls for role-specific dashboard data
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { api } from './api';

export interface DashboardMetrics {
  [key: string]: number;
}

export interface GovernmentPMDashboard {
  metrics: {
    activeTransitions: number;
    pendingReviews: number;
    knowledgeArticles: number;
    onTrackRate: number;
  };
  platformSetup: Array<{
    title: string;
    status: 'not-started' | 'in-progress' | 'complete';
  }>;
  curationQueue: Array<{
    title: string;
    submittedBy: string;
    submittedAt: string;
    status: string;
  }>;
  transitionRoadmap: {
    contracts: Array<{
      name: string;
      progress: number;
      status: 'on-track' | 'at-risk' | 'critical';
    }>;
    personnel: Array<{
      role: string;
      count: number;
      status: 'training' | 'ready' | 'pending';
    }>;
  };
}

export interface OutgoingContractorDashboard {
  metrics: {
    documentsUploaded: number;
    trainingSessions: number;
    handoverComplete: number;
    daysRemaining: number;
  };
  handoverTimeline: Array<{
    title: string;
    status: 'not-started' | 'in-progress' | 'complete';
  }>;
  activityLog: Array<{
    title: string;
    description: string;
    timestamp: string;
    status: string;
  }>;
  verificationChecklist: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
}

export interface IncomingContractorDashboard {
  metrics: {
    overallProgress: number;
    modulesCompleted: number;
    hoursLogged: number;
    quizAverage: number;
  };
  learningRoadmap: Array<{
    module: string;
    progress: number;
    status: 'not-started' | 'in-progress' | 'complete';
  }>;
  skillsToMaster: Array<{
    skill: string;
    progress: number;
  }>;
  learningResources: Array<{
    title: string;
    type: 'document' | 'video';
    url: string;
    thumbnail?: string;
  }>;
}

export const dashboardApi = {
  /**
   * Get Government PM dashboard data
   */
  async getGovernmentPMDashboard(): Promise<GovernmentPMDashboard> {
    const response = await api.get('/dashboard/government-pm');
    const data = await response.json();
    return data.data;
  },

  /**
   * Get Outgoing Contractor dashboard data
   */
  async getOutgoingContractorDashboard(): Promise<OutgoingContractorDashboard> {
    const response = await api.get('/dashboard/outgoing-contractor');
    const data = await response.json();
    return data.data;
  },

  /**
   * Get Incoming Contractor dashboard data
   */
  async getIncomingContractorDashboard(): Promise<IncomingContractorDashboard> {
    const response = await api.get('/dashboard/incoming-contractor');
    const data = await response.json();
    return data.data;
  },

  /**
   * Get metrics for a specific role
   */
  async getMetricsByRole(role: 'government-pm' | 'outgoing-contractor' | 'incoming-contractor'): Promise<DashboardMetrics> {
    const response = await api.get(`/dashboard/metrics/${role}`);
    const data = await response.json();
    return data.data;
  },
};
