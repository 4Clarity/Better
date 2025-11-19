-- Migration: 011_add_product_program_tasks_milestones_knowledge.sql
-- Description: Add tasks, milestones, knowledge links, and knowledge context to product programs
-- Date: 2025-10-14
-- Story: 4.3 - Knowledge Integration and Advanced Features

-- Create enum types for task and milestone status
CREATE TYPE product_program_task_status AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE product_program_milestone_status AS ENUM ('UPCOMING', 'IN_PROGRESS', 'ACHIEVED', 'MISSED', 'CANCELLED');

-- Add knowledge_context field to product_programs table
ALTER TABLE product_programs
ADD COLUMN knowledge_context TEXT;

-- Create product_program_tasks table
CREATE TABLE product_program_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_program_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status product_program_task_status NOT NULL DEFAULT 'TODO',
    due_date TIMESTAMP(6),
    assigned_to VARCHAR(100),
    completed_at TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    CONSTRAINT fk_product_program_tasks_product_program
        FOREIGN KEY (product_program_id)
        REFERENCES product_programs(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_product_program_tasks_assigned_to
        FOREIGN KEY (assigned_to)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_product_program_tasks_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id),
    CONSTRAINT fk_product_program_tasks_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
);

-- Create indexes for product_program_tasks
CREATE INDEX idx_product_program_tasks_product_program_id ON product_program_tasks(product_program_id);
CREATE INDEX idx_product_program_tasks_status ON product_program_tasks(status);
CREATE INDEX idx_product_program_tasks_due_date ON product_program_tasks(due_date);
CREATE INDEX idx_product_program_tasks_assigned_to ON product_program_tasks(assigned_to);
CREATE INDEX idx_product_program_tasks_created_at ON product_program_tasks(created_at);

-- Create product_program_milestones table
CREATE TABLE product_program_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_program_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    target_date TIMESTAMP(6) NOT NULL,
    status product_program_milestone_status NOT NULL DEFAULT 'UPCOMING',
    achieved_at TIMESTAMP(6),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    updated_by VARCHAR(100) NOT NULL,
    CONSTRAINT fk_product_program_milestones_product_program
        FOREIGN KEY (product_program_id)
        REFERENCES product_programs(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_product_program_milestones_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id),
    CONSTRAINT fk_product_program_milestones_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(id)
);

-- Create indexes for product_program_milestones
CREATE INDEX idx_product_program_milestones_product_program_id ON product_program_milestones(product_program_id);
CREATE INDEX idx_product_program_milestones_status ON product_program_milestones(status);
CREATE INDEX idx_product_program_milestones_target_date ON product_program_milestones(target_date);
CREATE INDEX idx_product_program_milestones_created_at ON product_program_milestones(created_at);

-- Create product_program_knowledge_links table
CREATE TABLE product_program_knowledge_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_program_id UUID NOT NULL,
    knowledge_item_id VARCHAR(255) NOT NULL,
    link_type VARCHAR(50),
    linked_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    linked_by VARCHAR(100) NOT NULL,
    CONSTRAINT fk_product_program_knowledge_links_product_program
        FOREIGN KEY (product_program_id)
        REFERENCES product_programs(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_product_program_knowledge_links_linked_by
        FOREIGN KEY (linked_by)
        REFERENCES users(id),
    CONSTRAINT unique_product_program_knowledge_item
        UNIQUE (product_program_id, knowledge_item_id)
);

-- Create indexes for product_program_knowledge_links
CREATE INDEX idx_product_program_knowledge_links_product_program_id ON product_program_knowledge_links(product_program_id);
CREATE INDEX idx_product_program_knowledge_links_knowledge_item_id ON product_program_knowledge_links(knowledge_item_id);
CREATE INDEX idx_product_program_knowledge_links_linked_at ON product_program_knowledge_links(linked_at);

-- Insert seed data for testing (one test record for each table)
-- Note: Using a test product program ID and user ID that should exist from previous migrations

-- Get a test user and product program for seed data
DO $$
DECLARE
    test_user_id VARCHAR(100);
    test_program_id UUID;
BEGIN
    -- Get the first available user
    SELECT id INTO test_user_id FROM users LIMIT 1;

    -- Get the first available product program
    SELECT id INTO test_program_id FROM product_programs LIMIT 1;

    -- Only insert if we have both user and program
    IF test_user_id IS NOT NULL AND test_program_id IS NOT NULL THEN
        -- Insert test task
        INSERT INTO product_program_tasks (
            product_program_id,
            title,
            description,
            status,
            due_date,
            created_by,
            updated_by
        ) VALUES (
            test_program_id,
            'Test Task - Complete Documentation Review',
            'Review all documentation for completeness and accuracy',
            'TODO',
            CURRENT_TIMESTAMP + INTERVAL '7 days',
            test_user_id,
            test_user_id
        );

        -- Insert test milestone
        INSERT INTO product_program_milestones (
            product_program_id,
            title,
            description,
            target_date,
            status,
            created_by,
            updated_by
        ) VALUES (
            test_program_id,
            'Test Milestone - Initial Launch',
            'Complete initial launch of the product/program',
            CURRENT_TIMESTAMP + INTERVAL '30 days',
            'UPCOMING',
            test_user_id,
            test_user_id
        );

        -- Insert test knowledge link
        INSERT INTO product_program_knowledge_links (
            product_program_id,
            knowledge_item_id,
            link_type,
            linked_by
        ) VALUES (
            test_program_id,
            'test-knowledge-item-001',
            'Reference',
            test_user_id
        );
    END IF;
END $$;

-- Add comment to describe the migration
COMMENT ON TABLE product_program_tasks IS 'Tasks associated with Products/Programs for internal tracking and management';
COMMENT ON TABLE product_program_milestones IS 'Milestones associated with Products/Programs for tracking deliverables';
COMMENT ON TABLE product_program_knowledge_links IS 'Links between Products/Programs and Knowledge Management items';
COMMENT ON COLUMN product_programs.knowledge_context IS 'Additional narrative context for knowledge management';
