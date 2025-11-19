-- Migration 014: Add Roadmap UI Tables for Enhanced Dashboard Features
-- Purpose: Support role-specific dashboards with platform setup, learning paths, skills tracking, activity logging, and AI chat
-- Date: 2025-10-16
-- Story: 1.5 - Roadmap UI Complete Implementation

-- ===========================================================================
-- 1. Platform Setup Table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS platform_setup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_number SMALLINT NOT NULL CHECK (step_number >= 1 AND step_number <= 5),
    step_name VARCHAR(100) NOT NULL,
    step_description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'complete')),
    completed_at TIMESTAMP(6),
    completed_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(step_number)
);

CREATE INDEX idx_platform_setup_status ON platform_setup(status);
CREATE INDEX idx_platform_setup_step_number ON platform_setup(step_number);

-- ===========================================================================
-- 2. Handover Checklist Items Table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS handover_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transition_id VARCHAR(255) NOT NULL REFERENCES transitions(id) ON DELETE CASCADE ON UPDATE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    item_text TEXT NOT NULL,
    item_category VARCHAR(100),
    order_index SMALLINT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP(6),
    notes TEXT,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_handover_checklist_transition ON handover_checklist_items(transition_id);
CREATE INDEX idx_handover_checklist_user ON handover_checklist_items(user_id);
CREATE INDEX idx_handover_checklist_completed ON handover_checklist_items(completed);
CREATE INDEX idx_handover_checklist_order ON handover_checklist_items(transition_id, order_index);

-- ===========================================================================
-- 3. Learning Modules Table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS learning_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_name VARCHAR(200) NOT NULL,
    description TEXT,
    module_category VARCHAR(100),
    order_index SMALLINT DEFAULT 0,
    estimated_hours DECIMAL(5, 2),
    content_url VARCHAR(500),
    prerequisites JSONB DEFAULT '[]',
    learning_objectives TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_name)
);

CREATE INDEX idx_learning_modules_active ON learning_modules(is_active);
CREATE INDEX idx_learning_modules_order ON learning_modules(order_index);
CREATE INDEX idx_learning_modules_category ON learning_modules(module_category);

-- ===========================================================================
-- 4. User Learning Progress Table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS user_learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    module_id UUID NOT NULL REFERENCES learning_modules(id) ON DELETE CASCADE ON UPDATE CASCADE,
    transition_id VARCHAR(255) REFERENCES transitions(id) ON DELETE SET NULL ON UPDATE CASCADE,
    progress_percentage SMALLINT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    status VARCHAR(50) DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'complete')),
    started_at TIMESTAMP(6),
    completed_at TIMESTAMP(6),
    quiz_score DECIMAL(5, 2),
    time_spent_minutes INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module_id)
);

CREATE INDEX idx_user_learning_progress_user ON user_learning_progress(user_id);
CREATE INDEX idx_user_learning_progress_module ON user_learning_progress(module_id);
CREATE INDEX idx_user_learning_progress_transition ON user_learning_progress(transition_id);
CREATE INDEX idx_user_learning_progress_status ON user_learning_progress(status);
CREATE INDEX idx_user_learning_progress_completion ON user_learning_progress(user_id, completed_at);

-- ===========================================================================
-- 5. Skills Master Table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS skills_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name VARCHAR(200) NOT NULL,
    description TEXT,
    skill_category VARCHAR(100),
    proficiency_levels JSONB DEFAULT '["beginner", "intermediate", "advanced", "expert"]',
    assessment_criteria TEXT,
    related_modules JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(skill_name)
);

CREATE INDEX idx_skills_master_active ON skills_master(is_active);
CREATE INDEX idx_skills_master_category ON skills_master(skill_category);

-- ===========================================================================
-- 6. User Skills Progress Table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS user_skills_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills_master(id) ON DELETE CASCADE ON UPDATE CASCADE,
    transition_id VARCHAR(255) REFERENCES transitions(id) ON DELETE SET NULL ON UPDATE CASCADE,
    progress_percentage SMALLINT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_level VARCHAR(50) DEFAULT 'beginner',
    target_level VARCHAR(50) DEFAULT 'expert',
    assessed_at TIMESTAMP(6),
    assessed_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    assessment_notes TEXT,
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_id)
);

CREATE INDEX idx_user_skills_progress_user ON user_skills_progress(user_id);
CREATE INDEX idx_user_skills_progress_skill ON user_skills_progress(skill_id);
CREATE INDEX idx_user_skills_progress_transition ON user_skills_progress(transition_id);
CREATE INDEX idx_user_skills_progress_level ON user_skills_progress(current_level);

-- ===========================================================================
-- 7. Chat Sessions Table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    transition_id VARCHAR(255) REFERENCES transitions(id) ON DELETE SET NULL ON UPDATE CASCADE,
    session_title VARCHAR(255),
    messages JSONB DEFAULT '[]',
    message_count INT DEFAULT 0,
    context_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_message_at TIMESTAMP(6),
    created_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_transition ON chat_sessions(transition_id);
