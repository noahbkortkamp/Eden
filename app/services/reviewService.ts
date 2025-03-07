import { CourseReview, Course } from '../types/review';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const reviewService = {
  /**
   * Submit a new course review
   */
  submitReview: async (review: Omit<CourseReview, 'review_id' | 'created_at' | 'updated_at'>): Promise<CourseReview> => {
    const response = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(review),
    });

    if (!response.ok) {
      throw new Error('Failed to submit review');
    }

    return response.json();
  },

  /**
   * Upload photos for a review
   */
  uploadPhotos: async (reviewId: string, photos: string[]): Promise<string[]> => {
    const formData = new FormData();
    photos.forEach((photo, index) => {
      formData.append('photos', {
        uri: photo,
        type: 'image/jpeg',
        name: `photo-${index}.jpg`,
      });
    });

    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}/photos`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload photos');
    }

    return response.json();
  },

  /**
   * Get courses for comparison in the same rating tier
   */
  getCoursesForComparison: async (rating: string): Promise<Course[]> => {
    const response = await fetch(
      `${API_BASE_URL}/reviews/comparisons?rating=${rating}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch courses for comparison');
    }

    return response.json();
  },

  /**
   * Submit a course comparison preference
   */
  submitComparison: async (
    userId: string,
    preferredCourseId: string,
    otherCourseId: string
  ): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/reviews/comparisons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        preferred_course_id: preferredCourseId,
        other_course_id: otherCourseId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit comparison');
    }
  },

  /**
   * Get a user's review history
   */
  getUserReviews: async (userId: string): Promise<CourseReview[]> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/reviews`);

    if (!response.ok) {
      throw new Error('Failed to fetch user reviews');
    }

    return response.json();
  },
}; 