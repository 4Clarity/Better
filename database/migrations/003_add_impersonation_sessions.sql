-- Migration: Add impersonation_sessions table
-- Story: 0.3.1 Role-Based UI Implementation
-- Date: 2025-10-08

-- Create impersonation_sessions table
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "actualUserId" TEXT NOT NULL,
  "impersonatedRole" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "impersonationReason" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "impersonation_sessions_actualUserId_fkey" FOREIGN KEY ("actualUserId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "impersonation_sessions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES user_sessions(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "impersonation_sessions_sessionId_isActive_key" UNIQUE ("sessionId", "isActive")
);

-- Create indexes for impersonation_sessions
CREATE INDEX IF NOT EXISTS "idx_impersonation_sessions_actualUserId" ON impersonation_sessions("actualUserId");
CREATE INDEX IF NOT EXISTS "idx_impersonation_sessions_sessionId" ON impersonation_sessions("sessionId");
CREATE INDEX IF NOT EXISTS "idx_impersonation_sessions_isActive" ON impersonation_sessions("isActive");
CREATE INDEX IF NOT EXISTS "idx_impersonation_sessions_startedAt" ON impersonation_sessions("startedAt");

-- Seed one test record
INSERT INTO impersonation_sessions (id, "sessionId", "actualUserId", "impersonatedRole", "impersonationReason", "isActive", "updatedAt")
SELECT
  'test_impersonation_1',
  us.id,
  us."userId",
  'Program Manager',
  'Initial test impersonation session',
  false,
  CURRENT_TIMESTAMP
FROM user_sessions us
LIMIT 1
ON CONFLICT DO NOTHING;
