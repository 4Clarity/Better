-- Migration 012: Add AI Planning Sessions Support
-- Created: 2025-10-14
-- Description: Adds AI-assisted transition planning capabilities

-- Add ai_planning_enabled column to transitions table
ALTER TABLE transitions
ADD COLUMN IF NOT EXISTS ai_planning_enabled BOOLEAN NOT NULL DEFAULT false;

-- Create ai_planning_sessions table
CREATE TABLE IF NOT EXISTS ai_planning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transition_id VARCHAR(255) NOT NULL,
    session_started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    session_completed_at TIMESTAMP,
    transition_type VARCHAR(50) NOT NULL,
    questions_asked JSONB DEFAULT '[]'::jsonb,
    responses_collected JSONB DEFAULT '[]'::jsonb,
    tasks_generated JSONB DEFAULT '[]'::jsonb,
    milestones_generated JSONB DEFAULT '[]'::jsonb,
    tasks_accepted JSONB DEFAULT '[]'::jsonb,
    milestones_accepted JSONB DEFAULT '[]'::jsonb,
    recommendations_rejected JSONB,
    llm_model_used VARCHAR(100),
    execution_mode VARCHAR(50) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ai_planning_sessions_transition
        FOREIGN KEY (transition_id)
        REFERENCES transitions(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_ai_planning_sessions_user
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_transition_type
        CHECK (transition_type IN ('Contract', 'Personnel', 'System')),

    CONSTRAINT chk_execution_mode
        CHECK (execution_mode IN ('DirectLLM', 'N8NWorkflow'))
);

-- Create indexes for ai_planning_sessions
CREATE INDEX IF NOT EXISTS idx_ai_planning_sessions_transition_id
    ON ai_planning_sessions(transition_id);

CREATE INDEX IF NOT EXISTS idx_ai_planning_sessions_created_by
    ON ai_planning_sessions(created_by);

CREATE INDEX IF NOT EXISTS idx_ai_planning_sessions_transition_type
    ON ai_planning_sessions(transition_type);

CREATE INDEX IF NOT EXISTS idx_ai_planning_sessions_execution_mode
    ON ai_planning_sessions(execution_mode);

CREATE INDEX IF NOT EXISTS idx_ai_planning_sessions_created_at
    ON ai_planning_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_planning_sessions_completed
    ON ai_planning_sessions(session_completed_at)
    WHERE session_completed_at IS NOT NULL;

-- Create index on ai_planning_enabled for transitions
CREATE INDEX IF NOT EXISTS idx_transitions_ai_planning_enabled
    ON transitions(ai_planning_enabled);

-- Seed one test record for ai_planning_sessions
-- Note: This will only work if there's at least one transition and user in the database
INSERT INTO ai_planning_sessions (
    id,
    transition_id,
    transition_type,
    execution_mode,
    created_by,
    llm_model_used,
    questions_asked,
    responses_collected,
    session_started_at
)
SELECT
    gen_random_uuid(),
    t.id,
    'Contract',
    'DirectLLM',
    u.id,
    'llama2',
    '[{"question_id": "scope", "text": "What is the scope of this transition?", "answer_type": "text"}]'::jsonb,
    '[{"question_id": "scope", "answer": "Full contract transition including knowledge transfer"}]'::jsonb,
    CURRENT_TIMESTAMP
FROM transitions t
CROSS JOIN users u
WHERE t.status = 'Planning'
  AND u."accountStatus" = 'Active'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add comment to document the change
COMMENT ON TABLE ai_planning_sessions IS 'Tracks AI-assisted transition planning sessions including questions, responses, and generated recommendations';
COMMENT ON COLUMN transitions.ai_planning_enabled IS 'Indicates whether AI-assisted planning is enabled for this transition';
