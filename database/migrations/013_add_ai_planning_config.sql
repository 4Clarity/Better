-- Migration: Add AI Planning Configuration Tables
-- Description: Creates tables to store configurable questions and task templates for AI planning sessions
-- Date: 2025-10-14

-- ====================================
-- AI Planning Questions Configuration
-- ====================================

CREATE TABLE IF NOT EXISTS ai_planning_questions (
    id VARCHAR(255) PRIMARY KEY,
    transition_type VARCHAR(50) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL DEFAULT 'TEXT', -- TEXT, SELECT, MULTI_SELECT, NUMBER, BOOLEAN
    question_options TEXT[], -- Array of options for SELECT/MULTI_SELECT types
    is_required BOOLEAN NOT NULL DEFAULT true,
    help_text TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),

    CONSTRAINT fk_ai_planning_questions_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_ai_planning_questions_transition_type ON ai_planning_questions(transition_type);
CREATE INDEX idx_ai_planning_questions_display_order ON ai_planning_questions(display_order);

-- ====================================
-- AI Planning Task Templates Configuration
-- ====================================

CREATE TABLE IF NOT EXISTS ai_planning_task_templates (
    id VARCHAR(255) PRIMARY KEY,
    transition_type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    phase VARCHAR(255),
    owner_role VARCHAR(255),
    days_from_start INTEGER NOT NULL DEFAULT 0,
    duration_days INTEGER NOT NULL DEFAULT 1,
    priority VARCHAR(50) NOT NULL DEFAULT 'Medium', -- Low, Medium, High, Critical
    tags TEXT[], -- Array of tags
    dependencies TEXT[], -- Array of task template IDs that this task depends on
    display_order INTEGER NOT NULL DEFAULT 0,
    is_milestone BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),

    CONSTRAINT fk_ai_planning_task_templates_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX idx_ai_planning_task_templates_transition_type ON ai_planning_task_templates(transition_type);
CREATE INDEX idx_ai_planning_task_templates_display_order ON ai_planning_task_templates(display_order);
CREATE INDEX idx_ai_planning_task_templates_phase ON ai_planning_task_templates(phase);

-- ====================================
-- Seed Data: Developer Onboarding Configuration
-- ====================================

-- Insert default questions for Developer Onboarding
INSERT INTO ai_planning_questions (id, transition_type, question_text, question_type, is_required, help_text, display_order)
VALUES
    ('q1_dev_onboard', 'Developer Onboarding', 'What is the primary technology stack?', 'TEXT', true, 'List the main programming languages, frameworks, and tools', 1),
    ('q2_dev_onboard', 'Developer Onboarding', 'What is the complexity level of the codebase?', 'SELECT', true, 'This helps determine the learning curve', 2),
    ('q3_dev_onboard', 'Developer Onboarding', 'Are there existing documentation and onboarding materials?', 'BOOLEAN', true, 'This affects the timeline and support needed', 3),
    ('q4_dev_onboard', 'Developer Onboarding', 'What team size will the developer be joining?', 'NUMBER', true, 'Number of team members', 4),
    ('q5_dev_onboard', 'Developer Onboarding', 'Which areas require immediate focus?', 'MULTI_SELECT', false, 'Select all that apply', 5);

-- Add options for the complexity question
UPDATE ai_planning_questions
SET question_options = ARRAY['Beginner-friendly', 'Moderate', 'Complex', 'Highly Complex']
WHERE id = 'q2_dev_onboard';

-- Add options for the areas of focus question
UPDATE ai_planning_questions
SET question_options = ARRAY['Frontend Development', 'Backend Development', 'Database Management', 'DevOps', 'Testing', 'Documentation']
WHERE id = 'q5_dev_onboard';

