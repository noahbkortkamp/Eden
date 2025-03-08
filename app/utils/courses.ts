import { supabase } from './supabase';
import { Database } from './database.types';

type Course = Database['public']['Tables']['courses']['Row'];

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache
const courseCache = new Map<string, { data: Course; timestamp: number }>();

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getCourse(courseId: string, retryCount = 0): Promise<Course> {
  // Check cache first
  const cached = courseCache.get(courseId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached data for course: ${cached.data.name}`);
    return cached.data;
  }

  console.log(`Fetching course with ID: ${courseId} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
  
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error) {
      console.error('Supabase error fetching course:', error);
      throw error;
    }

    if (!data) {
      console.error('No course found with ID:', courseId);
      throw new Error(`Course not found: ${courseId}`);
    }

    // Cache the result
    courseCache.set(courseId, { data, timestamp: Date.now() });
    console.log(`Successfully fetched course: ${data.name}`);
    return data;
  } catch (err) {
    console.error(`Attempt ${retryCount + 1} failed:`, err);
    
    if (retryCount < MAX_RETRIES - 1 && err instanceof Error && err.message.includes('Network request failed')) {
      console.log(`Retrying in ${RETRY_DELAY}ms...`);
      await delay(RETRY_DELAY);
      return getCourse(courseId, retryCount + 1);
    }
    
    throw err;
  }
}

export async function getAllCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}

export async function searchCourses(query: string): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .or(`name.ilike.%${query}%,location.ilike.%${query}%`)
    .order('name', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createCourse(
  name: string,
  location: string,
  par: number,
  yardage: number,
  priceLevel: number,
  type: string,
  latitude: number,
  longitude: number,
  website?: string | null,
  phone?: string | null
): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .insert({
      name,
      location,
      par,
      yardage,
      price_level: priceLevel,
      type,
      latitude,
      longitude,
      website,
      phone,
      rating: 0,
      total_ratings: 0,
      photos: [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCourse(
  courseId: string,
  updates: {
    name?: string;
    location?: string;
    par?: number;
    yardage?: number;
    priceLevel?: number;
    type?: string;
    latitude?: number;
    longitude?: number;
    website?: string | null;
    phone?: string | null;
    photos?: string[];
  }
): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCourseRating(courseId: string): Promise<void> {
  // Get all reviews for the course
  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select('rating')
    .eq('course_id', courseId);

  if (reviewsError) throw reviewsError;

  // Calculate average rating
  const totalRatings = reviews.length;
  const ratingValues = {
    liked: 1,
    fine: 0,
    didnt_like: -1,
  };

  const ratingSum = reviews.reduce((sum, review) => {
    return sum + ratingValues[review.rating as keyof typeof ratingValues];
  }, 0);

  const averageRating = totalRatings > 0 ? ratingSum / totalRatings : 0;

  // Update course rating
  const { error: updateError } = await supabase
    .from('courses')
    .update({
      rating: averageRating,
      total_ratings: totalRatings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', courseId);

  if (updateError) throw updateError;
}

export async function getNearbyCoursesWithinRadius(
  latitude: number,
  longitude: number,
  radiusInMiles: number
): Promise<Course[]> {
  // Convert miles to degrees (approximate)
  const degreesPerMile = 1 / 69;
  const radiusInDegrees = radiusInMiles * degreesPerMile;

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .gte('latitude', latitude - radiusInDegrees)
    .lte('latitude', latitude + radiusInDegrees)
    .gte('longitude', longitude - radiusInDegrees)
    .lte('longitude', longitude + radiusInDegrees)
    .order('name', { ascending: true });

  if (error) throw error;

  // Further filter results using actual distance calculation
  return data.filter(course => {
    const distance = getDistanceInMiles(
      latitude,
      longitude,
      course.latitude,
      course.longitude
    );
    return distance <= radiusInMiles;
  });
}

// Helper function to calculate distance between two points using Haversine formula
function getDistanceInMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
} 