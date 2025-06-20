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
  club_type: string;
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

    const { action, batchSize = 50 } = await req.json()

    if (action === 'geocode_batch') {
      // Get courses that need geocoding
      const { data: ungeocodedCourses, error } = await supabase
        .from('courses_staging')
        .select('id, name, town, state, country, club_type')
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

            results.push(geocodingResult)

            // Update database record
            const { error: updateError } = await supabase
              .from('courses_staging')
              .update({
                latitude: lat,
                longitude: lng,
                osm_place_id: result.place_id,
                osm_display_name: result.display_name
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
              searchQuery 
            })
          }

        } catch (error) {
          console.error(`Error processing ${course.name}:`, error)
          errors.push({ 
            course: course.name, 
            error: error.message 
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
        error: 'Invalid action. Use "geocode_batch" or "status"'
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