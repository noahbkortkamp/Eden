-- Enable Supabase real-time functionality for relevant tables

-- Enable real-time for the follows table
ALTER PUBLICATION supabase_realtime ADD TABLE follows;

-- Enable real-time for the reviews table
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;

-- Create a trigger function to notify when a new review is created by someone a user follows
CREATE OR REPLACE FUNCTION notify_new_review_from_followed_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Perform some notification logic or custom processing
  -- This could involve sending a webhook, adding to a notification table, etc.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger on the reviews table
CREATE TRIGGER notify_followed_user_review_trigger
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION notify_new_review_from_followed_user(); 