// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Course {
  id: string;
  name: string;
  town: string;
  state: string;
  country: string;
  type: string;
}

interface GeocodingResult {
  id: string;
  originalName: string;
  town: string;
  latitude: number;
  longitude: number;
  confidence: string;
  osmResult: any;
}

serve(async (req) => {
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { action, batchSize = 50, maxBatches = 50 } = await req.json()

    if (action === 'auto_geocode_all') {
      // Automatic processing of all remaining courses in batches
      let totalProcessed = 0
      let totalSuccessful = 0
      let totalErrors = 0
      let batchCount = 0
      let allResults: GeocodingResult[] = []
      let allErrors: any[] = []

      console.log(`Starting automated geocoding process...`)
      console.log(`Batch size: ${batchSize}, Max batches: ${maxBatches}`)

      while (batchCount < maxBatches) {
        // Get status first
        const { count: remainingCount } = await supabase
          .from('courses_staging')
          .select('*', { count: 'exact', head: true })
          .is('latitude', null)

        if (!remainingCount || remainingCount === 0) {
          console.log(`✅ All courses have been geocoded!`)
          break
        }

        batchCount++
        console.log(`\n🚀 Starting batch ${batchCount}/${maxBatches}`)
        console.log(`📊 Courses remaining: ${remainingCount}`)

        // Get courses that need geocoding for this batch
        const { data: ungeocodedCourses, error } = await supabase
          .from('courses_staging')
          .select('id, name, town, state, country, type')
          .is('latitude', null)
          .limit(batchSize)

        if (error) {
          console.error('Database error:', error)
          throw error
        }

        if (!ungeocodedCourses || ungeocodedCourses.length === 0) {
          console.log(`No more courses to process`)
          break
        }

        const batchResults: GeocodingResult[] = []
        const batchErrors: any[] = []

        // Process each course in the batch
        for (let i = 0; i < ungeocodedCourses.length; i++) {
          const course = ungeocodedCourses[i] as Course
          console.log(`  Processing ${i + 1}/${ungeocodedCourses.length}: ${course.name}`)

          try {
            // Build search query for OpenStreetMap
            const searchQuery = `${course.name}, ${course.town}, ${course.state}, ${course.country}`
            const encodedQuery = encodeURIComponent(searchQuery)
            
            // Call OpenStreetMap Nominatim API
            const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&addressdetails=1`
            
            const response = await fetch(osmUrl, {
              headers: {
                'User-Agent': 'GolfCourseApp/1.0'
              }
            })

            if (!response.ok) {
              throw new Error(`OSM API error: ${response.status}`)
            }

            const osmData = await response.json()

            if (osmData && osmData.length > 0) {
              const result = osmData[0]
              const lat = parseFloat(result.lat)
              const lng = parseFloat(result.lon)

              // Store result
              const geocodingResult: GeocodingResult = {
                id: course.id,
                originalName: course.name,
                town: course.town,
                latitude: lat,
                longitude: lng,
                confidence: 'HIGH',
                osmResult: result
              }

              batchResults.push(geocodingResult)

              // Update database record
              const { error: updateError } = await supabase
                .from('courses_staging')
                .update({
                  latitude: lat,
                  longitude: lng
                })
                .eq('id', course.id)

              if (updateError) {
                console.error(`    ❌ Failed to update ${course.name}:`, updateError)
                batchErrors.push({ course: course.name, error: updateError })
              } else {
                console.log(`    ✅ Geocoded: ${course.name}`)
                totalSuccessful++
              }

            } else {
              console.log(`    ⚠️  No results found for: ${course.name}`)
              batchErrors.push({ 
                course: course.name, 
                error: 'No OSM results found',
                searchQuery 
              })
              totalErrors++
            }

          } catch (error) {
            console.error(`    ❌ Error processing ${course.name}:`, error)
            batchErrors.push({ 
              course: course.name, 
              error: error instanceof Error ? error.message : String(error)
            })
            totalErrors++
          }

          totalProcessed++

          // Rate limiting: Wait 1 second between requests
          if (i < ungeocodedCourses.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }

        // Collect results
        allResults.push(...batchResults)
        allErrors.push(...batchErrors)

        console.log(`📋 Batch ${batchCount} complete:`)
        console.log(`   ✅ Successful: ${batchResults.length}`)
        console.log(`   ❌ Errors: ${batchErrors.length}`)
        console.log(`   📊 Running totals: ${totalSuccessful} successful, ${totalErrors} errors`)

        // Brief pause between batches
        if (batchCount < maxBatches) {
          console.log(`⏱️  Waiting 3 seconds before next batch...`)
          await new Promise(resolve => setTimeout(resolve, 3000))
        }
      }

      // Final status check
      const { count: finalRemainingCount } = await supabase
        .from('courses_staging')
        .select('*', { count: 'exact', head: true })
        .is('latitude', null)

      const { count: finalTotalCount } = await supabase
        .from('courses_staging')
        .select('*', { count: 'exact', head: true })

      return new Response(JSON.stringify({
        message: `🎉 Automated geocoding process complete!`,
        batchesProcessed: batchCount,
        totalProcessed,
        totalSuccessful,
        totalErrors,
        finalStatus: {
          totalCourses: finalTotalCount,
          geocoded: (finalTotalCount || 0) - (finalRemainingCount || 0),
          remaining: finalRemainingCount,
          progress: `${(finalTotalCount || 0) - (finalRemainingCount || 0)}/${finalTotalCount || 0}`
        },
        sampleSuccessful: allResults.slice(0, 5),
        sampleErrors: allErrors.slice(0, 5)
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } else if (action === 'geocode_batch') {
      // Get courses that need geocoding
      const { data: ungeocodedCourses, error } = await supabase
        .from('courses_staging')
        .select('id, name, town, state, country, type')
        .is('latitude', null)
        .limit(batchSize)

      if (error) {
        console.error('Database error:', error)
        return new Response(JSON.stringify({ error: 'Database error', details: error }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        })
      }

      if (!ungeocodedCourses || ungeocodedCourses.length === 0) {
        return new Response(JSON.stringify({ 
          message: 'No courses found that need geocoding',
          totalProcessed: 0
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      console.log(`Starting geocoding for ${ungeocodedCourses.length} courses...`)

      const results: GeocodingResult[] = []
      const errors: any[] = []

      // Process each course
      for (let i = 0; i < ungeocodedCourses.length; i++) {
        const course = ungeocodedCourses[i] as Course
        console.log(`Processing ${i + 1}/${ungeocodedCourses.length}: ${course.name}`)

        try {
          // Clean up course name (remove trailing spaces, etc.)
          const cleanName = course.name.trim()
          
          // Multiple search strategies
          const searchStrategies = [
            // Strategy 1: Full search with golf course
            `${cleanName} golf course, ${course.town}, ${course.state}`,
            // Strategy 2: Just name and location
            `${cleanName}, ${course.town}, ${course.state}`,
            // Strategy 3: Name and state only (for famous courses)
            `${cleanName}, ${course.state}`,
            // Strategy 4: Add "golf" if not present
            cleanName.toLowerCase().includes('golf') ? null : `${cleanName} golf, ${course.town}, ${course.state}`,
            // Strategy 5: Remove common suffixes and try again
            `${cleanName.replace(/\s+(golf course|golf club|country club|gc|cc)$/i, '')}, ${course.town}, ${course.state}`
          ].filter(Boolean)

          let osmData = null
          let usedQuery = ''

          // Try each search strategy
          for (const searchQuery of searchStrategies) {
            console.log(`  Trying: ${searchQuery}`)
            const encodedQuery = encodeURIComponent(searchQuery)
            
            // Call OpenStreetMap Nominatim API
            const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=5&addressdetails=1`
            
            const response = await fetch(osmUrl, {
              headers: {
                'User-Agent': 'GolfCourseApp/1.0'
              }
            })

            if (!response.ok) {
              console.log(`  OSM API error: ${response.status}`)
              continue
            }

            const data = await response.json()
            
            if (data && data.length > 0) {
              // Look for golf-related results first
              const golfResult = data.find(result => 
                result.display_name?.toLowerCase().includes('golf') ||
                result.type === 'leisure' ||
                result.class === 'leisure'
              )
              
              if (golfResult) {
                osmData = [golfResult]
                usedQuery = searchQuery
                console.log(`  ✅ Found golf course: ${golfResult.display_name}`)
                break
              } else if (data[0]) {
                // Fallback to first result if no golf-specific result
                osmData = [data[0]]
                usedQuery = searchQuery
                console.log(`  ✅ Found location: ${data[0].display_name}`)
                break
              }
            }
            
            // Wait between search attempts
            await new Promise(resolve => setTimeout(resolve, 500))
          }

          if (osmData && osmData.length > 0) {
            const result = osmData[0]
            const lat = parseFloat(result.lat)
            const lng = parseFloat(result.lon)

            // Store result
            const geocodingResult: GeocodingResult = {
              id: course.id,
              originalName: course.name,
              town: course.town,
              latitude: lat,
              longitude: lng,
              confidence: 'HIGH',
              osmResult: result
            }

            results.push(geocodingResult)

            // Update database record (FIXED - removed non-existent columns)
            const { error: updateError } = await supabase
              .from('courses_staging')
              .update({
                latitude: lat,
                longitude: lng
              })
              .eq('id', course.id)

            if (updateError) {
              console.error(`Failed to update ${course.name}:`, updateError)
              errors.push({ course: course.name, error: updateError })
            }

          } else {
            console.log(`No results found for: ${course.name}`)
            errors.push({ 
              course: course.name, 
              error: 'No OSM results found',
              searchQuery: usedQuery || 'No successful query'
            })
          }

        } catch (error) {
          console.error(`Error processing ${course.name}:`, error)
          errors.push({ 
            course: course.name, 
            error: error instanceof Error ? error.message : String(error)
          })
        }

        // Rate limiting: Wait 1 second between requests
        if (i < ungeocodedCourses.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      return new Response(JSON.stringify({
        message: `Batch geocoding complete`,
        totalProcessed: ungeocodedCourses.length,
        successfulGeocoding: results.length,
        errors: errors.length,
        sampleResults: results.slice(0, 5), // First 5 results
        errorSummary: errors.slice(0, 3) // First 3 errors
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } else if (action === 'status') {
      // Check how many courses still need geocoding
      const { count } = await supabase
        .from('courses_staging')
        .select('*', { count: 'exact', head: true })
        .is('latitude', null)

      const { count: totalCount } = await supabase
        .from('courses_staging')
        .select('*', { count: 'exact', head: true })

      return new Response(JSON.stringify({
        totalCourses: totalCount,
        ungeocodedCourses: count,
        geocodedCourses: (totalCount || 0) - (count || 0),
        progress: `${((totalCount || 0) - (count || 0))}/${totalCount || 0}`
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } else {
      return new Response(JSON.stringify({
        error: 'Invalid action. Use "geocode_batch", "auto_geocode_all", or "status"'
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