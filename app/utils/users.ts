import { supabase } from './supabase';

export interface UserLocation {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
}

export async function getUserLocation(userId: string): Promise<UserLocation | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('location_latitude, location_longitude, location_city, location_state, location_country')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user location:', error);
      return null;
    }

    if (!data || !data.location_latitude || !data.location_longitude) {
      return null;
    }

    return {
      latitude: data.location_latitude,
      longitude: data.location_longitude,
      city: data.location_city || '',
      state: data.location_state || '',
      country: data.location_country || '',
    };
  } catch (error) {
    console.error('Error in getUserLocation:', error);
    return null;
  }
}

export async function updateUserLocation(
  userId: string,
  location: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        location_latitude: location.latitude,
        location_longitude: location.longitude,
        location_city: location.city,
        location_state: location.state,
        location_country: location.country,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user location:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateUserLocation:', error);
    return false;
  }
} 