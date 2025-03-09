-- Check if tags exist and match our expected IDs
SELECT id, name, category 
FROM tags 
ORDER BY category, name; 