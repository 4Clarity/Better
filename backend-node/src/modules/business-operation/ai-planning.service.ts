/**
 * AI Planning Integration Service
 *
 * Integrates with Python AI service to provide intelligent transition planning.
 * Handles communication with Python API and creates tasks/milestones from AI recommendations.
 */

import { PrismaClient, TaskStatus, Priority, MilestoneStatus } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';

const prisma = new PrismaClient();

// Helper functions to map AI recommendation values to Prisma enums
function mapTaskStatus(status: string): TaskStatus {
  const statusMap: Record<string, TaskStatus> = {
    'Not Started': TaskStatus.Not_Started,
    'Assigned': TaskStatus.Assigned,
    'In Progress': TaskStatus.In_Progress,
    'On Hold': TaskStatus.On_Hold,
    'Blocked': TaskStatus.Blocked,
    'Under Review': TaskStatus.Under_Review,
    'Completed': TaskStatus.Completed,
    'Cancelled': TaskStatus.Cancelled,
  };
  return statusMap[status] || TaskStatus.Not_Started;
}

function mapPriority(priority: string): Priority {
  const priorityMap: Record<string, Priority> = {
    'Low': Priority.Low,
    'Medium': Priority.Medium,
    'High': Priority.High,
    'Critical': Priority.Critical,
    'Urgent': Priority.Urgent,
    'Normal': Priority.Normal,
  };
  return priorityMap[priority] || Priority.Medium;
}

function mapMilestoneStatus(status: string): MilestoneStatus {
  const statusMap: Record<string, MilestoneStatus> = {
    'Not Started': MilestoneStatus.Not_Started,
    'In Progress': MilestoneStatus.In_Progress,
    'Blocked': MilestoneStatus.Blocked,
    'Completed': MilestoneStatus.Completed,
    'Cancelled': MilestoneStatus.Cancelled,
    'Overdue': MilestoneStatus.Overdue,
    'At Risk': MilestoneStatus.In_Progress, // Map "At Risk" to In_Progress as fallback
  };
  return statusMap[status] || MilestoneStatus.Not_Started;
}

// Types for AI Planning
interface PlanningQuestion {
  question_id: string;
  text: string;
  question_type: string;
  options?: string[];
  required: boolean;
  help_text?: string;
  default_value?: any;
}

interface PlanningResponse {
  question_id: string;
  answer: any;
  answered_at?: string;
}

interface TaskRecommendation {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Blocked';
  assigned_role: string;
  estimated_hours?: number;
  days_from_start: number;
  duration_days: number;
  dependencies: string[];
  tags: string[];
}

interface MilestoneRecommendation {
  title: string;
  description: string;
  days_from_start: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Not Started' | 'In Progress' | 'Completed' | 'At Risk';
  assigned_role?: string;
  success_criteria: string[];
}

interface PlanningSession {
  session_id: string;
  transition_id: string;
  transition_type: 'Contract' | 'Personnel' | 'System';
  execution_mode: 'DirectLLM' | 'N8NWorkflow';
  created_by: string;
  session_started_at: string;
  session_completed_at?: string;
  questions_asked: PlanningQuestion[];
  responses_collected: PlanningResponse[];
  tasks_generated: TaskRecommendation[];
  milestones_generated: MilestoneRecommendation[];
  tasks_accepted: string[];
  milestones_accepted: string[];
  recommendations_rejected?: any;
  llm_model_used?: string;
  is_complete: boolean;
}

export class AIPlanningService {
  private pythonApiUrl: string;
  private axiosClient: AxiosInstance;

  constructor(pythonApiUrl: string = process.env.PYTHON_API_URL || 'http://backend-python:8888') {
    this.pythonApiUrl = pythonApiUrl;
    this.axiosClient = axios.create({
      baseURL: pythonApiUrl,
      timeout: 60000, // 60 second timeout for AI operations
      headers: {
        'Content-Type': 'application/json',
        'x-auth-bypass': 'true' // Development mode
      }
    });
  }

