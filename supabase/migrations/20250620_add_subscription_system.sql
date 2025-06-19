/*
  # Subscription System for In-App Purchases
  
  This migration adds tables and functions for managing subscriptions
  without modifying any existing tables or functionality.
  
  New Tables:
  - user_subscriptions: Track user subscription status
  - purchase_receipts: Store receipt data for validation
  - subscription_events: Audit trail for subscription changes
  - premium_feature_usage: Track usage of premium features
  
  Functions:
  - validate_subscription_status: Check if user has active subscription
  - check_feature_access: Verify access to premium features
  - log_subscription_event: Record subscription-related events
*/

-- Create subscription status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM (
      'inactive',      -- No active subscription
      'active',        -- Active paid subscription  
      'trial',         -- In free trial period
      'expired',       -- Subscription expired
      'grace_period',  -- In grace period (payment issue)
      'paused',        -- Subscription paused (Android)
      'cancelled'      -- Subscription cancelled
    );
  END IF;
END $$;

-- Create subscription environment enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_environment') THEN
    CREATE TYPE subscription_environment AS ENUM ('sandbox', 'production');
  END IF;
END $$;

-- Create premium feature enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'premium_feature') THEN
    CREATE TYPE premium_feature AS ENUM (
      'unlimited_reviews',
      'score_visibility',
      'advanced_recommendations',
      'social_features',
      'export_data',
      'priority_support'
    );
  END IF;
END $$;

-- User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL, -- App Store/Play Store product ID
  status subscription_status NOT NULL DEFAULT 'inactive',
  
  -- Subscription dates
  start_date TIMESTAMPTZ NOT NULL,
  expiration_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  cancellation_date TIMESTAMPTZ,
  
  -- Purchase details
  original_transaction_id TEXT,
  latest_transaction_id TEXT,
  receipt_data TEXT, -- Encrypted receipt for validation
  environment subscription_environment NOT NULL DEFAULT 'sandbox',
  
  -- Trial information
  is_trial_period BOOLEAN DEFAULT FALSE,
  trial_days_remaining INTEGER DEFAULT 0,
  
  -- Metadata
  last_receipt_validation TIMESTAMPTZ,
  auto_renew_enabled BOOLEAN DEFAULT TRUE,
  price_tier TEXT, -- monthly, yearly, etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, product_id), -- One subscription per product per user
  CHECK (expiration_date > start_date OR expiration_date IS NULL),
  CHECK (trial_end_date >= start_date OR trial_end_date IS NULL)
);

-- Purchase Receipts Table (for receipt validation)
CREATE TABLE IF NOT EXISTS purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  
  -- Receipt data
  transaction_id TEXT NOT NULL,
  original_transaction_id TEXT,
  receipt_data TEXT NOT NULL, -- Base64 encoded receipt
  receipt_signature TEXT, -- For Android
  
  -- Validation status
  is_validated BOOLEAN DEFAULT FALSE,
  validation_error TEXT,
  validation_timestamp TIMESTAMPTZ,
  
  -- Purchase details
  product_id TEXT NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL,
  quantity INTEGER DEFAULT 1,
  environment subscription_environment NOT NULL DEFAULT 'sandbox',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(transaction_id, environment)
);

-- Subscription Events Table (audit trail)
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  
  -- Event details
  event_type TEXT NOT NULL, -- purchase_initiated, purchase_completed, subscription_renewed, etc.
  event_data JSONB, -- Additional event-specific data
  
  -- Context
  product_id TEXT,
  transaction_id TEXT,
  previous_status subscription_status,
  new_status subscription_status,
  
  -- Metadata
  error_message TEXT,
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for queries
  INDEX (user_id, created_at DESC),
  INDEX (event_type, created_at DESC)
);

-- Premium Feature Usage Table (track feature usage)
CREATE TABLE IF NOT EXISTS premium_feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature premium_feature NOT NULL,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 1,
  usage_date DATE DEFAULT CURRENT_DATE,
  
  -- Context
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  had_access BOOLEAN DEFAULT FALSE, -- Whether user had access when they used the feature
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, feature, usage_date), -- One record per feature per day per user
  INDEX (user_id, feature, usage_date DESC)
);

