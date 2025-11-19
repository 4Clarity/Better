/**
 * Unit tests for AIPlanningService
 *
 * Tests the integration layer between Node.js backend and Python AI service.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import { AIPlanningService } from '../ai-planning.service';
import { PrismaClient } from '@prisma/client';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

// Mock Prisma client
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    ai_planning_sessions: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    product_program_tasks: {
      createMany: vi.fn(),
    },
    product_program_milestones: {
      createMany: vi.fn(),
    },
  };

  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

describe('AIPlanningService', () => {
  let service: AIPlanningService;
  let mockPrisma: any;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Create mock axios instance
    mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
    };

    mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);

    // Create service instance
    service = new AIPlanningService('http://test-python-api:8888');

    // Get mock Prisma instance
    mockPrisma = (service as any).prisma;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default Python API URL', () => {
      const defaultService = new AIPlanningService();
      expect(defaultService).toBeInstanceOf(AIPlanningService);
    });

    it('should initialize with custom Python API URL', () => {
      const customService = new AIPlanningService('http://custom-url:9999');
      expect(customService).toBeInstanceOf(AIPlanningService);
    });

    it('should create axios client with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://test-python-api:8888',
          timeout: 60000,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-auth-bypass': 'true',
          }),
        })
      );
    });
  });

  describe('startPlanningSession', () => {
    const mockSessionResponse = {
      session_id: 'test-session-123',
      transition_id: 'trans-456',
      transition_type: 'Contract',
      execution_mode: 'DirectLLM',
      status: 'started',
      current_step: 0,
      questions_asked: [
        {
          question_id: 'q1',
          text: 'Test question?',
          question_type: 'text',
          required: true,
        },
      ],
      responses_collected: [],
      tasks_generated: [],
      milestones_generated: [],
      created_at: new Date().toISOString(),
    };

    beforeEach(() => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockSessionResponse });
      mockPrisma.ai_planning_sessions.create.mockResolvedValue({
        id: 'db-session-123',
        ...mockSessionResponse,
      });
    });

    it('should start a new planning session', async () => {
      const result = await service.startPlanningSession(
        'trans-456',
        'Contract',
        'user-789'
      );

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/ai-planning/sessions/start',
        {
          transition_id: 'trans-456',
          transition_type: 'Contract',
          execution_mode: 'DirectLLM',
          user_id: 'user-789',
        }
      );

      expect(result.session_id).toBe('test-session-123');
      expect(result.transition_type).toBe('Contract');
    });

    it('should save session to database', async () => {
      await service.startPlanningSession('trans-456', 'Contract', 'user-789');

      expect(mockPrisma.ai_planning_sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: 'test-session-123',
            transitionId: 'trans-456',
            transitionType: 'Contract',
            executionMode: 'DirectLLM',
            createdBy: 'user-789',
          }),
        })
      );
    });

    it('should handle Personnel transition type', async () => {
      const personnelResponse = { ...mockSessionResponse, transition_type: 'Personnel' };
      mockAxiosInstance.post.mockResolvedValue({ data: personnelResponse });

      const result = await service.startPlanningSession(
        'trans-789',
        'Personnel',
        'user-123'
      );

      expect(result.transition_type).toBe('Personnel');
    });

    it('should handle System transition type', async () => {
      const systemResponse = { ...mockSessionResponse, transition_type: 'System' };
      mockAxiosInstance.post.mockResolvedValue({ data: systemResponse });

      const result = await service.startPlanningSession(
        'trans-101',
        'System',
        'user-456'
      );

      expect(result.transition_type).toBe('System');
    });

    it('should handle N8N execution mode', async () => {
      const n8nResponse = { ...mockSessionResponse, execution_mode: 'N8NWorkflow' };
      mockAxiosInstance.post.mockResolvedValue({ data: n8nResponse });

      const result = await service.startPlanningSession(
        'trans-456',
        'Contract',
        'user-789',
        'N8NWorkflow'
      );

      expect(result.execution_mode).toBe('N8NWorkflow');
    });

    it('should throw error if Python API fails', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('API Error'));

      await expect(
        service.startPlanningSession('trans-456', 'Contract', 'user-789')
      ).rejects.toThrow('API Error');
    });
  });

  describe('submitResponses', () => {
    const mockResponses = [
      {
        question_id: 'q1',
        answer: 'Answer 1',
        answered_at: new Date().toISOString(),
      },
      {
        question_id: 'q2',
        answer: 'Answer 2',
        answered_at: new Date().toISOString(),
      },
    ];

    const mockUpdatedSession = {
      session_id: 'test-session-123',
      status: 'responses_collected',
      current_step: 1,
      responses_collected: mockResponses,
    };

    beforeEach(() => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockUpdatedSession });
      mockPrisma.ai_planning_sessions.update.mockResolvedValue(mockUpdatedSession);
    });

    it('should submit user responses to Python API', async () => {
      const result = await service.submitResponses('test-session-123', mockResponses);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/ai-planning/sessions/test-session-123/responses',
        { responses: mockResponses }
      );

      expect(result.status).toBe('responses_collected');
    });

    it('should update session in database', async () => {
      await service.submitResponses('test-session-123', mockResponses);

      expect(mockPrisma.ai_planning_sessions.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId: 'test-session-123' },
          data: expect.objectContaining({
            responsesCollected: mockResponses,
            status: 'responses_collected',
            currentStep: 1,
          }),
        })
      );
    });

    it('should handle empty responses', async () => {
      const emptyResult = await service.submitResponses('test-session-123', []);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/ai-planning/sessions/test-session-123/responses',
        { responses: [] }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));

      await expect(
        service.startPlanningSession('trans-456', 'Contract', 'user-789')
      ).rejects.toThrow('Network error');
    });
  });
});
