export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked_user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: 'review' | 'comment' | 'user_profile';
  content_id: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  moderator_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export type ReportReason = 
  | 'inappropriate' 
  | 'spam' 
  | 'harassment' 
  | 'fake' 
  | 'hate_speech' 
  | 'other';

export type ReportStatus = 
  | 'pending' 
  | 'reviewed' 
  | 'dismissed' 
  | 'action_taken';

export interface ReportContentParams {
  contentType: 'review' | 'comment' | 'user_profile';
  contentId: string;
  reason: ReportReason;
  description?: string;
}

// UI-friendly labels for reasons
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  inappropriate: 'Inappropriate Content',
  spam: 'Spam',
  harassment: 'Harassment',
  fake: 'Fake Information',
  hate_speech: 'Hate Speech',
  other: 'Other'
};

// UI-friendly labels for status
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Under Review',
  reviewed: 'Reviewed',
  dismissed: 'Dismissed',
  action_taken: 'Action Taken'
}; 