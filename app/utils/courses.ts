import { supabase } from './supabase';
import { Database } from './database.types';

type Course = Database['public']['Tables']['courses']['Row'];

export async function getCourse(courseId: string): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (error) throw error;
  return data;
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