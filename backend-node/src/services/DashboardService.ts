/**
 * Dashboard Service
 * Provides role-specific dashboard data for Government PM, Outgoing Contractor, and Incoming Contractor personas
 * Story: 1.5 - Roadmap UI Complete Implementation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DashboardMetrics {
  [key: string]: number;
}

export interface PlatformSetupStep {
  title: string;
  status: 'not-started' | 'in-progress' | 'complete';
}

export interface CurationQueueItem {
  title: string;
  submittedBy: string;
  submittedAt: string;
  status: string;
}

export interface TransitionRoadmapContract {
  name: string;
  progress: number;
  status: 'on-track' | 'at-risk' | 'critical';
}

export interface TransitionRoadmapPersonnel {
  role: string;
  count: number;
  status: 'training' | 'ready' | 'pending';
}

export interface GovernmentPMDashboardData {
  metrics: {
    activeTransitions: number;
    pendingReviews: number;
    knowledgeArticles: number;
    onTrackRate: number;
  };
  platformSetup: PlatformSetupStep[];
  curationQueue: CurationQueueItem[];
  transitionRoadmap: {
    contracts: TransitionRoadmapContract[];
    personnel: TransitionRoadmapPersonnel[];
  };
}

export interface HandoverTimelineStep {
  title: string;
  status: 'not-started' | 'in-progress' | 'complete';
}

export interface ActivityLogItem {
  title: string;
  description: string;
  timestamp: string;
  status: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface OutgoingContractorDashboardData {
  metrics: {
    documentsUploaded: number;
    trainingSessions: number;
    handoverComplete: number;
    daysRemaining: number;
  };
  handoverTimeline: HandoverTimelineStep[];
  activityLog: ActivityLogItem[];
  verificationChecklist: ChecklistItem[];
}

export interface LearningModule {
  module: string;
  progress: number;
  status: 'not-started' | 'in-progress' | 'complete';
}

export interface SkillToMaster {
  skill: string;
  progress: number;
}

export interface LearningResource {
  title: string;
  type: 'document' | 'video';
  url: string;
  thumbnail?: string;
}

export interface IncomingContractorDashboardData {
  metrics: {
    overallProgress: number;
    modulesCompleted: number;
    hoursLogged: number;
    quizAverage: number;
  };
  learningRoadmap: LearningModule[];
  skillsToMaster: SkillToMaster[];
  learningResources: LearningResource[];
}

export class DashboardService {
  /**
   * Get Government PM Dashboard Data
   * @param userId - User ID of the Government PM
   * @returns Dashboard data specific to Government PM persona
   */
  async getGovernmentPMDashboardData(userId: string): Promise<GovernmentPMDashboardData> {
    // Get platform setup status (5 steps)
    const platformSetupSteps = await prisma.platform_setup.findMany({
      orderBy: { step_number: 'asc' },
    });

    const platformSetup: PlatformSetupStep[] = platformSetupSteps.map((step) => ({
      title: step.step_name,
      status: step.status as 'not-started' | 'in-progress' | 'complete',
    }));

    // Get knowledge curation queue (artifacts under review)
    const pendingArtifacts = await prisma.artifacts.findMany({
      where: { status: 'Under_Review' },
      include: {
        users_artifacts_submittedByTousers: {
          include: { person: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 10,
    });

    const curationQueue: CurationQueueItem[] = pendingArtifacts.map((artifact) => ({
      title: artifact.name,
      submittedBy: `${artifact.users_artifacts_submittedByTousers.person.firstName} ${artifact.users_artifacts_submittedByTousers.person.lastName}`,
      submittedAt: artifact.submittedAt?.toISOString() || new Date().toISOString(),
      status: 'pending',
    }));

    // Get active transitions
    const activeTransitions = await prisma.transitions.count({
      where: {
        status: { in: ['Planning', 'Active'] },
      },
    });

    // Get pending reviews (artifacts under review)
    const pendingReviews = await prisma.artifacts.count({
      where: { status: 'Under_Review' },
    });

    // Get knowledge articles count (approved artifacts)
    const knowledgeArticles = await prisma.knowledge_chunks.count({
      where: { isActive: true },
    });

    // Calculate on-track rate
    const allTransitions = await prisma.transitions.count({
      where: { status: { in: ['Planning', 'Active', 'Completed'] } },
    });
    const onTrackTransitions = await prisma.transitions.count({
      where: {
        status: { in: ['Planning', 'Active', 'Completed'] },
        riskLevel: { in: ['Low', 'Medium'] },
      },
    });
    const onTrackRate = allTransitions > 0 ? Math.round((onTrackTransitions / allTransitions) * 100) : 0;

    // Get transition roadmap data
    const recentTransitions = await prisma.transitions.findMany({
      where: { status: { in: ['Planning', 'Active'] } },
      orderBy: { startDate: 'desc' },
      take: 5,
    });

    const contracts: TransitionRoadmapContract[] = recentTransitions.map((transition) => {
      let status: 'on-track' | 'at-risk' | 'critical' = 'on-track';
      if (transition.riskLevel === 'High') status = 'at-risk';
      if (transition.riskLevel === 'Critical') status = 'critical';

      return {
        name: transition.contractName,
        progress: transition.progressPercentage,
        status,
      };
    });

    // Mock personnel data (would come from personnel/contractor tables in real implementation)
    const personnel: TransitionRoadmapPersonnel[] = [
      { role: 'Network Engineer', count: 3, status: 'training' },
      { role: 'Security Analyst', count: 2, status: 'ready' },
      { role: 'Database Admin', count: 1, status: 'pending' },
    ];

    return {
      metrics: {
        activeTransitions,
        pendingReviews,
        knowledgeArticles,
        onTrackRate,
      },
      platformSetup,
      curationQueue,
      transitionRoadmap: {
        contracts,
        personnel,
      },
    };
  }

  /**
   * Get Outgoing Contractor Dashboard Data
   * @param userId - User ID of the Outgoing Contractor
   * @returns Dashboard data specific to Outgoing Contractor persona
   */
  async getOutgoingContractorDashboardData(userId: string): Promise<OutgoingContractorDashboardData> {
    // Get user's active transition
    const userTransition = await prisma.transition_users.findFirst({
      where: {
        userId,
        isActive: true,
        role: 'Departing_Contractor',
      },
      include: { transitions: true },
    });

    // If no active transition, return placeholder data with empty state
    if (!userTransition) {
      return {
        metrics: {
          documentsUploaded: 0,
          trainingSessions: 0,
          handoverComplete: 0,
          daysRemaining: 0,
        },
        handoverTimeline: [
          { title: 'Document Upload', status: 'not-started' },
          { title: 'Knowledge Transfer', status: 'not-started' },
          { title: 'Training Delivery', status: 'not-started' },
          { title: 'Final Review', status: 'not-started' },
          { title: 'Sign-off', status: 'not-started' },
        ],
        activityLog: [
          {
            title: 'No Active Transition',
            description: 'You are not currently assigned to any active transition. Contact your program manager to get started.',
            timestamp: new Date().toISOString(),
            status: 'pending',
          },
        ],
        verificationChecklist: [
          {
            id: 'placeholder-1',
            text: 'No checklist items available - transition not yet assigned',
            completed: false,
          },
        ],
      };
    }

    const transitionId = userTransition.transitionId;

    // Get documents uploaded by this user
    const documentsUploaded = await prisma.artifacts.count({
      where: {
        transitionId,
        submittedBy: userId,
      },
    });

    // Get training sessions (calendar events of type Training)
    const trainingSessions = await prisma.calendar_events.count({
      where: {
        transitionId,
        eventType: 'Training',
        organizerId: userId,
        status: { in: ['Completed', 'Scheduled'] },
      },
    });

    // Get handover completion percentage
    const handoverChecklist = await prisma.handover_checklist_items.findMany({
      where: {
        transition_id: transitionId,
        user_id: userId,
      },
    });

    const completedItems = handoverChecklist.filter((item) => item.completed).length;
    const totalItems = handoverChecklist.length;
    const handoverComplete = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Calculate days remaining until transition end
    const endDate = userTransition.transitions.endDate;
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    // Get handover timeline (5 standard phases)
    const handoverTimeline: HandoverTimelineStep[] = [
      { title: 'Document Upload', status: documentsUploaded > 0 ? 'complete' : 'not-started' },
      { title: 'Knowledge Transfer', status: handoverComplete > 30 ? 'in-progress' : 'not-started' },
      { title: 'Training Delivery', status: trainingSessions > 0 ? 'in-progress' : 'not-started' },
      { title: 'Final Review', status: handoverComplete > 80 ? 'in-progress' : 'not-started' },
      { title: 'Sign-off', status: handoverComplete === 100 ? 'complete' : 'not-started' },
    ];

    // Get recent activity log
    const recentActivity = await prisma.activity_logs.findMany({
      where: {
        user_id: userId,
        transition_id: transitionId,
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    const activityLog: ActivityLogItem[] = recentActivity.map((log) => ({
      title: log.activity_type,
      description: log.description,
      timestamp: log.timestamp.toISOString(),
      status: 'completed',
    }));

    // Get verification checklist
    const verificationChecklist: ChecklistItem[] = handoverChecklist.map((item) => ({
      id: item.id,
      text: item.item_text,
      completed: item.completed,
    }));

    return {
      metrics: {
        documentsUploaded,
        trainingSessions,
        handoverComplete,
        daysRemaining,
      },
      handoverTimeline,
      activityLog,
      verificationChecklist,
    };
  }

  /**
   * Get Incoming Contractor Dashboard Data
   * @param userId - User ID of the Incoming Contractor
   * @returns Dashboard data specific to Incoming Contractor persona
   */
  async getIncomingContractorDashboardData(userId: string): Promise<IncomingContractorDashboardData> {
    // Get learning modules with user progress
    const learningModules = await prisma.learning_modules.findMany({
      where: { is_active: true },
      orderBy: { order_index: 'asc' },
      include: {
        user_progress: {
          where: { user_id: userId },
        },
      },
    });

    const learningRoadmap: LearningModule[] = learningModules.map((module) => {
      const progress = module.user_progress[0]?.progress_percentage || 0;
      let status: 'not-started' | 'in-progress' | 'complete' = 'not-started';
      if (progress === 100) status = 'complete';
      else if (progress > 0) status = 'in-progress';

      return {
        module: module.module_name,
        progress,
        status,
      };
    });

    // Get skills with user progress
    const skills = await prisma.skills_master.findMany({
      where: { is_active: true },
      include: {
        user_skills_progress: {
          where: { user_id: userId },
        },
      },
      take: 7,
    });

    const skillsToMaster: SkillToMaster[] = skills.map((skill) => ({
      skill: skill.skill_name,
      progress: skill.user_skills_progress[0]?.progress_percentage || 0,
    }));

    // Calculate overall metrics
    const modulesCompleted = learningRoadmap.filter((m) => m.status === 'complete').length;
    const overallProgress =
      learningRoadmap.length > 0
        ? Math.round(learningRoadmap.reduce((sum, m) => sum + m.progress, 0) / learningRoadmap.length)
        : 0;

    // Get time spent from learning progress
    const learningProgress = await prisma.user_learning_progress.findMany({
      where: { user_id: userId },
    });
    const hoursLogged = Math.round(
      learningProgress.reduce((sum, progress) => sum + progress.time_spent_minutes, 0) / 60
    );

    // Calculate quiz average
    const quizScores = learningProgress
      .filter((p) => p.quiz_score !== null)
      .map((p) => Number(p.quiz_score));
    const quizAverage =
      quizScores.length > 0 ? Math.round(quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length) : 0;

    // Get learning resources (sample knowledge artifacts)
    const knowledgeArtifacts = await prisma.artifacts.findMany({
      where: {
        status: 'Approved',
        type: { in: ['Documentation', 'Training_Materials'] },
      },
      take: 5,
    });

    const learningResources: LearningResource[] = knowledgeArtifacts.map((artifact) => ({
      title: artifact.name,
      type: artifact.mimeType.includes('video') ? 'video' : 'document',
      url: `/api/artifacts/${artifact.id}`,
      thumbnail: artifact.mimeType.includes('video') ? `/thumbnails/${artifact.id}.jpg` : undefined,
    }));

    return {
      metrics: {
        overallProgress,
        modulesCompleted,
        hoursLogged,
        quizAverage,
      },
      learningRoadmap,
      skillsToMaster,
      learningResources,
    };
  }

  /**
   * Get metrics for a specific role
   * @param role - The persona role (government-pm, outgoing-contractor, incoming-contractor)
   * @param userId - User ID
   * @returns Metrics specific to the role
   */
  async getMetricsByRole(role: string, userId: string): Promise<DashboardMetrics> {
    switch (role) {
      case 'government-pm':
        const pmData = await this.getGovernmentPMDashboardData(userId);
        return pmData.metrics;
      case 'outgoing-contractor':
        const outgoingData = await this.getOutgoingContractorDashboardData(userId);
        return outgoingData.metrics;
      case 'incoming-contractor':
        const incomingData = await this.getIncomingContractorDashboardData(userId);
        return incomingData.metrics;
      default:
        throw new Error(`Invalid role: ${role}`);
    }
  }
}

export default new DashboardService();
