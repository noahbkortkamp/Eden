import { supabaseMock, mockCourses, mockRankings } from '../../__mocks__/supabase';
import { rankingService } from '../rankingService';

// Mock the supabase module to use our mock implementation
jest.mock('../../utils/supabase', () => ({
  supabase: supabaseMock,
}));

describe('Ranking Service', () => {
  const userId = 'user123';
  
  beforeEach(() => {
    // Reset all mocks before each test
    supabaseMock.resetMockData();
    jest.clearAllMocks();
  });

  describe('getUserRankings', () => {
    it('should return user rankings for the specified sentiment', async () => {
      // Act
      const rankings = await rankingService.getUserRankings(userId, 'liked');

      // Assert
      expect(rankings).toHaveLength(2); // Two 'liked' rankings in our mock data
      expect(rankings[0].sentiment_category).toBe('liked');
      expect(rankings[1].sentiment_category).toBe('liked');
    });

    it('should handle errors when fetching rankings', async () => {
      // Arrange
      supabaseMock.setNextQueryToFail('Failed to fetch rankings');

      // Act & Assert
      await expect(rankingService.getUserRankings(userId, 'liked')).rejects.toThrow();
    });
  });

  describe('addCourseRanking', () => {
    it('should add a new course ranking', async () => {
      // Arrange
      const courseId = 'new-course-id';
      const sentiment = 'liked';
      const position = 3;

      // Act
      await rankingService.addCourseRanking(userId, courseId, sentiment, position);

      // Assert
      const rankings = await rankingService.getUserRankings(userId, sentiment);
      expect(rankings).toHaveLength(3); // Original 2 + new one
      expect(rankings.some(r => r.course_id === courseId)).toBe(true);
    });
  });

  describe('updateRankingsAfterComparison', () => {
    it('should swap positions when preferred course is ranked lower', async () => {
      // Arrange
      const preferredCourseId = 'course2'; // Rank 2
      const otherCourseId = 'course1';     // Rank 1
      const sentiment = 'liked';

      // Get initial positions
      const initialRankings = await rankingService.getUserRankings(userId, sentiment);
      const initialPreferredPosition = initialRankings.find(r => r.course_id === preferredCourseId)?.rank_position;
      const initialOtherPosition = initialRankings.find(r => r.course_id === otherCourseId)?.rank_position;

      // Act
      await rankingService.updateRankingsAfterComparison(
        userId,
        preferredCourseId,
        otherCourseId,
        sentiment
      );

      // Assert
      const updatedRankings = await rankingService.getUserRankings(userId, sentiment);
      const updatedPreferredPosition = updatedRankings.find(r => r.course_id === preferredCourseId)?.rank_position;
      const updatedOtherPosition = updatedRankings.find(r => r.course_id === otherCourseId)?.rank_position;

      // Check that positions have been swapped
      expect(updatedPreferredPosition).toBe(initialOtherPosition);
      expect(updatedOtherPosition).toBe(initialPreferredPosition);
    });

    it('should not swap positions when preferred course is already ranked higher', async () => {
      // Arrange
      const preferredCourseId = 'course1'; // Rank 1
      const otherCourseId = 'course2';     // Rank 2
      const sentiment = 'liked';

      // Get initial positions
      const initialRankings = await rankingService.getUserRankings(userId, sentiment);
      const initialPreferredPosition = initialRankings.find(r => r.course_id === preferredCourseId)?.rank_position;
      const initialOtherPosition = initialRankings.find(r => r.course_id === otherCourseId)?.rank_position;

      // Act
      await rankingService.updateRankingsAfterComparison(
        userId,
        preferredCourseId,
        otherCourseId,
        sentiment
      );

      // Assert
      const updatedRankings = await rankingService.getUserRankings(userId, sentiment);
      const updatedPreferredPosition = updatedRankings.find(r => r.course_id === preferredCourseId)?.rank_position;
      const updatedOtherPosition = updatedRankings.find(r => r.course_id === otherCourseId)?.rank_position;

      // Check that positions remain the same
      expect(updatedPreferredPosition).toBe(initialPreferredPosition);
      expect(updatedOtherPosition).toBe(initialOtherPosition);
    });

    it('should handle errors during ranking update', async () => {
      // Arrange
      supabaseMock.setNextQueryToFail('Failed to update rankings');
      const preferredCourseId = 'course1';
      const otherCourseId = 'course2';
      const sentiment = 'liked';

      // Act & Assert
      await expect(
        rankingService.updateRankingsAfterComparison(userId, preferredCourseId, otherCourseId, sentiment)
      ).rejects.toThrow();
    });
  });

  describe('findRankPosition', () => {
    it('should determine the correct rank position for a new course based on comparisons', async () => {
      // Arrange
      const courseId = 'new-course-id';
      const sentiment = 'liked';
      const comparisonResults = [
        { preferredId: courseId, otherId: 'course2' },    // New course is preferred over course2
        { preferredId: 'course1', otherId: courseId },    // course1 is preferred over new course
      ];

      // Act
      const position = await rankingService.findRankPosition(
        userId,
        courseId,
        sentiment,
        comparisonResults
      );

      // Assert
      // Since course1 is better than new course, and new course is better than course2,
      // the new course should be in position 2
      expect(position).toBe(2);
    });

    it('should return the last position if no comparisons are available', async () => {
      // Arrange
      const courseId = 'new-course-id';
      const sentiment = 'liked';
      const comparisonResults: Array<{ preferredId: string, otherId: string }> = [];

      // Act
      const position = await rankingService.findRankPosition(
        userId,
        courseId,
        sentiment,
        comparisonResults
      );

      // Assert
      // With no comparisons, the new course should be placed at the end
      expect(position).toBe(3); // 2 existing + 1
    });
  });

  describe('redistributeScores', () => {
    it('should adjust scores based on rank positions', async () => {
      // Act
      await rankingService.redistributeScores(userId, 'liked');

      // Assert
      const rankings = await rankingService.getUserRankings(userId, 'liked');
      
      // Rankings should be sorted by position
      rankings.sort((a, b) => a.rank_position - b.rank_position);
      
      // First position should have a higher score than second position
      expect(rankings[0].score).toBeGreaterThan(rankings[1].score);
      
      // Scores should be within the sentiment range (7.0 - 10.0 for 'liked')
      expect(rankings[0].score).toBeGreaterThanOrEqual(7.0);
      expect(rankings[0].score).toBeLessThanOrEqual(10.0);
      expect(rankings[1].score).toBeGreaterThanOrEqual(7.0);
      expect(rankings[1].score).toBeLessThanOrEqual(10.0);
    });
  });
}); 