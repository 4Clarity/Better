/**
 * TypeScript interfaces for AI-Assisted Transition Planning
 * Story 1.4: AI-Assisted Transition Planning with Intelligent Task and Milestone Generation
 */

// Enums
export enum TransitionType {
  CONTRACT = 'Contract',
  PERSONNEL = 'Personnel',
  SYSTEM = 'System',
}

export enum ExecutionMode {
  DIRECT_LLM = 'DirectLLM',
  N8N_WORKFLOW = 'N8NWorkflow',
}

export enum QuestionType {
  TEXT = 'text',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  DATE = 'date',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

export enum TaskStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  BLOCKED = 'Blocked',
}

export enum MilestoneStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  AT_RISK = 'At Risk',
}

export enum PlanningSessionStatus {
  STARTED = 'started',
  COLLECTING_RESPONSES = 'collecting_responses',
  GENERATING_RECOMMENDATIONS = 'generating_recommendations',
  REVIEWING_RECOMMENDATIONS = 'reviewing_recommendations',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

// Core Interfaces

export interface PlanningQuestion {
  question_id: string;
  text: string;
  question_type: QuestionType;
  options?: string[];
  required: boolean;
  help_text?: string;
  default_value?: any;
}

export interface PlanningResponse {
  question_id: string;
  answer: any;
  answered_at?: string; // ISO 8601 date string
}

export interface PlanningContext {
  transition_type: TransitionType;
  scope: string;
  scale: string;
  timeline_weeks: number;
  team_size: number;
  risk_factors: string[];
  special_requirements: string[];
  key_deliverables: string[];
}

export interface TaskRecommendation {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_role: string;
  estimated_hours?: number;
  days_from_start: number;
  duration_days: number;
  dependencies: string[];
  tags: string[];
}

export interface MilestoneRecommendation {
  title: string;
  description: string;
  days_from_start: number;
  priority: TaskPriority;
  status: MilestoneStatus;
  assigned_role?: string;
  success_criteria: string[];
}

export interface PlanningSession {
  session_id: string;
  transition_id: string;
  transition_type: TransitionType;
  execution_mode: ExecutionMode;
  created_by: string;
  session_started_at: string; // ISO 8601 date string
  session_completed_at?: string; // ISO 8601 date string
  questions_asked: PlanningQuestion[];
  responses_collected: PlanningResponse[];
  tasks_generated: TaskRecommendation[];
  milestones_generated: MilestoneRecommendation[];
  tasks_accepted: string[];
  milestones_accepted: string[];
  recommendations_rejected?: {
    rejected_at: string;
    reason: string;
  };
  llm_model_used?: string;
  is_complete: boolean;
}

// Request/Response Types

export interface StartPlanningSessionRequest {
  transitionId: string;
  transitionType: TransitionType;
  executionMode?: ExecutionMode;
}

export interface StartPlanningSessionResponse {
  success: boolean;
  data: PlanningSession;
}

export interface SubmitResponsesRequest {
  sessionId: string;
  responses: PlanningResponse[];
}

export interface SubmitResponsesResponse {
  success: boolean;
  data: PlanningSession;
}

export interface GenerateRecommendationsRequest {
  sessionId: string;
}

export interface GenerateRecommendationsResponse {
  success: boolean;
  data: {
    session_id: string;
    tasks: TaskRecommendation[];
    milestones: MilestoneRecommendation[];
  };
}

export interface AcceptRecommendationsRequest {
  sessionId: string;
  taskIds: string[];
  milestoneIds: string[];
  edits?: Record<string, Partial<TaskRecommendation | MilestoneRecommendation>>;
}

export interface AcceptRecommendationsResponse {
  success: boolean;
  data: {
    tasksCreated: number;
    milestonesCreated: number;
  };
}

export interface RejectRecommendationsRequest {
  sessionId: string;
  reason?: string;
}

export interface RejectRecommendationsResponse {
  success: boolean;
  message: string;
}

// Component Props Types

export interface AIPlanningWizardProps {
  transitionId: string;
  transitionType: TransitionType;
  onComplete: (result: PlanningWizardResult) => void;
  onCancel: () => void;
}

export interface PlanningWizardResult {
  sessionId: string;
  tasksCreated: number;
  milestonesCreated: number;
  mode: 'ai' | 'manual';
}

export interface PlanningQuestionCardProps {
  question: PlanningQuestion;
  value?: any;
  onAnswer: (answer: any) => void;
  error?: string;
}

export interface RecommendationReviewPanelProps {
  tasks: TaskRecommendation[];
  milestones: MilestoneRecommendation[];
  selectedTaskIds: string[];
  selectedMilestoneIds: string[];
  onTaskSelectionChange: (taskIds: string[]) => void;
  onMilestoneSelectionChange: (milestoneIds: string[]) => void;
  onTaskEdit: (index: number, updates: Partial<TaskRecommendation>) => void;
  onMilestoneEdit: (index: number, updates: Partial<MilestoneRecommendation>) => void;
}

export interface PlanningSessionHistoryProps {
  transitionId: string;
  sessions: PlanningSession[];
  onSessionSelect?: (sessionId: string) => void;
}

// Wizard Step States

export interface WizardStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface PlanningWizardState {
  currentStep: number;
  session: PlanningSession | null;
  responses: Map<string, any>;
  selectedTasks: Set<string>;
  selectedMilestones: Set<string>;
  taskEdits: Map<string, Partial<TaskRecommendation>>;
  milestoneEdits: Map<string, Partial<MilestoneRecommendation>>;
  isLoading: boolean;
  error: string | null;
}

// Health Check Types

export interface AIPlanningHealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  pythonServiceAvailable: boolean;
  timestamp: string;
}
