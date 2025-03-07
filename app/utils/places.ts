import { Platform } from 'react-native';

// Types for Google Places API responses
interface PlaceResult {
  name: string;
  place_id: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
    html_attributions: string[];
  }>;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  website?: string;
  phone_number?: string;
  types: string[];
}

interface PlacesSearchResponse {
  results: PlaceResult[];
  status: string;
  next_page_token?: string;
}

interface PlaceDetailsResponse {
  result: PlaceResult & {
    formatted_address: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    opening_hours?: {
      open_now: boolean;
      weekday_text: string[];
    };
    website?: string;
    photos?: Array<{
      photo_reference: string;
      height: number;
      width: number;
      html_attributions: string[];
    }>;
  };
  status: string;
}

// Replace with your actual API key
const GOOGLE_PLACES_API_KEY = 'AIzaSyCdD7MzevlTze42qvWVCRrlx52TloKf364';

// Base URL for Google Places API
const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// Helper function to get photo URL
export const getPhotoUrl = (photoReference: string, maxWidth: number = 400): string => {
  return `${BASE_URL}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
};

// Search for golf courses
export const searchGolfCourses = async (
  query: string,
  location?: { lat: number; lng: number },
  radius: number = 50000 // 50km radius
): Promise<PlaceResult[]> => {
  try {
    let url = `${BASE_URL}/textsearch/json?query=golf+course+${encodeURIComponent(query)}&type=golf_course&key=${GOOGLE_PLACES_API_KEY}`;
    
    if (location) {
      url += `&location=${location.lat},${location.lng}&radius=${radius}`;
    }

    const response = await fetch(url);
    const data: PlacesSearchResponse = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Places API error: ${data.status}`);
    }

    return data.results;
  } catch (error) {
    console.error('Error searching golf courses:', error);
    throw error;
  }
};

// Get detailed information about a specific course
export const getCourseDetails = async (placeId: string): Promise<PlaceDetailsResponse['result']> => {
  try {
    const url = `${BASE_URL}/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,international_phone_number,opening_hours,website,photos,rating,user_ratings_total,geometry&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(url);
    const data: PlaceDetailsResponse = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Places API error: ${data.status}`);
    }

    return data.result;
  } catch (error) {
    console.error('Error getting course details:', error);
    throw error;
  }
};

// Get nearby golf courses
export const getNearbyCourses = async (
  location: { lat: number; lng: number },
  radius: number = 50000
): Promise<PlaceResult[]> => {
  try {
    const url = `${BASE_URL}/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&type=golf_course&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(url);
    const data: PlacesSearchResponse = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Places API error: ${data.status}`);
    }

    return data.results;
  } catch (error) {
    console.error('Error getting nearby courses:', error);
    throw error;
  }
};

// Format course data for our app
export const formatCourseData = (place: PlaceResult) => {
  return {
    id: place.place_id,
    name: place.name,
    location: place.vicinity,
    coordinates: {
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
    },
    rating: place.rating || 0,
    totalRatings: place.user_ratings_total || 0,
    photos: place.photos?.map(photo => getPhotoUrl(photo.photo_reference)) || [],
    isOpen: place.opening_hours?.open_now,
    website: place.website,
    phone: place.phone_number,
  };
}; 