-- Insert default task templates for Developer Onboarding
INSERT INTO ai_planning_task_templates (
    id, transition_type, title, description, phase, owner_role,
    days_from_start, duration_days, priority, tags, display_order
)
VALUES
    ('t1_dev_onboard', 'Developer Onboarding', 'Receive and review Technical Onboarding Guide',
     'Architecture Overview, Git Workflow, Stack documentation', 'Pre-Boarding', 'Manager',
     -5, 5, 'High', ARRAY['documentation', 'preparation'], 1),

    ('t2_dev_onboard', 'Developer Onboarding', 'Set up local development environment - Time to First Commit',
     'Successfully configure dev environment and make first commit', 'Day 1', 'Buddy',
     0, 1, 'Critical', ARRAY['setup', 'environment'], 2),

    ('t3_dev_onboard', 'Developer Onboarding', 'Team Introduction & Role Clarity',
     'Meet the team and understand role expectations', 'Day 1', 'Manager',
     0, 1, 'High', ARRAY['team', 'introduction'], 3),

    ('t4_dev_onboard', 'Developer Onboarding', 'Complete first starter task',
     'Bug fix or small feature to learn workflow', 'Week 1', 'Buddy',
     1, 4, 'High', ARRAY['coding', 'learning'], 4),

    ('t5_dev_onboard', 'Developer Onboarding', 'Code Review Training',
     'Learn team code review process and standards', 'Week 1', 'Senior Dev',
     2, 2, 'Medium', ARRAY['process', 'quality'], 5),

    ('t6_dev_onboard', 'Developer Onboarding', 'Security & Compliance Training',
     'Complete required security and compliance courses', 'Week 2', 'Security Team',
     7, 3, 'High', ARRAY['security', 'compliance'], 6),

    ('t7_dev_onboard', 'Developer Onboarding', 'First Independent Feature',
     'Own a small feature from design to deployment', 'Week 3-4', 'Self/Buddy',
     14, 14, 'High', ARRAY['coding', 'ownership'], 7),

    ('t8_dev_onboard', 'Developer Onboarding', 'Week 1 Check-in',
     'Review progress and adjust onboarding plan', 'Week 1', 'Manager',
     5, 1, 'Medium', ARRAY['milestone', 'review'], 8),

    ('t9_dev_onboard', 'Developer Onboarding', 'Testing & CI/CD Pipeline Training',
     'Learn testing practices and deployment pipeline', 'Week 2-3', 'DevOps/Senior Dev',
     10, 7, 'Medium', ARRAY['testing', 'devops'], 9),

    ('t10_dev_onboard', 'Developer Onboarding', 'Architecture Deep Dive',
     'Understand system architecture and design patterns', 'Week 3-4', 'Tech Lead',
     14, 7, 'High', ARRAY['architecture', 'learning'], 10),

    ('t11_dev_onboard', 'Developer Onboarding', 'Month 1 Milestone Review',
     'Comprehensive review of first month progress', 'Month 1', 'Manager',
     30, 1, 'High', ARRAY['milestone', 'review'], 11),

    ('t12_dev_onboard', 'Developer Onboarding', 'Contribute to Team Knowledge Base',
     'Document learnings and improve onboarding docs', 'Month 2', 'Self',
     35, 5, 'Medium', ARRAY['documentation', 'contribution'], 12),

    ('t13_dev_onboard', 'Developer Onboarding', 'Lead a Code Review',
     'Conduct first code review for team member', 'Month 2', 'Self',
     40, 2, 'Medium', ARRAY['mentoring', 'quality'], 13),

    ('t14_dev_onboard', 'Developer Onboarding', 'Performance Optimization Task',
     'Work on performance or scalability improvement', 'Month 2-3', 'Self/Tech Lead',
     45, 10, 'Medium', ARRAY['optimization', 'advanced'], 14),

    ('t15_dev_onboard', 'Developer Onboarding', 'Cross-team Collaboration',
     'Work with another team on integration or shared feature', 'Month 3', 'Self',
     60, 10, 'Medium', ARRAY['collaboration', 'integration'], 15),

    ('t16_dev_onboard', 'Developer Onboarding', 'Month 2 Check-in',
     'Review progress and set Month 3 goals', 'Month 2', 'Manager',
     60, 1, 'Medium', ARRAY['milestone', 'review'], 16),

    ('t17_dev_onboard', 'Developer Onboarding', 'Technical Presentation or Demo',
     'Present work to team or stakeholders', 'Month 3', 'Self',
     75, 3, 'Medium', ARRAY['presentation', 'communication'], 17),

    ('t18_dev_onboard', 'Developer Onboarding', '90-Day Onboarding Completion Review',
     'Final review and transition to full team member', 'Month 3', 'Manager',
     90, 1, 'High', ARRAY['milestone', 'completion'], 18);

-- Mark milestone tasks
UPDATE ai_planning_task_templates
SET is_milestone = true
WHERE id IN ('t8_dev_onboard', 't11_dev_onboard', 't16_dev_onboard', 't18_dev_onboard');

-- Add dependencies (e.g., first feature depends on starter task)
UPDATE ai_planning_task_templates
SET dependencies = ARRAY['t2_dev_onboard']
WHERE id = 't4_dev_onboard';

UPDATE ai_planning_task_templates
SET dependencies = ARRAY['t4_dev_onboard']
WHERE id = 't7_dev_onboard';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_planning_questions TO tip_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_planning_task_templates TO tip_app;

COMMENT ON TABLE ai_planning_questions IS 'Stores configurable questions for AI planning sessions by transition type';
COMMENT ON TABLE ai_planning_task_templates IS 'Stores task and milestone templates for AI planning recommendations by transition type';