CREATE INDEX idx_chat_sessions_active ON chat_sessions(is_active);
CREATE INDEX idx_chat_sessions_last_message ON chat_sessions(last_message_at DESC);
CREATE INDEX idx_chat_sessions_user_active ON chat_sessions(user_id, is_active);

-- ===========================================================================
-- 8. Activity Logs Table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    transition_id VARCHAR(255) REFERENCES transitions(id) ON DELETE SET NULL ON UPDATE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    activity_category VARCHAR(100),
    description TEXT NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_transition ON activity_logs(transition_id);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_category ON activity_logs(activity_category);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_user_timestamp ON activity_logs(user_id, timestamp DESC);

-- ===========================================================================
-- Seed Data: Platform Setup Steps
-- ===========================================================================
INSERT INTO platform_setup (step_number, step_name, step_description, status, created_at, updated_at)
VALUES
    (1, 'Setup Users', 'Invite and configure initial system users with appropriate roles', 'complete', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'Configure System', 'Set up system settings, integrations, and platform parameters', 'complete', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (3, 'Import Data', 'Load initial data including contracts, knowledge base, and organizational structure', 'in-progress', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (4, 'Train Users', 'Conduct user training sessions and provide onboarding materials', 'not-started', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (5, 'Go Live', 'Final validation and production deployment readiness', 'not-started', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (step_number) DO NOTHING;

-- ===========================================================================
-- Seed Data: Learning Modules
-- ===========================================================================
INSERT INTO learning_modules (module_name, description, module_category, order_index, estimated_hours, learning_objectives, is_active, created_at, updated_at)
VALUES
    ('Network Operations', 'Comprehensive training on network infrastructure, monitoring, and management', 'Technical', 1, 8.5, 'Understanding network topology, monitoring tools, troubleshooting procedures, and performance optimization', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Security Protocols', 'Essential security practices, compliance requirements, and incident response', 'Security', 2, 6.0, 'Master security best practices, compliance frameworks, access control, and incident handling', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Application Stack', 'Application architecture, deployment procedures, and maintenance protocols', 'Technical', 3, 10.0, 'Learn application architecture, CI/CD pipelines, deployment strategies, and troubleshooting', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Database Management', 'Database administration, backup strategies, and performance tuning', 'Technical', 4, 7.5, 'Database administration, query optimization, backup/restore procedures, and monitoring', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Incident Response', 'Incident management procedures, escalation paths, and resolution workflows', 'Operations', 5, 5.0, 'Incident detection, classification, escalation procedures, and post-incident analysis', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (module_name) DO NOTHING;

-- ===========================================================================
-- Seed Data: Skills Master
-- ===========================================================================
INSERT INTO skills_master (skill_name, description, skill_category, proficiency_levels, is_active, created_at, updated_at)
VALUES
    ('Network Monitoring', 'Proficiency in monitoring network infrastructure and identifying issues', 'Technical', '["beginner", "intermediate", "advanced", "expert"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Security Compliance', 'Understanding and implementing security compliance frameworks', 'Security', '["beginner", "intermediate", "advanced", "expert"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Database Administration', 'Managing and optimizing database systems', 'Technical', '["beginner", "intermediate", "advanced", "expert"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Incident Management', 'Handling and resolving system incidents effectively', 'Operations', '["beginner", "intermediate", "advanced", "expert"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Application Deployment', 'Deploying and maintaining application systems', 'Technical', '["beginner", "intermediate", "advanced", "expert"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('System Documentation', 'Creating and maintaining technical documentation', 'Documentation', '["beginner", "intermediate", "advanced", "expert"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Performance Optimization', 'Analyzing and improving system performance', 'Technical', '["beginner", "intermediate", "advanced", "expert"]'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (skill_name) DO NOTHING;

-- ===========================================================================
-- Grant Permissions
-- ===========================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON platform_setup TO tip_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON handover_checklist_items TO tip_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON learning_modules TO tip_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_learning_progress TO tip_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON skills_master TO tip_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_skills_progress TO tip_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions TO tip_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_logs TO tip_service;

-- ===========================================================================
-- Migration Complete
-- ===========================================================================
COMMENT ON TABLE platform_setup IS 'Tracks the 5-step platform initialization wizard for Government PM persona';
COMMENT ON TABLE handover_checklist_items IS 'Verification checklist items for outgoing contractor handover process';
COMMENT ON TABLE learning_modules IS 'Training modules for incoming contractor onboarding';
COMMENT ON TABLE user_learning_progress IS 'Tracks individual user progress through learning modules';
COMMENT ON TABLE skills_master IS 'Master list of skills to be tracked for contractor proficiency';
COMMENT ON TABLE user_skills_progress IS 'Individual skill proficiency tracking per user';
COMMENT ON TABLE chat_sessions IS 'AI chat conversation history and context for role-based assistants';
COMMENT ON TABLE activity_logs IS 'Comprehensive activity tracking for dashboard timelines and audit';
