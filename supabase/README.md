# Supabase Configuration

This directory contains the SQL migrations for the database.

## Recent Changes

### March 25, 2025 - Course Rankings Access Fix

Fixed an issue where users couldn't see course rankings created by people they follow. This affected the display of comparative scores in the feed.

Changes made:
- Added a new RLS policy to allow users to view course rankings from people they follow
- Created a secure RPC function to bypass RLS for direct course ranking lookups
- Updated the frontend code to properly fetch and display the comparative scores

See `migrations/20250325_fix_course_rankings_access.sql` for the SQL changes. 