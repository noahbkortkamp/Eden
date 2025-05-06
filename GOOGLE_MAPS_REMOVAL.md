# Google Maps Removal

This document outlines the steps taken to remove Google Maps dependencies from the project.

## Background

The app was experiencing errors related to Google Maps functionality:
- "Cannot read property 'slice' of undefined" error
- The app already had a robust Supabase-based course search implementation that was being used in most places

## Changes Made

1. **Removed Google Maps Service**
   - Deleted `app/services/places.ts` which contained all Google Maps API interactions
   - Removed `@googlemaps/google-maps-services-js` dependency from the project

2. **Updated API Service**
   - Modified `app/services/api.ts` to use the existing Supabase course search implementation
   - Transformed Supabase course results to match the expected `GolfCourse` type
   - The `searchCourses` method now uses `utils/courses.searchCourses` instead of Google Maps

3. **Updated SearchContext**
   - Modified `app/context/SearchContext.tsx` to reflect that location parameter is optional
   - Kept backward compatibility to avoid breaking code that uses the context

## Benefits

1. **Simplified Codebase**
   - Removed redundant search implementation
   - Consolidated all course search to use the Supabase database
   - Reduced external API dependencies

2. **Improved Reliability**
   - Fixed "slice of undefined" errors related to Google Maps
   - All course search now uses a single source of truth (Supabase)

3. **Cost Reduction**
   - Eliminated Google Maps API costs
   - No need to manage Google Maps API keys

## Next Steps

1. **Testing**
   - Verify course search works correctly throughout the app
   - Check for any other potential Google Maps dependencies

2. **Address Auth Context Issue**
   - Investigate and fix "Auth context is undefined when useAuth was called" error
   - This is unrelated to Google Maps removal and should be addressed separately 