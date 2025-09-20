// Knowledge Management Constants
// Centralizes configuration values for better maintainability

export const KM_ROUTES = {
  ROOT: '/knowledge',
  WEEKLY_CURATION: '/knowledge/weekly-curation',
  DOCUMENT_UPLOAD: '/knowledge/document-upload',
  COMMUNICATION_FILES: '/knowledge/communication-files',
  FACTS_CURATION: '/knowledge/facts-curation',
  APPROVAL_QUEUE: '/knowledge/approval-queue',
  KNOWLEDGE_SEARCH: '/knowledge/knowledge-search',
  CONFIGURATION: '/knowledge/configuration',
} as const;

export const PROCESSING_STAGES = {
  FILE_PROCESSING: 'File processing',
  CONTENT_ANALYSIS: 'Content analysis',
  EXTRACTING_FACTS: 'Extracting facts',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
} as const;

export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const COMMUNICATION_TYPES = {
  EMAIL: 'email',
  SLACK: 'slack',
  TEAMS: 'teams',
} as const;

export const FACT_CATEGORIES = {
  TECHNICAL: 'Technical',
  BUSINESS: 'Business',
  METRICS: 'Metrics',
  PLANNING: 'Planning',
  PROCESS: 'Process',
} as const;

export const DEFAULT_CONFIG = {
  AUTO_PROCESSING_THRESHOLD: 85,
  FACT_RETENTION_DAYS: 365,
  MIN_CONFIDENCE_LEVEL: 70,
  MAX_CONFIDENCE_LEVEL: 100,
} as const;

// Accessibility configurations
export const A11Y_CONFIG = {
  MIN_TOUCH_TARGET: 44, // pixels
  FOCUS_RING_WIDTH: 2, // pixels
  REDUCED_MOTION_QUERY: '(prefers-reduced-motion: reduce)',
} as const;