import { Client } from '@googlemaps/google-maps-services-js';
import { GolfCourse, LocationData } from '../types';
import { config } from '../config';

const client = new Client({});

interface PlaceDetails {
  name: string;
  formatted_address: string;
  rating?: number;
  price_level?: number;
  photos?: Array<{ photo_reference: string }>;
  website?: string;
  formatted_phone_number?: string;
  opening_hours?: {
    weekday_text: string[];
    open_now: boolean;
  };
  place_id: string;
}

interface PlaceResult {
  place_id: string;
  name: string;
}

export const placesService = {
  async searchGolfCourses(location: LocationData, radius: number = 50000): Promise<GolfCourse[]> {
    try {
      // Search for golf courses near the location
      const response = await client.placesNearby({
        params: {
          location: { lat: location.latitude, lng: location.longitude },
          radius, // 50km default radius
          keyword: 'golf course',
          key: config.GOOGLE_MAPS_API_KEY,
        },
      });

      if (response.data.status !== 'OK') {
        throw new Error('Failed to fetch golf courses');
      }

      // Get detailed information for each golf course
      const detailedCourses = await Promise.all(
        response.data.results.map(async (place) => {
          if (place.place_id) {
            const details = await this.getPlaceDetails(place.place_id);
            return this.convertToGolfCourse(place as PlaceResult, details);
          }
          throw new Error('Place ID not found');
        })
      );

      return detailedCourses;
    } catch (error) {
      console.error('Error searching golf courses:', error);
      throw error;
    }
  },

  async searchGolfCoursesByQuery(query: string, location: LocationData): Promise<GolfCourse[]> {
    try {
      const response = await client.textSearch({
        params: {
          query: `${query} golf course`,
          location: { lat: location.latitude, lng: location.longitude },
          key: config.GOOGLE_MAPS_API_KEY,
        },
      });

      if (response.data.status !== 'OK') {
        throw new Error('Failed to search golf courses');
      }

      const detailedCourses = await Promise.all(
        response.data.results.map(async (place) => {
          if (place.place_id) {
            const details = await this.getPlaceDetails(place.place_id);
            return this.convertToGolfCourse(place as PlaceResult, details);
          }
          throw new Error('Place ID not found');
        })
      );

      return detailedCourses;
    } catch (error) {
      console.error('Error searching golf courses by query:', error);
      throw error;
    }
  },

  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    try {
      const response = await client.placeDetails({
        params: {
          place_id: placeId,
          fields: [
            'name',
            'formatted_address',
            'rating',
            'price_level',
            'photos',
            'website',
            'formatted_phone_number',
            'opening_hours',
            'place_id',
          ],
          key: config.GOOGLE_MAPS_API_KEY,
        },
      });

      if (response.data.status !== 'OK') {
        throw new Error('Failed to fetch place details');
      }

      return response.data.result as PlaceDetails;
    } catch (error) {
      console.error('Error getting place details:', error);
      throw error;
    }
  },

  convertToGolfCourse(
    place: PlaceResult,
    details: PlaceDetails
  ): GolfCourse {
    // Convert price_level (0-4) to our price range format ($-$$$$)
    const priceRange = details.price_level 
      ? '$'.repeat(details.price_level + 1)
      : undefined;

    // Convert rating (0-5) to difficulty (1-5)
    // This is a rough approximation - you might want to adjust this logic
    const difficulty = details.rating 
      ? Math.round(details.rating)
      : undefined;

    return {
      id: place.place_id,
      name: place.name,
      location: details.formatted_address,
      rating: details.rating,
      difficulty,
      priceRange,
      images: details.photos?.map(photo => photo.photo_reference) || [],
      amenities: this.inferAmenities(details),
      website: details.website,
      phoneNumber: details.formatted_phone_number,
      openingHours: details.opening_hours?.weekday_text,
      isOpenNow: details.opening_hours?.open_now,
    };
  },

  inferAmenities(details: PlaceDetails): string[] {
    const amenities: string[] = [];

    if (details.website) {
      amenities.push('Online Booking');
    }
    if (details.formatted_phone_number) {
      amenities.push('Phone Booking');
    }

    return amenities;
  },
}; 