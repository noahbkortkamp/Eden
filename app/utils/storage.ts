import { supabase } from './supabase';
import { decode } from 'base64-js';
import * as FileSystem from 'expo-file-system';

export async function uploadProfilePicture(userId: string, uri: string): Promise<string> {
  try {
    // First, read the file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to Uint8Array
    const data = decode(base64);

    // Generate a unique file name
    const ext = uri.substring(uri.lastIndexOf('.') + 1);
    const fileName = `${userId}-${Date.now()}.${ext}`;
    const filePath = `public/avatars/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, data, {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
} 