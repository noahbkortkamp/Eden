import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

export async function uploadProfilePicture(userId: string, uri: string): Promise<string> {
  try {
    // First, read the file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to Uint8Array using native approach
    const binaryString = atob(base64);
    const data = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      data[i] = binaryString.charCodeAt(i);
    }

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

export async function uploadReviewPhotos(userId: string, reviewId: string, photoUris: string[]): Promise<string[]> {
  try {
    console.log('🖼️ Uploading review photos to Supabase Storage...');
    
    const uploadPromises = photoUris.map(async (uri, index) => {
      try {
        // Read the file as base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Convert base64 to Uint8Array using native approach
        const binaryString = atob(base64);
        const data = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          data[i] = binaryString.charCodeAt(i);
        }

        // Generate a unique file name using timestamp and random number (React Native compatible)
        const ext = uri.substring(uri.lastIndexOf('.') + 1) || 'jpg';
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const fileName = `${reviewId}-${index}-${timestamp}-${random}.${ext}`;
        const filePath = `public/reviews/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('review-photos')
          .upload(filePath, data, {
            contentType: `image/${ext}`,
            upsert: true,
          });

        if (uploadError) {
          console.error('Error uploading photo:', uploadError);
          throw uploadError;
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('review-photos')
          .getPublicUrl(filePath);

        console.log(`🖼️ Photo ${index + 1} uploaded successfully:`, publicUrl);
        return publicUrl;
      } catch (error) {
        console.error(`Error uploading photo ${index + 1}:`, error);
        throw error;
      }
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    console.log('🖼️ All review photos uploaded successfully:', uploadedUrls.length);
    return uploadedUrls;
  } catch (error) {
    console.error('Error uploading review photos:', error);
    throw error;
  }
} 