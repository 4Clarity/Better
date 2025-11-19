/**
 * DashboardService Unit Tests
 * Tests for all three dashboard methods (Government PM, Outgoing Contractor, Incoming Contractor)
 * Story: 1.5 - Roadmap UI Complete Implementation
 * AC 25: Backend Tests >90% Coverage
 */

import { PrismaClient } from '@prisma/client';
import { DashboardService } from '../DashboardService';

// Mock Prisma Client
jest.mock('@prisma/client');

const mockPrismaClient = {
  platform_setup: {
    findMany: jest.fn(),
  },
  artifacts: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  transitions: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  knowledge_chunks: {
    count: jest.fn(),
  },
  transition_users: {
    findFirst: jest.fn(),
  },
  calendar_events: {
    count: jest.fn(),
  },
  handover_checklist_items: {
    findMany: jest.fn(),
  },
  activity_logs: {
    findMany: jest.fn(),
  },
  learning_modules: {
    findMany: jest.fn(),
  },
  skills_master: {
    findMany: jest.fn(),
  },
  user_learning_progress: {
    findMany: jest.fn(),
  },
};

describe('DashboardService', () => {
  let dashboardService: DashboardService;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    dashboardService = new DashboardService();

    // Mock Prisma client
    (dashboardService as any).prisma = mockPrismaClient;
  });

  describe('getGovernmentPMDashboardData', () => {
    const mockUserId = 'user-gary-grove-001';

    it('should return complete dashboard data with all metrics', async () => {
      // Arrange - Mock all database queries
      mockPrismaClient.platform_setup.findMany.mockResolvedValue([
        { step_name: 'Setup Users', status: 'complete', step_number: 1 },
        { step_name: 'Configure System', status: 'complete', step_number: 2 },
        { step_name: 'Import Data', status: 'in-progress', step_number: 3 },
        { step_name: 'Train Users', status: 'not-started', step_number: 4 },
        { step_name: 'Go Live', status: 'not-started', step_number: 5 },
      ]);

      mockPrismaClient.artifacts.findMany.mockResolvedValue([
        {
          name: 'Network Topology Diagrams',
          submittedAt: new Date('2025-10-16T10:30:00Z'),
          users_artifacts_submittedByTousers: {
            person: { firstName: 'Henry', lastName: 'Hou' },
          },
        },
      ]);

      mockPrismaClient.transitions.count
        .mockResolvedValueOnce(12) // Active transitions
        .mockResolvedValueOnce(20) // All transitions
        .mockResolvedValueOnce(17); // On-track transitions

      mockPrismaClient.artifacts.count.mockResolvedValue(8); // Pending reviews

      mockPrismaClient.knowledge_chunks.count.mockResolvedValue(156); // Knowledge articles

      mockPrismaClient.transitions.findMany.mockResolvedValue([
        {
          contractName: 'Contract A',
          progressPercentage: 75,
          riskLevel: 'Low',
          startDate: new Date('2025-09-01'),
        },
        {
          contractName: 'Contract B',
          progressPercentage: 45,
          riskLevel: 'High',
          startDate: new Date('2025-08-15'),
        },
      ]);

      // Act
      const result = await dashboardService.getGovernmentPMDashboardData(mockUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result.metrics.activeTransitions).toBe(12);
      expect(result.metrics.pendingReviews).toBe(8);
      expect(result.metrics.knowledgeArticles).toBe(156);
      expect(result.metrics.onTrackRate).toBe(85); // 17/20 * 100

      expect(result.platformSetup).toHaveLength(5);
      expect(result.platformSetup[0].status).toBe('complete');
      expect(result.platformSetup[2].status).toBe('in-progress');

      expect(result.curationQueue).toHaveLength(1);
      expect(result.curationQueue[0].submittedBy).toBe('Henry Hou');

      expect(result.transitionRoadmap.contracts).toHaveLength(2);
      expect(result.transitionRoadmap.contracts[0].status).toBe('on-track');
      expect(result.transitionRoadmap.contracts[1].status).toBe('at-risk');
    });

    it('should handle empty data gracefully', async () => {
      // Arrange
      mockPrismaClient.platform_setup.findMany.mockResolvedValue([]);
      mockPrismaClient.artifacts.findMany.mockResolvedValue([]);
      mockPrismaClient.transitions.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrismaClient.artifacts.count.mockResolvedValue(0);
      mockPrismaClient.knowledge_chunks.count.mockResolvedValue(0);
      mockPrismaClient.transitions.findMany.mockResolvedValue([]);

      // Act
      const result = await dashboardService.getGovernmentPMDashboardData(mockUserId);

      // Assert
      expect(result.metrics.activeTransitions).toBe(0);
      expect(result.metrics.onTrackRate).toBe(0);
      expect(result.platformSetup).toHaveLength(0);
      expect(result.curationQueue).toHaveLength(0);
      expect(result.transitionRoadmap.contracts).toHaveLength(0);
    });

    it('should calculate on-track rate correctly', async () => {
      // Arrange
      mockPrismaClient.platform_setup.findMany.mockResolvedValue([]);
      mockPrismaClient.artifacts.findMany.mockResolvedValue([]);
      mockPrismaClient.transitions.count
        .mockResolvedValueOnce(5)  // Active
        .mockResolvedValueOnce(10) // All transitions
        .mockResolvedValueOnce(7); // On-track
      mockPrismaClient.artifacts.count.mockResolvedValue(0);
      mockPrismaClient.knowledge_chunks.count.mockResolvedValue(0);
      mockPrismaClient.transitions.findMany.mockResolvedValue([]);

      // Act
      const result = await dashboardService.getGovernmentPMDashboardData(mockUserId);

      // Assert
      expect(result.metrics.onTrackRate).toBe(70); // 7/10 * 100
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockPrismaClient.platform_setup.findMany.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(
        dashboardService.getGovernmentPMDashboardData(mockUserId)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getOutgoingContractorDashboardData', () => {
    const mockUserId = 'user-henry-hou-001';

    it('should return placeholder data when no active transition exists', async () => {
      // Arrange
      mockPrismaClient.transition_users.findFirst.mockResolvedValue(null);

      // Act
      const result = await dashboardService.getOutgoingContractorDashboardData(mockUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result.metrics.documentsUploaded).toBe(0);
      expect(result.metrics.trainingSessions).toBe(0);
      expect(result.metrics.handoverComplete).toBe(0);
      expect(result.metrics.daysRemaining).toBe(0);

      expect(result.handoverTimeline).toHaveLength(5);
      expect(result.handoverTimeline.every(step => step.status === 'not-started')).toBe(true);

      expect(result.activityLog).toHaveLength(1);
      expect(result.activityLog[0].title).toBe('No Active Transition');

      expect(result.verificationChecklist).toHaveLength(1);
      expect(result.verificationChecklist[0].id).toBe('placeholder-1');
    });

    it('should return complete dashboard data for active transition', async () => {
      // Arrange
      const mockTransition = {
        transitionId: 'transition-001',
        transitions: {
          endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days from now
        },
      };

      mockPrismaClient.transition_users.findFirst.mockResolvedValue(mockTransition);
      mockPrismaClient.artifacts.count.mockResolvedValue(24); // Documents uploaded
      mockPrismaClient.calendar_events.count.mockResolvedValue(6); // Training sessions

      mockPrismaClient.handover_checklist_items.findMany.mockResolvedValue([
        { id: '1', item_text: 'All documentation uploaded', completed: true, completed_at: new Date() },
        { id: '2', item_text: 'Training sessions scheduled', completed: true, completed_at: new Date() },
        { id: '3', item_text: 'Knowledge gaps identified', completed: false, completed_at: null },
      ]);

      mockPrismaClient.activity_logs.findMany.mockResolvedValue([
        {
          activity_type: 'Document Upload',
          description: 'Uploaded: Security Procedures',
          timestamp: new Date('2025-10-16T14:20:00Z'),
        },
      ]);

      // Act
      const result = await dashboardService.getOutgoingContractorDashboardData(mockUserId);

      // Assert
      expect(result.metrics.documentsUploaded).toBe(24);
      expect(result.metrics.trainingSessions).toBe(6);
      expect(result.metrics.handoverComplete).toBe(67); // 2/3 * 100 rounded
      expect(result.metrics.daysRemaining).toBe(12);

      expect(result.handoverTimeline).toHaveLength(5);
      expect(result.handoverTimeline[0].status).toBe('complete'); // Documents uploaded

      expect(result.activityLog).toHaveLength(1);
      expect(result.activityLog[0].title).toBe('Document Upload');

      expect(result.verificationChecklist).toHaveLength(3);
      expect(result.verificationChecklist[0].completed).toBe(true);
      expect(result.verificationChecklist[2].completed).toBe(false);
    });

    it('should calculate handover completion percentage correctly', async () => {
      // Arrange
      const mockTransition = {
        transitionId: 'transition-001',
        transitions: {
          endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
      };

      mockPrismaClient.transition_users.findFirst.mockResolvedValue(mockTransition);
      mockPrismaClient.artifacts.count.mockResolvedValue(10);
      mockPrismaClient.calendar_events.count.mockResolvedValue(3);

      // 5 items, 4 completed = 80%
      mockPrismaClient.handover_checklist_items.findMany.mockResolvedValue([
        { id: '1', item_text: 'Item 1', completed: true, completed_at: new Date() },
        { id: '2', item_text: 'Item 2', completed: true, completed_at: new Date() },
        { id: '3', item_text: 'Item 3', completed: true, completed_at: new Date() },
        { id: '4', item_text: 'Item 4', completed: true, completed_at: new Date() },
        { id: '5', item_text: 'Item 5', completed: false, completed_at: null },
      ]);

      mockPrismaClient.activity_logs.findMany.mockResolvedValue([]);

      // Act
      const result = await dashboardService.getOutgoingContractorDashboardData(mockUserId);

      // Assert
      expect(result.metrics.handoverComplete).toBe(80);
    });

    it('should calculate days remaining correctly', async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

      const mockTransition = {
        transitionId: 'transition-001',
        transitions: {
          endDate: futureDate,
        },
      };

      mockPrismaClient.transition_users.findFirst.mockResolvedValue(mockTransition);
      mockPrismaClient.artifacts.count.mockResolvedValue(0);
      mockPrismaClient.calendar_events.count.mockResolvedValue(0);
      mockPrismaClient.handover_checklist_items.findMany.mockResolvedValue([]);
      mockPrismaClient.activity_logs.findMany.mockResolvedValue([]);

      // Act
      const result = await dashboardService.getOutgoingContractorDashboardData(mockUserId);

      // Assert
      expect(result.metrics.daysRemaining).toBeGreaterThanOrEqual(29);
      expect(result.metrics.daysRemaining).toBeLessThanOrEqual(31);
    });
  });

  describe('getIncomingContractorDashboardData', () => {
    const mockUserId = 'user-ian-illum-001';

    it('should return complete dashboard data with learning progress', async () => {
      // Arrange
      mockPrismaClient.learning_modules.findMany.mockResolvedValue([
        {
          module_name: 'Network Operations',
          order_index: 1,
          is_active: true,
          user_progress: [{ progress_percentage: 100 }],
        },
        {
          module_name: 'Security Protocols',
          order_index: 2,
          is_active: true,
          user_progress: [{ progress_percentage: 60 }],
        },
        {
          module_name: 'Database Management',
          order_index: 3,
          is_active: true,
          user_progress: [],
        },
      ]);

      mockPrismaClient.skills_master.findMany.mockResolvedValue([
        {
          skill_name: 'Network Monitoring',
          is_active: true,
          user_skills_progress: [{ progress_percentage: 85 }],
        },
        {
          skill_name: 'Security Compliance',
          is_active: true,
          user_skills_progress: [{ progress_percentage: 70 }],
        },
      ]);

      mockPrismaClient.user_learning_progress.findMany.mockResolvedValue([
        { time_spent_minutes: 120, quiz_score: 88 },
        { time_spent_minutes: 180, quiz_score: 92 },
      ]);

      mockPrismaClient.artifacts.findMany.mockResolvedValue([
        {
          name: 'Network Architecture Overview',
          mimeType: 'application/pdf',
          id: 'doc-123',
        },
      ]);

      // Act
      const result = await dashboardService.getIncomingContractorDashboardData(mockUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result.metrics.overallProgress).toBe(53); // (100 + 60 + 0) / 3
      expect(result.metrics.modulesCompleted).toBe(1);
      expect(result.metrics.hoursLogged).toBe(5); // 300 minutes / 60
      expect(result.metrics.quizAverage).toBe(90); // (88 + 92) / 2

      expect(result.learningRoadmap).toHaveLength(3);
      expect(result.learningRoadmap[0].status).toBe('complete');
      expect(result.learningRoadmap[1].status).toBe('in-progress');
      expect(result.learningRoadmap[2].status).toBe('not-started');

      expect(result.skillsToMaster).toHaveLength(2);
      expect(result.skillsToMaster[0].progress).toBe(85);

      expect(result.learningResources).toHaveLength(1);
      expect(result.learningResources[0].type).toBe('document');
    });

    it('should handle empty learning progress', async () => {
      // Arrange
      mockPrismaClient.learning_modules.findMany.mockResolvedValue([]);
      mockPrismaClient.skills_master.findMany.mockResolvedValue([]);
      mockPrismaClient.user_learning_progress.findMany.mockResolvedValue([]);
      mockPrismaClient.artifacts.findMany.mockResolvedValue([]);

      // Act
      const result = await dashboardService.getIncomingContractorDashboardData(mockUserId);

      // Assert
      expect(result.metrics.overallProgress).toBe(0);
      expect(result.metrics.modulesCompleted).toBe(0);
      expect(result.metrics.hoursLogged).toBe(0);
      expect(result.metrics.quizAverage).toBe(0);
      expect(result.learningRoadmap).toHaveLength(0);
      expect(result.skillsToMaster).toHaveLength(0);
      expect(result.learningResources).toHaveLength(0);
    });

    it('should correctly identify module status based on progress', async () => {
      // Arrange
      mockPrismaClient.learning_modules.findMany.mockResolvedValue([
        {
          module_name: 'Module 1',
          order_index: 1,
          is_active: true,
          user_progress: [{ progress_percentage: 100 }], // Complete
        },
        {
          module_name: 'Module 2',
          order_index: 2,
          is_active: true,
          user_progress: [{ progress_percentage: 50 }], // In progress
        },
        {
          module_name: 'Module 3',
          order_index: 3,
          is_active: true,
          user_progress: [{ progress_percentage: 0 }], // Not started
        },
      ]);

      mockPrismaClient.skills_master.findMany.mockResolvedValue([]);
      mockPrismaClient.user_learning_progress.findMany.mockResolvedValue([]);
      mockPrismaClient.artifacts.findMany.mockResolvedValue([]);

      // Act
      const result = await dashboardService.getIncomingContractorDashboardData(mockUserId);

      // Assert
      expect(result.learningRoadmap[0].status).toBe('complete');
      expect(result.learningRoadmap[1].status).toBe('in-progress');
      expect(result.learningRoadmap[2].status).toBe('not-started');
    });

    it('should differentiate between document and video resources', async () => {
      // Arrange
      mockPrismaClient.learning_modules.findMany.mockResolvedValue([]);
      mockPrismaClient.skills_master.findMany.mockResolvedValue([]);
      mockPrismaClient.user_learning_progress.findMany.mockResolvedValue([]);
      mockPrismaClient.artifacts.findMany.mockResolvedValue([
        {
          name: 'Training Document',
          mimeType: 'application/pdf',
          id: 'doc-001',
        },
        {
          name: 'Training Video',
          mimeType: 'video/mp4',
          id: 'video-001',
        },
      ]);

      // Act
      const result = await dashboardService.getIncomingContractorDashboardData(mockUserId);

      // Assert
      expect(result.learningResources).toHaveLength(2);
      expect(result.learningResources[0].type).toBe('document');
      expect(result.learningResources[1].type).toBe('video');
      expect(result.learningResources[1].thumbnail).toBeDefined();
    });
  });

  describe('getMetricsByRole', () => {
    const mockUserId = 'user-test-001';

    it('should return Government PM metrics', async () => {
      // Arrange
      const mockData = {
        metrics: {
          activeTransitions: 10,
          pendingReviews: 5,
          knowledgeArticles: 100,
          onTrackRate: 90,
        },
        platformSetup: [],
        curationQueue: [],
        transitionRoadmap: { contracts: [], personnel: [] },
      };

      jest.spyOn(dashboardService, 'getGovernmentPMDashboardData').mockResolvedValue(mockData);

      // Act
      const result = await dashboardService.getMetricsByRole('government-pm', mockUserId);

      // Assert
      expect(result).toEqual(mockData.metrics);
      expect(dashboardService.getGovernmentPMDashboardData).toHaveBeenCalledWith(mockUserId);
    });

    it('should return Outgoing Contractor metrics', async () => {
      // Arrange
      const mockData = {
        metrics: {
          documentsUploaded: 20,
          trainingSessions: 5,
          handoverComplete: 75,
          daysRemaining: 10,
        },
        handoverTimeline: [],
        activityLog: [],
        verificationChecklist: [],
      };

      jest.spyOn(dashboardService, 'getOutgoingContractorDashboardData').mockResolvedValue(mockData);

      // Act
      const result = await dashboardService.getMetricsByRole('outgoing-contractor', mockUserId);

      // Assert
      expect(result).toEqual(mockData.metrics);
      expect(dashboardService.getOutgoingContractorDashboardData).toHaveBeenCalledWith(mockUserId);
    });

    it('should return Incoming Contractor metrics', async () => {
      // Arrange
      const mockData = {
        metrics: {
          overallProgress: 65,
          modulesCompleted: 3,
          hoursLogged: 25,
          quizAverage: 85,
        },
        learningRoadmap: [],
        skillsToMaster: [],
        learningResources: [],
      };

      jest.spyOn(dashboardService, 'getIncomingContractorDashboardData').mockResolvedValue(mockData);

      // Act
      const result = await dashboardService.getMetricsByRole('incoming-contractor', mockUserId);

      // Assert
      expect(result).toEqual(mockData.metrics);
      expect(dashboardService.getIncomingContractorDashboardData).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw error for invalid role', async () => {
      // Act & Assert
      await expect(
        dashboardService.getMetricsByRole('invalid-role', mockUserId)
      ).rejects.toThrow('Invalid role: invalid-role');
    });
  });
});
