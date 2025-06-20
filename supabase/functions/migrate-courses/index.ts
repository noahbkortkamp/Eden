// Supabase Edge Function to migrate courses from staging to production
// Handles field mapping and preserves geocoded data

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface StagingCourse {
  id: string;
  name: string;
  town: string;
  state: string;
  country: string;
  type: string;
  latitude?: number;
  longitude?: number;
}

interface ProductionCourse {
  id: string;
  name: string;
  town: string;
  state: string;
  country: string;
  type: string;
  latitude?: number;
  longitude?: number;
  // Production-only fields (set to defaults)
  location?: string;
  par?: number;
  yardage?: number;
  price_level?: number;
  website?: string;
  phone?: string;
  google_place_id?: string;
  image_url?: string;
  average_rating: number;
  total_ratings: number;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 405
      })
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action, batchSize = 100, confirmationToken } = await req.json()

    if (action === 'migrate_all') {
      // Safety check
      if (confirmationToken !== 'CONFIRM_MIGRATE_ALL_COURSES') {
        return new Response(JSON.stringify({ 
          error: 'Invalid confirmation token',
          required: 'CONFIRM_MIGRATE_ALL_COURSES'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        })
      }

      console.log('🚀 Starting course migration from staging to production...')

      // Get all staging courses
      const { data: stagingCourses, error: fetchError } = await supabase
        .from('courses_staging')
        .select('id, name, town, state, country, type, latitude, longitude')
        .order('id')
        .range(0, 1999) // Get first 2000 courses (covers all 1,353)

      if (fetchError) {
        console.error('Failed to fetch staging courses:', fetchError)
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch staging courses',
          details: fetchError.message
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        })
      }

      if (!stagingCourses || stagingCourses.length === 0) {
        return new Response(JSON.stringify({ 
          message: 'No staging courses found to migrate'
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      console.log(`Found ${stagingCourses.length} staging courses to migrate`)

      // Transform staging courses to production format
      const productionCourses: ProductionCourse[] = stagingCourses.map((course: StagingCourse) => {
        // Normalize type field to match production constraints
        let normalizedType = 'public' // default
        if (course.type) {
          const type = course.type.toLowerCase()
          if (type.includes('private') || type.includes('country club')) {
            normalizedType = 'private'
          } else if (type.includes('resort')) {
            normalizedType = 'resort'
          } else if (type.includes('municipal') || type.includes('public')) {
            normalizedType = 'public'
          }
        }
        
        return {
          id: course.id,
          name: course.name,
          town: course.town,
          state: course.state,
          country: course.country,
          type: normalizedType,
        latitude: course.latitude || null,
        longitude: course.longitude || null,
        // Set production defaults
        location: `${course.town}, ${course.state}`, // Combine town/state for location field
        par: 72, // Default par value (most common)
        yardage: 6500, // Default yardage value (typical course)
        price_level: 2, // Default price level (moderate)
        website: null,
        phone: null,
        google_place_id: null,
        image_url: null,
          average_rating: 0.0,
          total_ratings: 0
        }
      })

      // Count geocoded vs non-geocoded
      const geocodedCount = productionCourses.filter(c => c.latitude && c.longitude).length
      const nonGeocodedCount = productionCourses.length - geocodedCount

      console.log(`Migrating: ${geocodedCount} geocoded + ${nonGeocodedCount} non-geocoded = ${productionCourses.length} total courses`)

      // Insert in batches
      const results = {
        totalCourses: productionCourses.length,
        geocodedCourses: geocodedCount,
        nonGeocodedCourses: nonGeocodedCount,
        batchesProcessed: 0,
        successfulInserts: 0,
        errors: []
      }

      for (let i = 0; i < productionCourses.length; i += batchSize) {
        const batch = productionCourses.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        
        console.log(`Processing batch ${batchNumber}: ${batch.length} courses (${i + 1}-${i + batch.length})`)

        try {
          const { data, error: insertError } = await supabase
            .from('courses')
            .insert(batch)
            .select('id')

          if (insertError) {
            console.error(`Batch ${batchNumber} error:`, insertError)
            results.errors.push({
              batch: batchNumber,
              error: insertError.message,
              coursesInBatch: batch.length
            })
          } else {
            results.successfulInserts += data?.length || batch.length
            console.log(`✅ Batch ${batchNumber} success: ${data?.length || batch.length} courses inserted`)
          }

          results.batchesProcessed++

        } catch (error) {
          console.error(`Batch ${batchNumber} exception:`, error)
          results.errors.push({
            batch: batchNumber,
            error: error.message,
            coursesInBatch: batch.length
          })
        }

        // Brief pause between batches
        if (i + batchSize < productionCourses.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      // Final verification
      const { count: finalCourseCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })

      const { count: geocodedFinalCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      console.log('🎉 Migration complete!')
      console.log(`Final count: ${finalCourseCount} courses (${geocodedFinalCount} geocoded)`)

      return new Response(JSON.stringify({
        message: 'Course migration complete',
        results,
        verification: {
          finalCourseCount: finalCourseCount || 0,
          finalGeocodedCount: geocodedFinalCount || 0,
          finalNonGeocodedCount: (finalCourseCount || 0) - (geocodedFinalCount || 0)
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } else if (action === 'migrate_remaining') {
      // Safety check for remaining courses
      if (confirmationToken !== 'CONFIRM_MIGRATE_REMAINING_COURSES') {
        return new Response(JSON.stringify({ 
          error: 'Invalid confirmation token',
          required: 'CONFIRM_MIGRATE_REMAINING_COURSES'
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        })
      }

      console.log('🚀 Starting migration of REMAINING courses (1001-1353)...')

      // Get remaining staging courses (skip first 1000)
      const { data: stagingCourses, error: fetchError } = await supabase
        .from('courses_staging')
        .select('id, name, town, state, country, type, latitude, longitude')
        .order('id')
        .range(1000, 1352) // Get courses 1001-1353 (353 courses)

      if (fetchError) {
        console.error('Failed to fetch remaining staging courses:', fetchError)
        return new Response(JSON.stringify({ 
          error: 'Failed to fetch remaining staging courses',
          details: fetchError.message
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        })
      }

      if (!stagingCourses || stagingCourses.length === 0) {
        return new Response(JSON.stringify({ 
          message: 'No remaining staging courses found to migrate'
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      console.log(`Found ${stagingCourses.length} remaining staging courses to migrate`)

      // Transform staging courses to production format
      const productionCourses: ProductionCourse[] = stagingCourses.map((course: StagingCourse) => {
        // Normalize type field to match production constraints
        let normalizedType = 'public' // default
        if (course.type) {
          const type = course.type.toLowerCase()
          if (type.includes('private') || type.includes('country club')) {
            normalizedType = 'private'
          } else if (type.includes('resort')) {
            normalizedType = 'resort'
          } else if (type.includes('municipal') || type.includes('public')) {
            normalizedType = 'public'
          }
        }
        
        return {
          id: crypto.randomUUID(), // Generate new UUID to avoid conflicts
          name: course.name,
          town: course.town,
          state: course.state,
          country: course.country,
          type: normalizedType,
        latitude: course.latitude || null,
        longitude: course.longitude || null,
        // Set production defaults
        location: `${course.town}, ${course.state}`, // Combine town/state for location field
        par: 72, // Default par value (most common)
        yardage: 6500, // Default yardage value (typical course)
        price_level: 2, // Default price level (moderate)
        website: null,
        phone: null,
        google_place_id: null,
        image_url: null,
          average_rating: 0.0,
          total_ratings: 0
        }
      })

      // Count geocoded vs non-geocoded
      const geocodedCount = productionCourses.filter(c => c.latitude && c.longitude).length
      const nonGeocodedCount = productionCourses.length - geocodedCount

      console.log(`Migrating REMAINING: ${geocodedCount} geocoded + ${nonGeocodedCount} non-geocoded = ${productionCourses.length} total courses`)

      // Insert in batches
      const results = {
        totalCourses: productionCourses.length,
        geocodedCourses: geocodedCount,
        nonGeocodedCourses: nonGeocodedCount,
        batchesProcessed: 0,
        successfulInserts: 0,
        errors: []
      }

      for (let i = 0; i < productionCourses.length; i += batchSize) {
        const batch = productionCourses.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        
        console.log(`Processing REMAINING batch ${batchNumber}: ${batch.length} courses (${i + 1}-${i + batch.length})`)

        try {
          const { data, error: insertError } = await supabase
            .from('courses')
            .insert(batch)
            .select('id')

          if (insertError) {
            console.error(`REMAINING batch ${batchNumber} error:`, insertError)
            results.errors.push({
              batch: batchNumber,
              error: insertError.message,
              coursesInBatch: batch.length
            })
          } else {
            results.successfulInserts += data?.length || batch.length
            console.log(`✅ REMAINING batch ${batchNumber} success: ${data?.length || batch.length} courses inserted`)
          }

          results.batchesProcessed++

        } catch (error) {
          console.error(`REMAINING batch ${batchNumber} exception:`, error)
          results.errors.push({
            batch: batchNumber,
            error: error.message,
            coursesInBatch: batch.length
          })
        }

        // Brief pause between batches
        if (i + batchSize < productionCourses.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      // Final verification
      const { count: finalCourseCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })

      const { count: geocodedFinalCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      console.log('🎉 REMAINING migration complete!')
      console.log(`Final count: ${finalCourseCount} courses (${geocodedFinalCount} geocoded)`)

      return new Response(JSON.stringify({
        message: 'Remaining course migration complete',
        results,
        verification: {
          finalCourseCount: finalCourseCount || 0,
          finalGeocodedCount: geocodedFinalCount || 0,
          finalNonGeocodedCount: (finalCourseCount || 0) - (geocodedFinalCount || 0)
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } else if (action === 'debug') {
      // Debug endpoint to test query limits
      console.log('🔍 Debug: Testing staging course query...')
      
      // Test 1: Basic count
      const { count: totalCount } = await supabase
        .from('courses_staging')
        .select('*', { count: 'exact', head: true })
      
      console.log(`Total courses in staging: ${totalCount}`)
      
      // Test 2: Query with our current method
      const { data: testCourses, error: testError } = await supabase
        .from('courses_staging')
        .select('id, name, town, state, country, type, latitude, longitude')
        .order('id')
        .range(0, 1999)
      
      if (testError) {
        console.error('Query error:', testError)
        return new Response(JSON.stringify({ 
          error: 'Query failed', 
          details: testError.message 
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        })
      }
      
      console.log(`Query returned: ${testCourses?.length || 0} courses`)
      
      return new Response(JSON.stringify({
        debug: {
          totalInStaging: totalCount,
          queryReturned: testCourses?.length || 0,
          difference: (totalCount || 0) - (testCourses?.length || 0),
          querySuccess: !testError,
          sampleCourse: testCourses?.[0] || null
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } else if (action === 'status') {
      // Check migration status
      const { count: stagingCount } = await supabase
        .from('courses_staging')
        .select('*', { count: 'exact', head: true })

      const { count: stagingGeocodedCount } = await supabase
        .from('courses_staging')
        .select('*', { count: 'exact', head: true })
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      const { count: productionCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })

      const { count: productionGeocodedCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      return new Response(JSON.stringify({
        staging: {
          totalCourses: stagingCount || 0,
          geocoded: stagingGeocodedCount || 0,
          nonGeocoded: (stagingCount || 0) - (stagingGeocodedCount || 0)
        },
        production: {
          totalCourses: productionCount || 0,
          geocoded: productionGeocodedCount || 0,
          nonGeocoded: (productionCount || 0) - (productionGeocodedCount || 0)
        },
        readyToMigrate: (productionCount || 0) === 0,
        status: 'Migration status retrieved'
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } else {
      return new Response(JSON.stringify({
        error: 'Invalid action. Use "migrate_all", "migrate_remaining", "debug", or "status"'
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