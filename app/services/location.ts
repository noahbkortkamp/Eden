import * as Location from 'expo-location';
import { LocationData } from '../types';

export const locationService = {
  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Get the address details from coordinates
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (!address) {
        throw new Error('Could not determine location address');
      }

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        city: address.city || '',
        state: address.region || '',
        country: address.country || '',
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  },

  async searchLocations(query: string): Promise<LocationData[]> {
    try {
      const locations = await Location.geocodeAsync(query);
      
      const results: LocationData[] = [];
      
      for (const location of locations) {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });

        if (address) {
          results.push({
            latitude: location.latitude,
            longitude: location.longitude,
            city: address.city || '',
            state: address.region || '',
            country: address.country || '',
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  },
}; 