  /**
   * Check if Python AI service is available
   */
  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await this.axiosClient.get('/api/ai-planning/health', {
        timeout: 5000
      });
      return response.status === 200 && response.data.status === 'healthy';
    } catch (error) {
      console.error('AI Planning service health check failed:', error);
      return false;
    }
  }

  /**
   * Start a new AI planning session
   */
  async startPlanningSession(
    transitionId: string,
    transitionType: 'Contract' | 'Personnel' | 'System',
    userId: string,
    executionMode: 'DirectLLM' | 'N8NWorkflow' = 'DirectLLM'
  ): Promise<PlanningSession> {
    try {
      const response = await this.axiosClient.post('/api/ai-planning/sessions/start', {
        transition_id: transitionId,
        transition_type: transitionType,
        execution_mode: executionMode,
        user_id: userId
      });

      const session = response.data as PlanningSession;

      // Store session in database
      await this.savePlanningSessionToDatabase(session);

      return session;
    } catch (error: any) {
      console.error('Failed to start AI planning session:', error);
      throw new Error(`Failed to start AI planning session: ${error.message}`);
    }
  }

  /**
   * Submit user responses to a planning session
   */
  async submitResponses(
    sessionId: string,
    responses: PlanningResponse[]
  ): Promise<PlanningSession> {
    try {
      const response = await this.axiosClient.post(
        `/api/ai-planning/sessions/${sessionId}/respond`,
        responses
      );

      const session = response.data as PlanningSession;

      // Update session in database
      await this.updatePlanningSessionInDatabase(session);

      return session;
    } catch (error: any) {
      console.error('Failed to submit responses:', error);
      throw new Error(`Failed to submit responses: ${error.message}`);
    }
  }

  /**
   * Get current planning session state
   */
  async getPlanningSession(sessionId: string): Promise<PlanningSession> {
    try {
      const response = await this.axiosClient.get(`/api/ai-planning/sessions/${sessionId}`);
      return response.data as PlanningSession;
    } catch (error: any) {
      console.error('Failed to get planning session:', error);
      throw new Error(`Failed to get planning session: ${error.message}`);
    }
  }

  /**
   * Generate AI recommendations for tasks and milestones
   */
  async generateRecommendations(sessionId: string): Promise<{
    tasks: TaskRecommendation[];
    milestones: MilestoneRecommendation[];
  }> {
    try {
      // Use longer timeout for AI generation (3 minutes)
      // LLM API calls can take longer, especially for complex transitions
      const response = await this.axiosClient.post(
        `/api/ai-planning/sessions/${sessionId}/generate`,
        {},
        { timeout: 180000 } // 3 minutes timeout for AI generation
      );

      // Update session in database with generated recommendations
      const session = await this.getPlanningSession(sessionId);
      await this.updatePlanningSessionInDatabase(session);

      return {
        tasks: response.data.tasks,
        milestones: response.data.milestones
      };
    } catch (error: any) {
      console.error('Failed to generate recommendations:', error);

      // Provide more helpful error message for timeout
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('AI generation is taking longer than expected. Please try again or use manual planning.');
      }

      throw new Error(`Failed to generate recommendations: ${error.message}`);
    }
  }

  /**
   * Accept AI recommendations and create tasks/milestones in database
   */
  async acceptRecommendations(
    sessionId: string,
    taskIds: string[],
    milestoneIds: string[],
    edits: Record<string, any> = {}
  ): Promise<{ tasksCreated: number; milestonesCreated: number }> {
    try {
      // Get the session to access recommendations
      const session = await this.getPlanningSession(sessionId);

      // Get transition details
      const transition = await prisma.transitions.findUnique({
        where: { id: session.transition_id }
      });

      if (!transition) {
        throw new Error('Transition not found');
      }

      let tasksCreated: any[] = [];
      let milestonesCreated: any[] = [];

      // Check if transition is linked to a product/program
      if (transition.productProgramId) {
        // Create tasks/milestones in product_program tables
        tasksCreated = await this.createProductProgramTasksFromRecommendations(
          transition.productProgramId,
          session.tasks_generated,
          taskIds,
          transition.startDate || new Date(),
          edits,
          session.created_by
        );

        milestonesCreated = await this.createProductProgramMilestonesFromRecommendations(
          transition.productProgramId,
          session.milestones_generated,
          milestoneIds,
          transition.startDate || new Date(),
          edits,
          session.created_by
        );
      } else {
        // Create tasks/milestones in transition tables (existing behavior)
        tasksCreated = await this.createTasksFromRecommendations(
          session.transition_id,
          session.tasks_generated,
          taskIds,
          transition.startDate || new Date(),
          edits,
          session.created_by
        );

        milestonesCreated = await this.createMilestonesFromRecommendations(
          session.transition_id,
          session.milestones_generated,
          milestoneIds,
          transition.startDate || new Date(),
          edits,
          session.created_by
        );
      }

      // Notify Python service of acceptance
      await this.axiosClient.post(`/api/ai-planning/sessions/${sessionId}/accept`, {
        session_id: sessionId,
        task_ids: taskIds,
        milestone_ids: milestoneIds,
        edits
      });

      // Update session as completed
      await prisma.ai_planning_sessions.update({
        where: { id: sessionId },
        data: {
          sessionCompletedAt: new Date(),
          tasksAccepted: taskIds,
          milestonesAccepted: milestoneIds
        }
      });

      return {
        tasksCreated: tasksCreated.length,
        milestonesCreated: milestonesCreated.length
      };
    } catch (error: any) {
      console.error('Failed to accept recommendations:', error);
      throw new Error(`Failed to accept recommendations: ${error.message}`);
    }
  }

  /**
   * Reject AI recommendations
   */
  async rejectRecommendations(
    sessionId: string,
    reason?: string
  ): Promise<void> {
    try {
      await this.axiosClient.post(`/api/ai-planning/sessions/${sessionId}/reject`, {
        session_id: sessionId,
        reason: reason || 'User chose manual planning'
      });

      // Update session in database
      await prisma.ai_planning_sessions.update({
        where: { id: sessionId },
        data: {
          sessionCompletedAt: new Date(),
          recommendationsRejected: {
            rejected_at: new Date().toISOString(),
            reason: reason || 'User chose manual planning'
          }
        }
      });
    } catch (error: any) {
      console.error('Failed to reject recommendations:', error);
      throw new Error(`Failed to reject recommendations: ${error.message}`);
    }
  }

  /**
   * Create tasks from AI recommendations
   */
  private async createTasksFromRecommendations(
    transitionId: string,
    recommendations: TaskRecommendation[],
    acceptedIds: string[],
    transitionStartDate: Date,
    edits: Record<string, any> = {},
    userId: string = 'system-ai-planning'
  ): Promise<any[]> {
    const createdTasks = [];

    // Find a valid user ID for createdBy/assignedBy (required fields)
    const validUser = await this.findValidUser(userId);
    if (!validUser) {
      throw new Error('No valid user found for task creation. Please ensure at least one user exists in the system.');
    }

    for (let i = 0; i < recommendations.length; i++) {
      const taskId = `task-${i}`;

      // Only create if accepted
      if (!acceptedIds.includes(taskId)) continue;

      const recommendation = recommendations[i];
      const editsForTask = edits[taskId] || {};

      // Calculate dates
      const startDate = new Date(transitionStartDate);
      startDate.setDate(startDate.getDate() + recommendation.days_from_start);

      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + recommendation.duration_days);

      // Find user with matching role
      const assignedUser = await this.findUserByRole(recommendation.assigned_role);

      // Generate unique ID for task
      const uniqueTaskId = `task-${transitionId}-${Date.now()}-${i}`;

      // Create task with proper enum mapping
      const task = await prisma.tasks.create({
        data: {
          id: uniqueTaskId,
          transitionId: transitionId,
          title: editsForTask.title || recommendation.title,
          description: editsForTask.description || recommendation.description,
          priority: mapPriority(editsForTask.priority || recommendation.priority),
          status: mapTaskStatus(recommendation.status),
          assignedTo: assignedUser?.id || null,
          assignedBy: validUser.id,
          startDate: startDate,
          dueDate: dueDate,
          estimatedHours: recommendation.estimated_hours || null,
          createdBy: validUser.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      createdTasks.push(task);
    }

    return createdTasks;
  }

  /**
   * Create milestones from AI recommendations
   */
  private async createMilestonesFromRecommendations(
    transitionId: string,
    recommendations: MilestoneRecommendation[],
    acceptedIds: string[],
    transitionStartDate: Date,
    edits: Record<string, any> = {},
    userId: string = 'system-ai-planning'
  ): Promise<any[]> {
    const createdMilestones = [];

    // Find a valid user ID for createdBy (required field)
    const validUser = await this.findValidUser(userId);
    if (!validUser) {
      throw new Error('No valid user found for milestone creation. Please ensure at least one user exists in the system.');
    }

    for (let i = 0; i < recommendations.length; i++) {
      const milestoneId = `milestone-${i}`;

      // Only create if accepted
      if (!acceptedIds.includes(milestoneId)) continue;

      const recommendation = recommendations[i];
      const editsForMilestone = edits[milestoneId] || {};

      // Calculate due date
      const dueDate = new Date(transitionStartDate);
      dueDate.setDate(dueDate.getDate() + recommendation.days_from_start);

      // Find user with matching role
      const assignedUser = recommendation.assigned_role
        ? await this.findUserByRole(recommendation.assigned_role)
        : null;

      // Generate unique ID for milestone
      const uniqueMilestoneId = `milestone-${transitionId}-${Date.now()}-${i}`;

      // Create milestone with proper enum mapping
      const milestone = await prisma.milestones.create({
        data: {
          id: uniqueMilestoneId,
          transitionId: transitionId,
          title: editsForMilestone.title || recommendation.title,
          description: editsForMilestone.description || recommendation.description,
          dueDate: dueDate,
          priority: mapPriority(editsForMilestone.priority || recommendation.priority),
          status: mapMilestoneStatus(recommendation.status),
          assignedTo: assignedUser?.id || null,
          percentComplete: 0,
          createdBy: validUser.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      createdMilestones.push(milestone);
    }

    return createdMilestones;
  }

  /**
   * Find a valid user for required fields (createdBy, assignedBy)
   * First tries to find the specified user, then falls back to any active user
   */
  private async findValidUser(userId: string): Promise<any | null> {
    try {
      // Try to find the specified user
      let user = await prisma.User.findUnique({
        where: { id: userId }
      });

      // If not found, try to find any active user
      if (!user) {
        const users = await prisma.User.findMany({
          where: { accountStatus: 'Active' },
          take: 1
        });
        user = users.length > 0 ? users[0] : null;
      }

      return user;
    } catch (error) {
      console.error(`Failed to find valid user:`, error);
      return null;
    }
  }

  /**
   * Find a user by their role
   */
  private async findUserByRole(roleName: string): Promise<any | null> {
    try {
      // Normalize role name (case-insensitive)
      const normalizedRoleName = roleName.trim().toLowerCase();

      // Find users with matching role (using User model, not user)
      const users = await prisma.User.findMany({
        where: {
          roles: {
            hasSome: [roleName]
          },
          accountStatus: 'Active'
        },
        take: 1
      });

      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error(`Failed to find user with role ${roleName}:`, error);
      return null;
    }
  }

  /**
   * Create product program tasks from AI recommendations
   */
  private async createProductProgramTasksFromRecommendations(
    productProgramId: string,
    recommendations: TaskRecommendation[],
    acceptedIds: string[],
    startDate: Date,
    edits: Record<string, any> = {},
    userId: string = 'system-ai-planning'
  ): Promise<any[]> {
    const createdTasks = [];

    // Find a valid user ID for createdBy (required field)
    const validUser = await this.findValidUser(userId);
    if (!validUser) {
      throw new Error('No valid user found for task creation. Please ensure at least one user exists in the system.');
    }

    for (let i = 0; i < recommendations.length; i++) {
      const taskId = `task-${i}`;

      // Only create if accepted
      if (!acceptedIds.includes(taskId)) continue;

      const recommendation = recommendations[i];
      const editsForTask = edits[taskId] || {};

      // Calculate due date
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + recommendation.days_from_start + recommendation.duration_days);

      // Create task in product_program_tasks table
      const task = await prisma.product_program_tasks.create({
        data: {
          product_program_id: productProgramId,
          title: editsForTask.title || recommendation.title,
          description: editsForTask.description || recommendation.description,
          status: 'TODO', // Default status for product program tasks
          due_date: dueDate,
          assigned_to: null, // Can be assigned later
          created_by: validUser.id,
          updated_by: validUser.id,
        }
      });

      createdTasks.push(task);
    }

    return createdTasks;
  }

  /**
   * Create product program milestones from AI recommendations
   */
  private async createProductProgramMilestonesFromRecommendations(
    productProgramId: string,
    recommendations: MilestoneRecommendation[],
    acceptedIds: string[],
    startDate: Date,
    edits: Record<string, any> = {},
    userId: string = 'system-ai-planning'
  ): Promise<any[]> {
    const createdMilestones = [];

    // Find a valid user ID for createdBy (required field)
    const validUser = await this.findValidUser(userId);
    if (!validUser) {
      throw new Error('No valid user found for milestone creation. Please ensure at least one user exists in the system.');
    }

    for (let i = 0; i < recommendations.length; i++) {
      const milestoneId = `milestone-${i}`;

      // Only create if accepted
      if (!acceptedIds.includes(milestoneId)) continue;

      const recommendation = recommendations[i];
      const editsForMilestone = edits[milestoneId] || {};

      // Calculate target date
      const targetDate = new Date(startDate);
      targetDate.setDate(targetDate.getDate() + recommendation.days_from_start);

      // Create milestone in product_program_milestones table
      const milestone = await prisma.product_program_milestones.create({
        data: {
          product_program_id: productProgramId,
          title: editsForMilestone.title || recommendation.title,
          description: editsForMilestone.description || recommendation.description,
          target_date: targetDate,
          status: 'UPCOMING', // Default status for product program milestones
          created_by: validUser.id,
          updated_by: validUser.id,
        }
      });

      createdMilestones.push(milestone);
    }

    return createdMilestones;
  }

  /**
   * Save planning session to database
   */
  private async savePlanningSessionToDatabase(session: PlanningSession): Promise<void> {
    try {
      // Find a valid user for the createdBy field (required foreign key)
      const validUser = await this.findValidUser(session.created_by);
      if (!validUser) {
        throw new Error('No valid user found for session creation. Please ensure at least one user exists in the system.');
      }

      console.log('Attempting to save session to database:', {
        id: session.session_id,
        transitionId: session.transition_id,
        transitionType: session.transition_type,
        createdBy: validUser.id
      });

      await prisma.ai_planning_sessions.create({
        data: {
          id: session.session_id,
          transitionId: session.transition_id,
          transitionType: session.transition_type,
          executionMode: session.execution_mode,
          createdBy: validUser.id,
          sessionStartedAt: new Date(session.session_started_at),
          questionsAsked: session.questions_asked,
          llmModelUsed: session.llm_model_used || 'llama2'
        }
      });

      console.log('Session saved successfully:', session.session_id);
    } catch (error: any) {
      console.error('Failed to save planning session to database:', {
        error: error.message,
        code: error.code,
        meta: error.meta,
        fullError: error
      });
      // Throw error so we can diagnose the issue
      throw new Error(`Failed to save session to database: ${error.message}`);
    }
  }

  /**
   * Update planning session in database
   */
  private async updatePlanningSessionInDatabase(session: PlanningSession): Promise<void> {
    try {
      await prisma.ai_planning_sessions.update({
        where: { id: session.session_id },
        data: {
          responsesCollected: session.responses_collected,
          tasksGenerated: session.tasks_generated,
          milestonesGenerated: session.milestones_generated,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to update planning session in database:', error);
      // Don't throw - session is still valid in Python service
    }
  }

  /**
   * Get AI planning configuration for a specific transition type
   */
  async getConfiguration(transitionType: string): Promise<{
    questions: any[];
    taskTemplates: any[];
  }> {
    try {
      const questions = await prisma.ai_planning_questions.findMany({
        where: { transitionType },
        orderBy: { displayOrder: 'asc' }
      });

      const taskTemplates = await prisma.ai_planning_task_templates.findMany({
        where: { transitionType },
        orderBy: { displayOrder: 'asc' }
      });

      // Transform to frontend format (snake_case to camelCase)
      return {
        questions: questions.map(q => ({
          question_id: q.id,
          text: q.questionText,
          question_type: q.questionType,
          options: q.questionOptions,
          required: q.isRequired,
          help_text: q.helpText,
          display_order: q.displayOrder
        })),
        taskTemplates: taskTemplates.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          phase: t.phase,
          owner: t.ownerRole,
          days_from_start: t.daysFromStart,
          duration_days: t.durationDays,
          priority: t.priority,
          tags: t.tags,
          dependencies: t.dependencies,
          display_order: t.displayOrder,
          is_milestone: t.isMilestone
        }))
      };
    } catch (error: any) {
      console.error('Failed to get configuration:', error);
      throw new Error(`Failed to get configuration: ${error.message}`);
    }
  }

  /**
   * Save AI planning questions for a specific transition type
   */
  async saveQuestions(
    transitionType: string,
    questions: any[],
    userId: string
  ): Promise<{ saved: number }> {
    try {
      // Delete existing questions for this transition type
      await prisma.ai_planning_questions.deleteMany({
        where: { transitionType }
      });

      // Create new questions
      const created = await prisma.ai_planning_questions.createMany({
        data: questions.map((q, index) => ({
          id: q.question_id || `q${index}_${transitionType}_${Date.now()}`,
          transitionType,
          questionText: q.text,
          questionType: q.question_type || 'TEXT',
          questionOptions: q.options || [],
          isRequired: q.required !== false,
          helpText: q.help_text || null,
          displayOrder: q.display_order || index,
          createdBy: userId
        }))
      });

      return { saved: created.count };
    } catch (error: any) {
      console.error('Failed to save questions:', error);
      throw new Error(`Failed to save questions: ${error.message}`);
    }
  }

  /**
   * Save AI planning task templates for a specific transition type
   */
  async saveTaskTemplates(
    transitionType: string,
    templates: any[],
    userId: string
  ): Promise<{ saved: number }> {
    try {
      // Delete existing templates for this transition type
      await prisma.ai_planning_task_templates.deleteMany({
        where: { transitionType }
      });

      // Create new templates
      const created = await prisma.ai_planning_task_templates.createMany({
        data: templates.map((t, index) => ({
          id: t.id || `t${index}_${transitionType}_${Date.now()}`,
          transitionType,
          title: t.title,
          description: t.description || null,
          phase: t.phase || null,
          ownerRole: t.owner || null,
          daysFromStart: t.days_from_start || 0,
          durationDays: t.duration_days || 1,
          priority: t.priority || 'Medium',
          tags: t.tags || [],
          dependencies: t.dependencies || [],
          displayOrder: t.display_order || index,
          isMilestone: t.is_milestone || false,
          createdBy: userId
        }))
      });

      return { saved: created.count };
    } catch (error: any) {
      console.error('Failed to save task templates:', error);
      throw new Error(`Failed to save task templates: ${error.message}`);
    }
  }
}

// Export a singleton instance
export const aiPlanningService = new AIPlanningService();
