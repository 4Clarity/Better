-- Migration: Add orderIndex column to tasks table for hierarchical task ordering
-- Author: Claude Code
-- Date: 2025-10-14

-- Add orderIndex column with default value of 0
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- Create an index on (transitionId, parentTaskId, orderIndex) for efficient sibling queries
CREATE INDEX IF NOT EXISTS idx_tasks_parent_order
ON tasks ("transitionId", "parentTaskId", "orderIndex");

-- Update existing tasks to have sequential orderIndex values within their parent groups
WITH ranked_tasks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "transitionId", COALESCE("parentTaskId", 'null-parent')
      ORDER BY "createdAt"
    ) - 1 AS new_order_index
  FROM tasks
)
UPDATE tasks
SET "orderIndex" = ranked_tasks.new_order_index
FROM ranked_tasks
WHERE tasks.id = ranked_tasks.id;

COMMENT ON COLUMN tasks."orderIndex" IS 'Position of task within its parent/sibling group for hierarchical ordering';
