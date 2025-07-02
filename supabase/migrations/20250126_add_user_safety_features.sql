-- Migration: Add user safety features (blocking and content reporting)
-- Date: 2025-01-26
-- Purpose: App Store compliance for user-generated content safety

-- Table: blocked_users
-- Users can block other users to prevent seeing their content and interactions
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(blocker_id, blocked_id),
  CHECK(blocker_id != blocked_id) -- Can't block yourself
);

-- Table: content_reports
-- Users can flag content for manual admin review
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What was reported
  content_type VARCHAR NOT NULL CHECK(content_type IN ('review', 'comment', 'user_profile')),
  content_id UUID NOT NULL, -- ID of the review/comment/user
  
  -- Report details
  reason VARCHAR NOT NULL CHECK(reason IN ('inappropriate', 'spam', 'harassment', 'fake', 'hate_speech', 'other')),
  description TEXT, -- Optional additional details from reporter
  
  -- Moderation status
  status VARCHAR DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'dismissed', 'action_taken')),
  moderator_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate reports from same user for same content
  UNIQUE(reporter_id, content_type, content_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_content ON content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON content_reports(reporter_id);

-- Enable Row Level Security
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocked_users
-- Users can only manage their own blocks
CREATE POLICY "Users can view own blocks" ON blocked_users
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks" ON blocked_users
  FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete own blocks" ON blocked_users
  FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- RLS Policies for content_reports
-- Users can only see their own reports
CREATE POLICY "Users can view own reports" ON content_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports" ON content_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Note: Admin policies for content_reports can be added later
-- when admin role system is implemented

-- Add helpful comments
COMMENT ON TABLE blocked_users IS 'Users can block other users to prevent seeing their content';
COMMENT ON TABLE content_reports IS 'User reports of inappropriate content for manual admin review';
COMMENT ON COLUMN content_reports.content_type IS 'Type of content being reported: review, comment, or user_profile';
COMMENT ON COLUMN content_reports.content_id IS 'UUID of the specific content item being reported';
COMMENT ON COLUMN content_reports.status IS 'Moderation status: pending, reviewed, dismissed, or action_taken'; 