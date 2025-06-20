// Supabase Edge Function to cleanup production database
// Uses service role key to bypass RLS policies

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 405
      })
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action, confirmationToken } = await req.json()

    // Safety check - require confirmation token
    if (action === 'cleanup_all' && confirmationToken !== 'CONFIRM_DELETE_ALL_DATA') {
      return new Response(JSON.stringify({ 
        error: 'Invalid confirmation token',
        required: 'CONFIRM_DELETE_ALL_DATA'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400
      })
    }

    if (action === 'cleanup_all') {
      console.log('🚨 Starting production database cleanup...')
      
      const results = {
        review_tags: { deleted: 0, error: null },
        reviews: { deleted: 0, error: null },
        saved_courses: { deleted: 0, error: null },
        courses: { deleted: 0, error: null },
        summary: ''
      }

      // Step 1: Delete all review_tags first (they reference reviews)
      try {
        console.log('Deleting all review_tags...')
        // Use a different approach - get all records first, then delete
        const { data: allReviewTags, error: fetchError } = await supabase
          .from('review_tags')
          .select('*')

        if (fetchError) {
          console.error('Review tags fetch error:', fetchError)
          results.review_tags.error = fetchError.message
        } else if (allReviewTags && allReviewTags.length > 0) {
          // Find the primary key column(s)
          const firstRecord = allReviewTags[0]
          const columns = Object.keys(firstRecord)
          console.log(`Review tags columns: ${columns.join(', ')}`)
          
          // Try different common column names for deletion
          let deleteQuery = supabase.from('review_tags').delete()
          
          if (columns.includes('review_id')) {
            deleteQuery = deleteQuery.neq('review_id', '00000000-0000-0000-0000-000000000000')
          } else if (columns.includes('tag_id')) {
            deleteQuery = deleteQuery.neq('tag_id', '00000000-0000-0000-0000-000000000000')
          } else {
            deleteQuery = deleteQuery.neq(columns[0], 'impossible_value_to_match')
          }
          
          const { count: reviewTagsDeleted, error: reviewTagsError } = await deleteQuery

          if (reviewTagsError) {
            console.error('Review tags deletion error:', reviewTagsError)
            results.review_tags.error = reviewTagsError.message
          } else {
            results.review_tags.deleted = reviewTagsDeleted || allReviewTags.length
            console.log(`✅ Deleted ${reviewTagsDeleted || allReviewTags.length} review_tags`)
          }
        } else {
          results.review_tags.deleted = 0
          console.log('✅ No review_tags to delete')
        }
      } catch (error) {
        console.error('Review tags deletion exception:', error)
        results.review_tags.error = error.message
      }

      // Step 2: Delete all reviews (now that review_tags are gone)
      try {
        console.log('Deleting all reviews...')
        const { count: reviewsDeleted, error: reviewsError } = await supabase
          .from('reviews')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (dummy condition)

        if (reviewsError) {
          console.error('Reviews deletion error:', reviewsError)
          results.reviews.error = reviewsError.message
        } else {
          results.reviews.deleted = reviewsDeleted || 0
          console.log(`✅ Deleted ${reviewsDeleted || 0} reviews`)
        }
      } catch (error) {
        console.error('Reviews deletion exception:', error)
        results.reviews.error = error.message
      }

      // Step 3: Delete all saved_courses first (they reference courses)
      try {
        console.log('Deleting all saved_courses...')
        const { count: savedCoursesDeleted, error: savedCoursesError } = await supabase
          .from('saved_courses')
          .delete()
          .neq('course_id', '00000000-0000-0000-0000-000000000000') // Delete all (dummy condition)

        if (savedCoursesError) {
          console.error('Saved courses deletion error:', savedCoursesError)
          results.saved_courses.error = savedCoursesError.message
        } else {
          results.saved_courses.deleted = savedCoursesDeleted || 0
          console.log(`✅ Deleted ${savedCoursesDeleted || 0} saved_courses`)
        }
      } catch (error) {
        console.error('Saved courses deletion exception:', error)
        results.saved_courses.error = error.message
      }

      // Step 4: Delete all courses (now that everything else is gone)
      try {
        console.log('Deleting all courses...')
        const { count: coursesDeleted, error: coursesError } = await supabase
          .from('courses')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (dummy condition)

        if (coursesError) {
          console.error('Courses deletion error:', coursesError)
          results.courses.error = coursesError.message
        } else {
          results.courses.deleted = coursesDeleted || 0
          console.log(`✅ Deleted ${coursesDeleted || 0} courses`)
        }
      } catch (error) {
        console.error('Courses deletion exception:', error)
        results.courses.error = error.message
      }

      // Verification - count remaining records
      const { count: remainingReviewTags } = await supabase
        .from('review_tags')
        .select('*', { count: 'exact', head: true })

      const { count: remainingReviews } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })

      const { count: remainingSavedCourses } = await supabase
        .from('saved_courses')
        .select('*', { count: 'exact', head: true })

      const { count: remainingCourses } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })

      results.summary = `Cleanup complete. Remaining: ${remainingCourses || 0} courses, ${remainingReviews || 0} reviews, ${remainingReviewTags || 0} review_tags, ${remainingSavedCourses || 0} saved_courses`

      console.log('🎉 Database cleanup complete!')
      console.log(results.summary)

      return new Response(JSON.stringify({
        message: 'Database cleanup complete',
        results,
        verification: {
          remainingCourses: remainingCourses || 0,
          remainingReviews: remainingReviews || 0,
          remainingReviewTags: remainingReviewTags || 0,
          remainingSavedCourses: remainingSavedCourses || 0
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } else if (action === 'status') {
      // Just check current counts
      const { count: courseCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })

      const { count: reviewCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })

      const { count: reviewTagCount } = await supabase
        .from('review_tags')
        .select('*', { count: 'exact', head: true })

      const { count: savedCourseCount } = await supabase
        .from('saved_courses')
        .select('*', { count: 'exact', head: true })

      return new Response(JSON.stringify({
        currentCourses: courseCount || 0,
        currentReviews: reviewCount || 0,
        currentReviewTags: reviewTagCount || 0,
        currentSavedCourses: savedCourseCount || 0,
        status: 'Database status retrieved'
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } else {
      return new Response(JSON.stringify({
        error: 'Invalid action. Use "cleanup_all" or "status"'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400
      })
    }

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({
      error: 'Function error',
      details: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
}) 