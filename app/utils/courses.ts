import { supabase } from './supabase';
import { Database } from './database.types';

type Course = Database['public']['Tables']['courses']['Row'];

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache
const courseCache = new Map<string, { data: Course; timestamp: number }>();
// Add a search cache to avoid redundant searches
const searchCache = new Map<string, { results: CourseWithRelevance[]; timestamp: number }>();

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
  // Check if all courses are already in memory cache and not expired
  const allCoursesKey = '__all_courses__';
  const cached = courseCache.get(allCoursesKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached data for all courses');
    return cached.data as unknown as Course[];
  }

  console.log('Fetching all courses from database');
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  
  // Cache the result
  if (data) {
    courseCache.set(allCoursesKey, { 
      data: data as unknown as Course, 
      timestamp: Date.now() 
    });
  }
  
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
    const courses = await getAllCourses();
    return courses.map(course => ({ ...course, relevanceScore: 100 }));
  }
  
  // Normalize the query (lowercase, trim)
  const normalizedQuery = query.toLowerCase().trim();
  
  // Check cache for this exact search query
  const cacheKey = `search:${normalizedQuery}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached search results for: "${normalizedQuery}"`);
    return cached.results;
  }
  
  console.log(`Performing search for: "${normalizedQuery}"`);
  
  // Get all courses to perform client-side filtering for more control
  const courses = await getAllCourses();
  
  if (!courses || courses.length === 0) {
    return [];
  }
  
  // Split query into words for better matching
  const words = normalizedQuery.split(/\s+/);
  
  // Use a worker or process in batches for large datasets
  const batchSize = 100;
  const batches = Math.ceil(courses.length / batchSize);
  let scoredCourses: CourseWithRelevance[] = [];
  
  // Process courses in batches to avoid blocking the main thread
  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min((i + 1) * batchSize, courses.length);
    const batchCourses = courses.slice(start, end);
    
    // Calculate relevance score for each course in this batch
    const batchResults = batchCourses.map(course => {
      const name = course.name.toLowerCase();
      const location = (course.location || '').toLowerCase();
      
      let score = 0;
      
      // Quick exact match check first (short-circuit for performance)
      if (name === normalizedQuery) {
        return { ...course, relevanceScore: 100 };
      }
      
      // Check for name starting with query (high priority)
      if (name.startsWith(normalizedQuery)) {
        score += 80;
      }
      
      // Check for words in query starting words in name
      let nameWordMatches = 0;
      const nameWords = name.split(/\s+/);
      
      for (const word of words) {
        if (word.length < 2) continue; // Skip single letter words
        
        for (const nameWord of nameWords) {
          if (nameWord.startsWith(word)) {
            nameWordMatches++;
            break;
          }
        }
      }
      
      // Reward matching all search terms
      if (nameWordMatches === words.length && words.length > 0) {
        score += 70;
      } else if (nameWordMatches > 0) {
        // Partial matches get proportional scores
        score += 40 * (nameWordMatches / words.length);
      }
      
      // Check for query being contained in name
      if (name.includes(normalizedQuery)) {
        score += 40;
      }
      
      // Check for individual words in the query being in the name
      for (const word of words) {
        if (word.length > 1 && name.includes(word)) {
          score += 15;
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
      
      // Fuzzy matching for typo tolerance - only if we haven't found a good match
      if (score < 20 && normalizedQuery.length > 3) {
        // Use a lighter fuzzy matching for better performance
        const nameParts = name.split(/\s+/);
        
        // Only check first few words for performance
        for (let i = 0; i < Math.min(nameParts.length, 3); i++) {
          const part = nameParts[i];
          if (part.length > 3) {
            const fuzzyScore = calculateFuzzyScore(normalizedQuery, part);
            
            if (fuzzyScore > 70) {
              score += Math.floor(fuzzyScore / 10);
              break;
            }
          }
        }
        
        // If still no match, check location, but only if we need to
        if (score < 10 && location) {
          const locationParts = location.split(/[\s,]+/);
          
          // Only check first few words for performance
          for (let i = 0; i < Math.min(locationParts.length, 2); i++) {
            const part = locationParts[i];
            if (part.length > 3) {
              const fuzzyScore = calculateFuzzyScore(normalizedQuery, part);
              
              if (fuzzyScore > 70) {
                score += Math.floor(fuzzyScore / 20);
                break;
              }
            }
          }
        }
      }
      
      return {
        ...course,
        relevanceScore: Math.max(score, 1) // Ensure at least a minimal score
      };
    });
    
    scoredCourses = scoredCourses.concat(batchResults);
  }
  
  // Sort by relevance score
  scoredCourses.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Filter out zero scores
  const filteredResults = scoredCourses.filter(course => course.relevanceScore > 5);
  
  // Cache the results
  searchCache.set(cacheKey, {
    results: filteredResults,
    timestamp: Date.now()
  });
  
  // Prevent caching too many searches
  if (searchCache.size > 30) {
    // Remove oldest cache entries
    const keysToDelete = Array.from(searchCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 10)
      .map(entry => entry[0]);
      
    keysToDelete.forEach(key => searchCache.delete(key));
  }
  
  return filteredResults;
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