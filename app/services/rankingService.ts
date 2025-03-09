import { supabase } from '../utils/supabase';
import type { Database } from '../utils/database.types';

type CourseRanking = Database['public']['Tables']['course_rankings']['Row'];
type SentimentRating = 'liked' | 'fine' | 'didnt_like';

interface ScoreRange {
  min: number;
  max: number;
}

const SENTIMENT_RANGES: Record<SentimentRating, ScoreRange> = {
  liked: { min: 7.0, max: 10.0 },
  fine: { min: 3.0, max: 6.9 },
  didnt_like: { min: 0.0, max: 2.9 }
};

class RankingService {
  private logScoreChanges(
    userId: string,
    sentiment: SentimentRating,
    oldRankings: CourseRanking[],
    newRankings: CourseRanking[]
  ): void {
    console.log(`\n[RankingService] Redistributing scores for user ${userId} in ${sentiment} category`);
    console.log(`Total rankings: ${newRankings.length}`);
    
    // Log score changes for each course
    oldRankings.forEach(oldRanking => {
      const newRanking = newRankings.find(r => r.course_id === oldRanking.course_id);
      if (newRanking && oldRanking.relative_score !== newRanking.relative_score) {
        console.log(
          `Course ${oldRanking.course_id}: ` +
          `${oldRanking.relative_score} → ${newRanking.relative_score} ` +
          `(Position: ${oldRanking.rank_position} → ${newRanking.rank_position})`
        );
      }
    });

    // Log new courses that weren't in old rankings
    newRankings
      .filter(newRank => !oldRankings.some(oldRank => oldRank.course_id === newRank.course_id))
      .forEach(newRank => {
        console.log(
          `New course ${newRank.course_id}: ` +
          `Score: ${newRank.relative_score}, Position: ${newRank.rank_position}`
        );
      });
  }

  /**
   * Validates that a score falls within the correct range for its sentiment
   * @throws Error if score is outside the valid range
   */
  private validateScore(score: number, sentiment: SentimentRating): void {
    const range = SENTIMENT_RANGES[sentiment];
    if (score < range.min || score > range.max) {
      throw new Error(
        `Invalid score ${score} for sentiment ${sentiment}. Must be between ${range.min} and ${range.max}`
      );
    }
  }

  /**
   * Ensures a score stays within the valid range for its sentiment
   */
  private clampScore(score: number, sentiment: SentimentRating): number {
    const range = SENTIMENT_RANGES[sentiment];
    return Math.min(Math.max(score, range.min), range.max);
  }

