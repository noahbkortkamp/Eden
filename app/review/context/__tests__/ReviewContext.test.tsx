import React from 'react';
import { render, act, renderHook } from '@testing-library/react-native';
import { ReviewProvider, useReview } from '../ReviewContext';
import { supabaseMock, mockCourses } from '../../../__mocks__/supabase';
import { format } from 'date-fns';

// Mock the modules used by ReviewContext
jest.mock('../../../utils/supabase', () => ({
  supabase: supabaseMock,
}));

jest.mock('../../../utils/reviews', () => ({
  createReview: jest.fn().mockImplementation((userId, courseId, rating, notes, favoriteHoles, photos, datePlayed, tags) => {
    return Promise.resolve({
      id: 'new-review-id',
      user_id: userId,
      course_id: courseId,
      rating,
      notes,
      favorite_holes: favoriteHoles,
      photos,
      date_played: datePlayed,
      tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }),
  getReviewsForUser: jest.fn().mockResolvedValue([
    {
      review_id: 'review1',
      user_id: 'user123',
      course_id: 'course1',
      rating: 'liked',
      date_played: '2023-01-01',
      created_at: '2023-01-02',
    },
    {
      review_id: 'review2',
      user_id: 'user123',
      course_id: 'course2',
      rating: 'liked',
      date_played: '2023-02-01',
      created_at: '2023-02-02',
    },
  ]),
  getAllTags: jest.fn().mockResolvedValue([
    { id: 1, name: 'scenic', category: 'course_features' },
    { id: 2, name: 'challenging', category: 'difficulty' },
  ]),
}));

jest.mock('../../../services/reviewService', () => ({
  reviewService: {
    getReviewedCourses: jest.fn().mockResolvedValue([
      { id: 'course1', name: 'Course 1' },
      { id: 'course2', name: 'Course 2' },
    ]),
  },
}));

jest.mock('../../../services/rankingService', () => ({
  rankingService: {
    getUserRankings: jest.fn().mockResolvedValue([
      { 
        id: 'ranking1', 
        user_id: 'user123', 
        course_id: 'course1', 
        sentiment_category: 'liked',
        rank_position: 1,
        score: 9.5,
      },
      { 
        id: 'ranking2', 
        user_id: 'user123', 
        course_id: 'course2', 
        sentiment_category: 'liked',
        rank_position: 2,
        score: 8.7,
      },
    ]),
    addCourseRanking: jest.fn().mockResolvedValue(undefined),
    updateRankingsAfterComparison: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock the router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({
    courseId: 'course3',
  }),
}));

// Mock AuthContext
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'user123', email: 'test@example.com' } },
    loading: false,
  }),
}));

describe('ReviewContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide review context to children', () => {
    // Arrange & Act
    const { result } = renderHook(() => useReview(), {
      wrapper: ({ children }) => <ReviewProvider>{children}</ReviewProvider>,
    });

    // Assert
    expect(result.current).toBeDefined();
    expect(result.current.submitReview).toBeDefined();
    expect(result.current.startComparisons).toBeDefined();
    expect(result.current.handleComparison).toBeDefined();
    expect(result.current.skipComparison).toBeDefined();
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should submit a review successfully', async () => {
    // Arrange
    const { result } = renderHook(() => useReview(), {
      wrapper: ({ children }) => <ReviewProvider>{children}</ReviewProvider>,
    });

    const mockReview = {
      course_id: 'course3',
      rating: 'liked',
      notes: 'Great course',
      favorite_holes: [3, 7, 16],
      photos: ['photo1.jpg', 'photo2.jpg'],
      date_played: new Date('2023-05-15'),
      tags: ['scenic', 'challenging'],
    };

    // Act
    await act(async () => {
      await result.current.submitReview(mockReview);
    });

    // Get the mocked functions from the modules
    const { createReview } = require('../../../utils/reviews');
    const { rankingService } = require('../../../services/rankingService');

    // Assert
    expect(createReview).toHaveBeenCalledWith(
      'user123',
      'course3',
      'liked',
      'Great course',
      [3, 7, 16],
      ['photo1.jpg', 'photo2.jpg'],
      expect.any(String), // ISO date string
      ['scenic', 'challenging']
    );

    // Check that ranking was added
    expect(rankingService.addCourseRanking).toHaveBeenCalledWith(
      'user123',
      'course3',
      'liked',
      expect.any(Number)
    );
  });

  it('should start comparisons for a matching sentiment', async () => {
    // Arrange
    const { result } = renderHook(() => useReview(), {
      wrapper: ({ children }) => <ReviewProvider>{children}</ReviewProvider>,
    });

    // Act
    await act(async () => {
      await result.current.startComparisons('liked');
    });

    // Assert - since this is mostly UI flow, we just make sure it doesn't throw
    expect(result.current.error).toBeNull();
  });

  it('should handle comparison between two courses', async () => {
    // Arrange
    const { result } = renderHook(() => useReview(), {
      wrapper: ({ children }) => <ReviewProvider>{children}</ReviewProvider>,
    });

    const preferredCourseId = 'course1';
    const otherCourseId = 'course2';

    // First start comparisons to set up the state
    await act(async () => {
      await result.current.startComparisons('liked');
    });

    // Act
    await act(async () => {
      await result.current.handleComparison(preferredCourseId, otherCourseId);
    });

    // Get the mocked function from the module
    const { rankingService } = require('../../../services/rankingService');

    // Assert
    expect(rankingService.updateRankingsAfterComparison).toHaveBeenCalledWith(
      'user123',
      preferredCourseId,
      otherCourseId,
      'liked'
    );
  });

  it('should skip a comparison between two courses', async () => {
    // Arrange
    const { result } = renderHook(() => useReview(), {
      wrapper: ({ children }) => <ReviewProvider>{children}</ReviewProvider>,
    });

    const courseAId = 'course1';
    const courseBId = 'course2';

    // First start comparisons to set up the state
    await act(async () => {
      await result.current.startComparisons('liked');
    });

    // Act
    act(() => {
      result.current.skipComparison(courseAId, courseBId);
    });

    // Assert - this is mostly a UI flow function, so we just ensure it doesn't throw
    expect(result.current.error).toBeNull();
  });

  it('should handle errors during review submission', async () => {
    // Arrange
    const { createReview } = require('../../../utils/reviews');
    createReview.mockRejectedValueOnce(new Error('Failed to create review'));

    const { result } = renderHook(() => useReview(), {
      wrapper: ({ children }) => <ReviewProvider>{children}</ReviewProvider>,
    });

    const mockReview = {
      course_id: 'course3',
      rating: 'liked',
      notes: 'Great course',
      favorite_holes: [3, 7, 16],
      photos: ['photo1.jpg', 'photo2.jpg'],
      date_played: new Date('2023-05-15'),
      tags: ['scenic', 'challenging'],
    };

    // Act
    await act(async () => {
      try {
        await result.current.submitReview(mockReview);
      } catch (e) {
        // Expected error
      }
    });

    // Assert
    expect(result.current.error).toBe('Failed to create review');
    expect(result.current.isSubmitting).toBe(false);
  });
}); 