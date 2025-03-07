import { GolfCourse, User, SearchFilters, LocationData } from '../types';
import { placesService } from './places';

const BASE_URL = 'https://api.yourgolfapp.com'; // Replace with your actual API URL

interface SearchCoursesParams {
  query: string;
  filters?: SearchFilters;
  location?: LocationData | null;
  limit?: number;
}

interface SearchUsersParams {
  query: string;
  limit?: number;
}

export const api = {
  searchCourses: async ({ query, filters, location, limit = 20 }: SearchCoursesParams): Promise<GolfCourse[]> => {
    try {
      if (!location) {
        throw new Error('Location is required to search for golf courses');
      }

      // Get courses from Google Places API
      const courses = query
        ? await placesService.searchGolfCoursesByQuery(query, location)
        : await placesService.searchGolfCourses(location);

      // Apply filters
      return courses.filter(course => {
        if (!filters) return true;
        
        let matches = true;
        
        if (filters.difficulty?.length) {
          matches = matches && !!course.difficulty && filters.difficulty.includes(course.difficulty);
        }
        
        if (filters.numberOfHoles?.length && course.numberOfHoles) {
          matches = matches && filters.numberOfHoles.includes(course.numberOfHoles);
        }
        
        if (filters.priceRange?.length && course.priceRange) {
          matches = matches && filters.priceRange.includes(course.priceRange);
        }
        
        if (filters.amenities?.length && course.amenities) {
          matches = matches && filters.amenities.every(amenity => 
            course.amenities?.includes(amenity)
          );
        }
        
        return matches;
      }).slice(0, limit);
    } catch (error) {
      console.error('Error searching courses:', error);
      throw error;
    }
  },

  searchUsers: async ({ query, limit = 20 }: SearchUsersParams): Promise<User[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return [
      {
        id: '1',
        username: 'golfpro',
        name: 'John Smith',
        location: 'Boston, MA',
        handicap: 2,
        followersCount: 1200,
        followingCount: 450,
        profileImage: 'profile1.jpg',
      },
      {
        id: '2',
        username: 'golfenthusiast',
        name: 'Sarah Johnson',
        location: 'Cambridge, MA',
        handicap: 8,
        followersCount: 800,
        followingCount: 600,
        profileImage: 'profile2.jpg',
      },
    ].filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase()) ||
      user.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit);
  },

  // When implementing real API, you would replace these functions with actual API calls:
  /*
  searchCourses: async ({ query, filters, location, limit = 20 }: SearchCoursesParams): Promise<GolfCourse[]> => {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      ...(location && {
        lat: location.latitude.toString(),
        lng: location.longitude.toString(),
      }),
      ...(filters && {
        filters: JSON.stringify(filters),
      }),
    });

    const response = await fetch(`${BASE_URL}/courses/search?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch courses');
    }
    return response.json();
  },

  searchUsers: async ({ query, limit = 20 }: SearchUsersParams): Promise<User[]> => {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    const response = await fetch(`${BASE_URL}/users/search?${params}`);
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return response.json();
  },
  */
}; 