  /**
   * Get all course rankings for a user in a specific sentiment category
   */
  async getUserRankings(userId: string, sentiment: SentimentRating): Promise<CourseRanking[]> {
    const { data, error } = await supabase
      .from('course_rankings')
      .select('*')
      .eq('user_id', userId)
      .eq('sentiment_category', sentiment)
      .order('rank_position', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Redistribute scores for all courses in a sentiment category to maintain even spacing
   */
  private async redistributeScores(userId: string, sentiment: SentimentRating): Promise<void> {
    const rankings = await this.getUserRankings(userId, sentiment);
    if (rankings.length === 0) return;

    console.log(`[RankingService] Starting score redistribution for ${rankings.length} courses`);

    // Calculate new scores for all rankings
    const updates = rankings.map((ranking, index) => ({
      ...ranking,
      relative_score: this.calculateRelativeScore(index + 1, rankings.length, sentiment)
    }));

    // Log the changes
    this.logScoreChanges(userId, sentiment, rankings, updates);

    // Update all rankings in a transaction
    const { error } = await supabase.from('course_rankings').upsert(updates);
    if (error) {
      console.error('[RankingService] Error redistributing scores:', error);
      throw error;
    }

    console.log('[RankingService] Score redistribution completed successfully');
  }

  /**
   * Add a new course ranking
   */
  async addCourseRanking(
    userId: string,
    courseId: string,
    sentiment: SentimentRating,
    rankPosition: number
  ): Promise<CourseRanking> {
    console.log(`[RankingService] Adding new ranking for course ${courseId} at position ${rankPosition}`);

    // Insert new ranking
    const { data, error } = await supabase
      .from('course_rankings')
      .insert({
        user_id: userId,
        course_id: courseId,
        sentiment_category: sentiment,
        relative_score: SENTIMENT_RANGES[sentiment].max, // Temporary score
        rank_position: rankPosition
      })
      .select()
      .single();

    if (error) {
      console.error('[RankingService] Error adding new ranking:', error);
      throw error;
    }

    // Redistribute scores to maintain even spacing
    await this.redistributeScores(userId, sentiment);
    
    // Fetch and return the updated ranking
    const { data: updatedData, error: fetchError } = await supabase
      .from('course_rankings')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();
    
    if (fetchError) {
      console.error('[RankingService] Error fetching updated ranking:', fetchError);
      throw fetchError;
    }

    console.log(`[RankingService] Successfully added and scored new ranking for course ${courseId}`);
    return updatedData;
  }

  /**
   * Update rankings after a comparison
   */
  async updateRankingsAfterComparison(
    userId: string,
    preferredCourseId: string,
    otherCourseId: string,
    sentiment: SentimentRating
  ): Promise<void> {
    console.log(
      `[RankingService] Updating rankings after comparison: ` +
      `${preferredCourseId} preferred over ${otherCourseId}`
    );

    const rankings = await this.getUserRankings(userId, sentiment);
    const preferredCourse = rankings.find(r => r.course_id === preferredCourseId);
    const otherCourse = rankings.find(r => r.course_id === otherCourseId);

    if (!preferredCourse || !otherCourse) {
      console.error('[RankingService] One or both courses not found in rankings');
      throw new Error('One or both courses not found in rankings');
    }

    // If preferred course should be ranked higher, swap positions
    if (preferredCourse.rank_position > otherCourse.rank_position) {
      console.log(
        `[RankingService] Swapping positions: ` +
        `${preferredCourseId}(${preferredCourse.rank_position}) ↔ ` +
        `${otherCourseId}(${otherCourse.rank_position})`
      );

      // Update rank positions
      const updates = rankings.map(ranking => {
        if (ranking.course_id === preferredCourseId) {
          return { ...ranking, rank_position: otherCourse.rank_position };
        }
        if (ranking.course_id === otherCourseId) {
          return { ...ranking, rank_position: preferredCourse.rank_position };
        }
        return ranking;
      });

      // Update positions first
      const { error } = await supabase.from('course_rankings').upsert(updates);
      if (error) {
        console.error('[RankingService] Error updating positions:', error);
        throw error;
      }

      // Then redistribute scores
      await this.redistributeScores(userId, sentiment);
    } else {
      console.log(
        `[RankingService] No position swap needed: ` +
        `${preferredCourseId} already ranked higher than ${otherCourseId}`
      );
    }
  }

  /**
   * Calculate relative score based on rank position and sentiment
   * Scores are distributed within sentiment-specific ranges:
   * - Liked: 7.0 - 10.0
   * - Fine: 3.0 - 6.9
   * - Didn't Like: 0.0 - 2.9
   */
  private calculateRelativeScore(position: number, totalRankings: number, sentiment: SentimentRating): number {
    const range = SENTIMENT_RANGES[sentiment];
    
    // If there's only one course or it's the top-ranked course
    if (totalRankings === 1 || position === 1) {
      return range.max;
    }

    // Calculate score with linear distribution within the sentiment range
    const scoreRange = range.max - range.min;
    const step = scoreRange / (totalRankings - 1);
    const score = range.max - ((position - 1) * step);
    
    // Round to one decimal place and ensure it stays within range
    const roundedScore = Math.round(score * 10) / 10;
    const clampedScore = this.clampScore(roundedScore, sentiment);
    
    // Validate the final score
    this.validateScore(clampedScore, sentiment);
    
    return clampedScore;
  }

  /**
   * Find the appropriate rank position for a new course using binary search
   */
  async findRankPosition(
    userId: string,
    courseId: string,
    sentiment: SentimentRating,
    comparisonResults: Array<{ preferredId: string, otherId: string }>
  ): Promise<number> {
    const rankings = await this.getUserRankings(userId, sentiment);
    
    if (rankings.length === 0) return 1;

    // Create a sorted list of course IDs based on comparison results
    const sortedCourses = this.getSortedCourses(rankings.map(r => r.course_id), comparisonResults);
    
    // Find the position where the new course should be inserted
    const position = sortedCourses.findIndex(id => id === courseId);
    return position === -1 ? rankings.length + 1 : position + 1;
  }

  /**
   * Sort courses based on comparison results using topological sort
   */
  private getSortedCourses(
    existingCourses: string[],
    comparisons: Array<{ preferredId: string, otherId: string }>
  ): string[] {
    // Create adjacency list for graph
    const graph = new Map<string, Set<string>>();
    existingCourses.forEach(id => {
      graph.set(id, new Set());
    });

    // Add edges based on comparisons
    comparisons.forEach(({ preferredId, otherId }) => {
      const edges = graph.get(preferredId) || new Set();
      edges.add(otherId);
      graph.set(preferredId, edges);
    });

    // Perform topological sort
    const visited = new Set<string>();
    const sorted: string[] = [];

    function visit(courseId: string) {
      if (visited.has(courseId)) return;
      visited.add(courseId);
      
      const edges = graph.get(courseId) || new Set();
      edges.forEach(otherId => {
        if (!visited.has(otherId)) {
          visit(otherId);
        }
      });
      
      sorted.unshift(courseId);
    }

    existingCourses.forEach(courseId => {
      if (!visited.has(courseId)) {
        visit(courseId);
      }
    });

    return sorted;
  }
}

// Export a singleton instance
export const rankingService = new RankingService(); 