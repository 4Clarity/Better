-- Migration: Add transition_level field to transitions table
-- Date: 2025-10-17
-- Story: 1.1 - Complete Three-Tier Hierarchy Implementation
-- Purpose: Enable transition categorization as Major, Personnel, or Operational

-- Step 1: Add column with default value and constraint
ALTER TABLE transitions
ADD COLUMN transition_level VARCHAR(20) DEFAULT 'MAJOR'
CHECK (transition_level IN ('MAJOR', 'PERSONNEL', 'OPERATIONAL'));

-- Step 2: Add index for query performance
CREATE INDEX idx_transitions_level ON transitions(transition_level);

-- Step 3: Intelligent classification of existing transitions
-- Major: Transitions with high priority or critical risk levels
UPDATE transitions
SET transition_level = 'MAJOR'
WHERE priority IN ('High', 'Critical')
   OR risk_level IN ('High', 'Critical')
   OR business_impact IS NOT NULL
   OR stakeholder_count > 10;

-- Personnel: Transitions with personnel-related keywords
UPDATE transitions
SET transition_level = 'PERSONNEL'
WHERE (
    LOWER(COALESCE(description, '')) LIKE '%personnel%'
    OR LOWER(COALESCE(description, '')) LIKE '%staffing%'
    OR LOWER(COALESCE(description, '')) LIKE '%team%'
    OR LOWER(COALESCE(description, '')) LIKE '%hiring%'
    OR LOWER(COALESCE(description, '')) LIKE '%onboarding%'
    OR LOWER(name) LIKE '%personnel%'
    OR LOWER(name) LIKE '%staffing%'
)
AND transition_level != 'MAJOR'; -- Don't override major transitions

-- Operational: Everything else defaults to operational
-- (Already set by default, but make it explicit for clarity)
UPDATE transitions
SET transition_level = 'OPERATIONAL'
WHERE transition_level IS NULL;

-- Step 4: Verify classification results
SELECT
    transition_level,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM transitions), 2) as percentage
FROM transitions
GROUP BY transition_level
ORDER BY count DESC;

-- Step 5: Show sample transitions from each category
SELECT
    transition_level,
    name,
    priority,
    status
FROM transitions
GROUP BY transition_level, name, priority, status
LIMIT 5;

-- Migration complete!
COMMENT ON COLUMN transitions.transition_level IS 'Categorization of transition: MAJOR (organization-wide), PERSONNEL (team/staffing), OPERATIONAL (process improvements)';
