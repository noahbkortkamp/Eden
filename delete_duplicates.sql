-- SQL to Delete Duplicate Golf Courses
-- Keeps the oldest course (earliest created_at) for each name+location combination

-- First, let's see what duplicates exist
SELECT 
    name,
    location,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at) as course_ids,
    array_agg(created_at ORDER BY created_at) as created_dates
FROM courses 
WHERE name IS NOT NULL AND location IS NOT NULL
GROUP BY name, location
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Delete duplicates, keeping only the oldest course for each name+location
WITH duplicates AS (
    SELECT 
        id,
        name,
        location,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY name, location 
            ORDER BY created_at ASC
        ) as rn
    FROM courses 
    WHERE name IS NOT NULL AND location IS NOT NULL
),
courses_to_delete AS (
    SELECT id, name, location
    FROM duplicates 
    WHERE rn > 1
)
DELETE FROM courses 
WHERE id IN (SELECT id FROM courses_to_delete);

-- Verify cleanup - should show no duplicates
SELECT 
    name,
    location,
    COUNT(*) as count
FROM courses 
WHERE name IS NOT NULL AND location IS NOT NULL
GROUP BY name, location
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC; 