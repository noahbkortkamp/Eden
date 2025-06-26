-- Clean up test subscription data
-- Run this in Supabase SQL Editor to clear any existing test subscriptions

-- First, check what exists
SELECT 
  user_id,
  product_id,
  status,
  created_at,
  expiration_date,
  environment
FROM user_subscriptions 
ORDER BY created_at DESC;

-- Delete test/sandbox subscriptions (be careful with this!)
-- Uncomment the lines below if you want to delete test data:

-- DELETE FROM user_subscriptions 
-- WHERE environment = 'sandbox' 
-- OR product_id LIKE '%test%' 
-- OR latest_transaction_id LIKE 'mock_%';

-- OR if you want to delete ALL subscription data for testing:
-- DELETE FROM user_subscriptions;

-- Check subscription events too
SELECT 
  user_id,
  event_type,
  created_at,
  event_data
FROM subscription_events 
ORDER BY created_at DESC
LIMIT 10;

-- Uncomment to clean up test events:
-- DELETE FROM subscription_events 
-- WHERE event_data::text LIKE '%mock_%' 
-- OR event_data::text LIKE '%simulated%'; 