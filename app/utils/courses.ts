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

// Calculate Levenshtein distance between two strings
// This measures how many single-character edits (insertions, deletions, substitutions)
// are needed to change one string to another
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // Initialize the matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
}

// Calculate fuzzy match score based on Levenshtein distance
function calculateFuzzyScore(source: string, target: string): number {
  if (!source || !target) return 0;
  if (source === target) return 100; // Perfect match

  const distance = levenshteinDistance(source, target);
  const maxLength = Math.max(source.length, target.length);
  
  // Convert distance to a similarity percentage (100 = identical, 0 = completely different)
  const similarity = Math.max(0, 100 - Math.floor((distance / maxLength) * 100));
  
  return similarity;
}

// Debug function to log search scoring
export function logSearchScoring(query: string, scoredResults: CourseWithRelevance[]) {
  const normalizedQuery = query.toLowerCase().trim();
  console.log(`🔍 DEBUG: Search results for "${normalizedQuery}":`);
  
  scoredResults.slice(0, 10).forEach((item, index) => {
    console.log(`🔍 DEBUG: "${item.name}" scored ${item.relevanceScore} - rank ${index + 1}`);
  });
}

// Define enhanced type for courses with relevance scores
export interface CourseWithRelevance extends Course {
  relevanceScore: number;
}

export async function searchCourses(query: string): Promise<CourseWithRelevance[]> {
  // If query is empty, return all courses
  if (!query.trim()) {
    return getAllCourses();
  }
  
  // Get all courses to perform client-side filtering for more control
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  
  if (!data || data.length === 0) {
    return [];
  }
  
  // Normalize the query (lowercase, trim)
  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/\s+/);
  
  // Calculate relevance score for each course
  const scoredCourses = data.map(course => {
    const name = course.name.toLowerCase();
    const location = (course.location || '').toLowerCase();
    
    let score = 0;
    
    // Check for exact match in name (highest priority)
    if (name === normalizedQuery) {
      score += 100;
    }
    
    // Check for name starting with query (high priority)
    else if (name.startsWith(normalizedQuery)) {
      score += 80;
    }
    
    // Check for each word in query starting a word in name
    for (const word of words) {
      const wordRegex = new RegExp(`\\b${word}`, 'i');
      if (wordRegex.test(name)) {
        score += 60;
      }
    }
    
    // Check for query being contained in name
    if (name.includes(normalizedQuery)) {
      score += 40;
    }
    
    // Check for individual words in the query being in the name
    for (const word of words) {
      if (word.length > 1 && name.includes(word)) {
        score += 20;
      }
    }
    
    // Lower priority checks for location
    if (location) {
      // Exact location match
      if (location === normalizedQuery) {
        score += 30;
      }
      
      // Location starts with query
      else if (location.startsWith(normalizedQuery)) {
        score += 25;
      }
      
      // Query is contained in location
      else if (location.includes(normalizedQuery)) {
        score += 15;
      }
      
      // Words in query are in location
      for (const word of words) {
        if (word.length > 1 && location.includes(word)) {
          score += 10;
        }
      }
    }
    
    // Fuzzy matching for typo tolerance (especially valuable for longer words)
    if (score === 0 && normalizedQuery.length > 3) {
      // Try fuzzy matching for the course name
      const nameParts = name.split(/\s+/);
      
      for (const part of nameParts) {
        if (part.length > 3) { // Only consider longer words worth fuzzy matching
          const fuzzyScore = calculateFuzzyScore(normalizedQuery, part);
          
          // If it's a good fuzzy match (more than 70% similar)
          if (fuzzyScore > 70) {
            score += Math.floor(fuzzyScore / 10); // Scale down the fuzzy score
            break; // Found a good fuzzy match, no need to check others
          }
        }
      }
      
      // If still no match and we have location data, try fuzzy matching there
      if (score === 0 && location) {
        const locationParts = location.split(/[\s,]+/);
        
        for (const part of locationParts) {
          if (part.length > 3) {
            const fuzzyScore = calculateFuzzyScore(normalizedQuery, part);
            
            if (fuzzyScore > 70) {
              score += Math.floor(fuzzyScore / 20); // Lower priority than name
              break;
            }
          }
        }
      }
    }
    
    // If still no match found, check for substring match anywhere (lowest priority)
    if (score === 0 && (name.includes(normalizedQuery) || location.includes(normalizedQuery))) {
      score = 1;
    }
    
    return { 
      ...course, 
      relevanceScore: score 
    } as CourseWithRelevance;
  });
  
  // Filter out courses with no relevance
  const relevantCourses = scoredCourses.filter(item => item.relevanceScore > 0);
  
  // Sort by relevance score (highest first)
  relevantCourses.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Log search scoring for debugging
  logSearchScoring(query, relevantCourses);
  
  // Return the courses with relevance scores included
  return relevantCourses;
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