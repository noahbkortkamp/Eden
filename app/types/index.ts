/**
 * Represents a golf course in the system
 */
export interface GolfCourse {
  /** Unique identifier for the golf course */
  id: string;
  /** Name of the golf course */
  name: string;
  /** Physical location of the golf course */
  location: string;
  /** Difficulty level on a scale of 1-5 */
  difficulty?: number;
  /** User rating on a scale of 1-5 */
  rating?: number;
  /** Number of holes at the course */
  numberOfHoles?: number;
  /** Price range indicator ($, $$, $$$, $$$$) */
  priceRange?: string;
  /** Available amenities at the course */
  amenities?: string[];
  /** URLs of course images */
  images?: string[];
  /** Course website URL */
  website?: string;
  /** Contact phone number */
  phoneNumber?: string;
  /** Opening hours for each day of the week */
  openingHours?: string[];
  /** Whether the course is currently open */
  isOpenNow?: boolean;
}

/**
 * Represents a user in the system
 */
export interface User {
  /** Unique identifier for the user */
  id: string;
  /** User's username */
  username: string;
  /** User's full name */
  name: string;
  /** User's location */
  location?: string;
  /** User's golf handicap */
  handicap?: number;
  /** IDs of user's favorite courses */
  favoriteCoursesIds?: string[];
  /** Number of followers */
  followersCount?: number;
  /** Number of users being followed */
  followingCount?: number;
  /** URL of user's profile image */
  profileImage?: string;
  /** Number of reviews the user has posted */
  review_count?: number;
  /** Raw properties from database */
  full_name?: string;
  avatar_url?: string;
}

/**
 * Represents search filters for golf courses
 */
export interface SearchFilters {
  /** Array of difficulty levels to filter by */
  difficulty?: number[];
  /** Array of price ranges to filter by */
  priceRange?: string[];
  /** Array of number of holes to filter by */
  numberOfHoles?: number[];
  /** Array of amenities to filter by */
  amenities?: string[];
  /** Maximum distance in miles */
  distance?: number;
}

/**
 * Represents geographical location data
 */
export interface LocationData {
  /** Latitude coordinate */
  latitude: number;
  /** Longitude coordinate */
  longitude: number;
  /** City name */
  city: string;
  /** State/province name */
  state: string;
  /** Country name */
  country: string;
}

export interface Course {
  id: string;
  name: string;
  location: string;
  par: number;
  yardage: number;
  price_level: number;
  type: 'public' | 'private' | 'resort' | 'semi-private';
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
} 