-- Enable Row Level Security
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_feature_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscriptions"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscriptions"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for purchase_receipts
CREATE POLICY "Users can view own receipts"
  ON purchase_receipts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own receipts"
  ON purchase_receipts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for subscription_events
CREATE POLICY "Users can view own subscription events"
  ON subscription_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service can insert subscription events"
  ON subscription_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for premium_feature_usage
CREATE POLICY "Users can view own feature usage"
  ON premium_feature_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can track own feature usage"
  ON premium_feature_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own feature usage"
  ON premium_feature_usage FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expiration ON user_subscriptions(expiration_date);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_product ON user_subscriptions(product_id);

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_user_id ON purchase_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_transaction ON purchase_receipts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_validation ON purchase_receipts(is_validated);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_usage_user_feature ON premium_feature_usage(user_id, feature);
CREATE INDEX IF NOT EXISTS idx_feature_usage_date ON premium_feature_usage(usage_date DESC);

-- Function: Check if user has active subscription
CREATE OR REPLACE FUNCTION validate_subscription_status(user_id UUID)
RETURNS TABLE (
  has_active_subscription BOOLEAN,
  subscription_status TEXT,
  expiration_date TIMESTAMPTZ,
  is_trial BOOLEAN,
  trial_end_date TIMESTAMPTZ,
  product_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN s.status IN ('active', 'trial', 'grace_period') 
        AND (s.expiration_date IS NULL OR s.expiration_date > NOW())
      THEN TRUE
      ELSE FALSE
    END as has_active_subscription,
    s.status::TEXT as subscription_status,
    s.expiration_date,
    s.is_trial_period as is_trial,
    s.trial_end_date,
    s.product_id
  FROM user_subscriptions s
  WHERE s.user_id = validate_subscription_status.user_id
    AND s.status != 'cancelled'
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Return default values if no subscription found
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      FALSE as has_active_subscription,
      'inactive'::TEXT as subscription_status,
      NULL::TIMESTAMPTZ as expiration_date,
      FALSE as is_trial,
      NULL::TIMESTAMPTZ as trial_end_date,
      NULL::TEXT as product_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check feature access for user
CREATE OR REPLACE FUNCTION check_feature_access(
  user_id UUID,
  feature_name premium_feature
)
RETURNS TABLE (
  has_access BOOLEAN,
  is_premium_feature BOOLEAN,
  usage_count INTEGER,
  limit_reached BOOLEAN
) AS $$
DECLARE
  subscription_active BOOLEAN := FALSE;
  daily_usage INTEGER := 0;
  feature_limit INTEGER;
BEGIN
  -- Check if user has active subscription
  SELECT has_active_subscription INTO subscription_active
  FROM validate_subscription_status(user_id)
  LIMIT 1;
  
  -- Get today's usage count for this feature
  SELECT COALESCE(pfu.usage_count, 0) INTO daily_usage
  FROM premium_feature_usage pfu
  WHERE pfu.user_id = check_feature_access.user_id
    AND pfu.feature = feature_name
    AND pfu.usage_date = CURRENT_DATE;
  
  -- Set feature limits for free users
  feature_limit := CASE feature_name
    WHEN 'unlimited_reviews' THEN 3  -- Free users get 3 reviews
    WHEN 'score_visibility' THEN 0   -- Premium only
    WHEN 'advanced_recommendations' THEN 0  -- Premium only
    WHEN 'social_features' THEN 1    -- Limited social features
    WHEN 'export_data' THEN 0        -- Premium only
    WHEN 'priority_support' THEN 0   -- Premium only
    ELSE 0
  END;
  
  RETURN QUERY
  SELECT 
    CASE 
      WHEN subscription_active THEN TRUE
      WHEN feature_name = 'unlimited_reviews' AND daily_usage < feature_limit THEN TRUE
      WHEN feature_name = 'social_features' AND daily_usage < feature_limit THEN TRUE
      ELSE FALSE
    END as has_access,
    CASE 
      WHEN feature_name IN ('score_visibility', 'advanced_recommendations', 'export_data', 'priority_support') THEN TRUE
      ELSE FALSE
    END as is_premium_feature,
    daily_usage as usage_count,
    CASE 
      WHEN subscription_active THEN FALSE
      ELSE daily_usage >= feature_limit
    END as limit_reached;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log subscription events
CREATE OR REPLACE FUNCTION log_subscription_event(
  user_id UUID,
  event_type TEXT,
  event_data JSONB DEFAULT NULL,
  subscription_id UUID DEFAULT NULL,
  product_id TEXT DEFAULT NULL,
  transaction_id TEXT DEFAULT NULL,
  previous_status subscription_status DEFAULT NULL,
  new_status subscription_status DEFAULT NULL,
  error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO subscription_events (
    user_id,
    subscription_id,
    event_type,
    event_data,
    product_id,
    transaction_id,
    previous_status,
    new_status,
    error_message,
    created_at
  ) VALUES (
    user_id,
    subscription_id,
    event_type,
    event_data,
    product_id,
    transaction_id,
    previous_status,
    new_status,
    error_message,
    NOW()
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Track feature usage
CREATE OR REPLACE FUNCTION track_feature_usage(
  user_id UUID,
  feature_name premium_feature,
  subscription_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage INTEGER := 0;
  had_access BOOLEAN := FALSE;
BEGIN
  -- Check if user currently has access
  SELECT check_feature_access.has_access INTO had_access
  FROM check_feature_access(user_id, feature_name)
  LIMIT 1;
  
  -- Insert or update usage record
  INSERT INTO premium_feature_usage (
    user_id,
    feature,
    usage_count,
    usage_date,
    subscription_id,
    had_access,
    created_at
  ) VALUES (
    user_id,
    feature_name,
    1,
    CURRENT_DATE,
    subscription_id,
    had_access,
    NOW()
  )
  ON CONFLICT (user_id, feature, usage_date)
  DO UPDATE SET
    usage_count = premium_feature_usage.usage_count + 1,
    had_access = EXCLUDED.had_access;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update subscription status
CREATE OR REPLACE FUNCTION update_subscription_status(
  user_id UUID,
  product_id TEXT,
  new_status subscription_status,
  expiration_date TIMESTAMPTZ DEFAULT NULL,
  transaction_id TEXT DEFAULT NULL,
  receipt_data TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  subscription_id UUID;
  old_status subscription_status;
BEGIN
  -- Get current subscription
  SELECT id, status INTO subscription_id, old_status
  FROM user_subscriptions
  WHERE user_subscriptions.user_id = update_subscription_status.user_id
    AND user_subscriptions.product_id = update_subscription_status.product_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Update existing subscription or create new one
  IF subscription_id IS NOT NULL THEN
    UPDATE user_subscriptions SET
      status = new_status,
      expiration_date = COALESCE(update_subscription_status.expiration_date, user_subscriptions.expiration_date),
      latest_transaction_id = COALESCE(transaction_id, latest_transaction_id),
      receipt_data = COALESCE(update_subscription_status.receipt_data, user_subscriptions.receipt_data),
      last_receipt_validation = NOW(),
      updated_at = NOW()
    WHERE id = subscription_id;
  ELSE
    INSERT INTO user_subscriptions (
      user_id,
      product_id,
      status,
      start_date,
      expiration_date,
      latest_transaction_id,
      receipt_data,
      last_receipt_validation
    ) VALUES (
      user_id,
      product_id,
      new_status,
      NOW(),
      expiration_date,
      transaction_id,
      receipt_data,
      NOW()
    )
    RETURNING id INTO subscription_id;
  END IF;
  
  -- Log the event
  PERFORM log_subscription_event(
    user_id,
    'status_updated',
    jsonb_build_object(
      'old_status', old_status,
      'new_status', new_status,
      'product_id', product_id
    ),
    subscription_id,
    product_id,
    transaction_id,
    old_status,
    new_status
  );
  
  RETURN subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable real-time subscriptions for subscription updates
ALTER PUBLICATION supabase_realtime ADD TABLE user_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE subscription_events; 