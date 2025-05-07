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
    
    // Sort old and new rankings by position for better comparison
    const sortedOldRankings = [...oldRankings].sort((a, b) => a.rank_position - b.rank_position);
    const sortedNewRankings = [...newRankings].sort((a, b) => a.rank_position - b.rank_position);
    
    console.log('\n[RankingService] Score changes summary:');
    console.log('Position | Course ID | Old Score → New Score');
    console.log('---------|-----------|-------------------');
    
    // Log score changes for each course in position order
    sortedNewRankings.forEach(newRanking => {
      const oldRanking = sortedOldRankings.find(r => r.course_id === newRanking.course_id);
      
      if (oldRanking) {
        const scoreChanged = oldRanking.relative_score !== newRanking.relative_score;
        const positionChanged = oldRanking.rank_position !== newRanking.rank_position;
        
        // Only display changes
        if (scoreChanged || positionChanged) {
          const positionInfo = positionChanged 
            ? `${oldRanking.rank_position} → ${newRanking.rank_position}` 
            : `${newRanking.rank_position}`;
            
          console.log(
            `${positionInfo.padEnd(9)} | ` +
            `${newRanking.course_id.substring(0, 8)}... | ` +
            `${oldRanking.relative_score} → ${newRanking.relative_score} ` +
            `${scoreChanged ? '(changed)' : ''}`
          );
        }
      } else {
        // New courses that weren't in old rankings
        console.log(
          `${newRanking.rank_position.toString().padEnd(9)} | ` +
          `${newRanking.course_id.substring(0, 8)}... | ` +
          `NEW: ${newRanking.relative_score}`
        );
      }
    });
    
    console.log('\n');
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
    console.log(`[RankingService] Getting rankings for user ${userId} in ${sentiment} category`);
    
    const { data, error } = await supabase
      .from('course_rankings')
      .select('*')
      .eq('user_id', userId)
      .eq('sentiment_category', sentiment)
      .order('rank_position', { ascending: true });

    if (error) {
      console.error(`[RankingService] Error fetching rankings: ${error.message}`);
      throw error;
    }
    
    console.log(`[RankingService] Found ${data?.length || 0} rankings`);
    
    // Log the top 3 rankings for debugging
    if (data && data.length > 0) {
      console.log(`[RankingService] Top 3 rankings:`);
      data.slice(0, 3).forEach(ranking => {
        console.log(`  Position ${ranking.rank_position}: Course ${ranking.course_id.substring(0, 8)}, Score: ${ranking.relative_score.toFixed(1)}`);
      });
    }
    
    return data || [];
  }

  /**
   * Redistribute scores for all courses in a sentiment category to maintain even spacing
   */
  private async redistributeScores(userId: string, sentiment: SentimentRating): Promise<void> {
    const rankings = await this.getUserRankings(userId, sentiment);
    if (rankings.length === 0) return;

    console.log(`[RankingService][FIXED] Starting score redistribution for ${rankings.length} courses`);
    
    // ROBUST APPROACH: First, ensure all positions are sequential and valid
    let sortedRankings = [...rankings].sort((a, b) => a.rank_position - b.rank_position);
    
    // Check for invalid positions
    const expectedPositions = Array.from({ length: rankings.length }, (_, i) => i + 1);
    const actualPositions = sortedRankings.map(r => r.rank_position);
    const hasInvalidPositions = !expectedPositions.every((pos, idx) => actualPositions[idx] === pos);
    
    if (hasInvalidPositions) {
      console.error(`[RankingService][FIXED] ⚠️ CRITICAL: Found invalid positions. Fixing...`);
      console.log(`  Expected: ${expectedPositions.join(', ')}`);
      console.log(`  Actual: ${actualPositions.join(', ')}`);
      
      // Fix positions by reassigning sequentially
      sortedRankings = sortedRankings.map((ranking, idx) => ({
        ...ranking,
        rank_position: idx + 1
      }));
      
      // Update the fixed positions in the database first
      const { error } = await supabase.from('course_rankings').upsert(sortedRankings);
      if (error) {
        console.error('[RankingService][FIXED] Error fixing positions:', error);
        throw error;
      }
      
      console.log(`[RankingService][FIXED] ✅ Positions fixed successfully`);
    }
    
    // Log the order we'll use for score calculation
    console.log('[RankingService][FIXED] Rankings order for score calculation:');
    sortedRankings.forEach((ranking, idx) => {
      console.log(`  ${idx + 1}. Course ${ranking.course_id.substring(0, 8)}: Position ${ranking.rank_position}`);
    });

    // Calculate new scores - ensuring top course always has max score and enforce strict descending order
    const updates = [];
    const range = SENTIMENT_RANGES[sentiment];
    const maxScore = range.max;
    const minScore = range.min;
    const scoreRange = maxScore - minScore;
    
    // If there's only one course, it gets the max score
    if (sortedRankings.length === 1) {
      updates.push({
        ...sortedRankings[0],
        relative_score: maxScore
      });
    } else {
      // For multiple courses, first assign the max score to position 1
      // Then distribute remaining scores, ensuring they strictly decrease with position
      let prevScore = maxScore;
      
      for (let i = 0; i < sortedRankings.length; i++) {
        const ranking = sortedRankings[i];
        let newScore: number;
        
        if (i === 0) {
          // Top course always gets max score
          newScore = maxScore;
          console.log(`[RankingService][FIXED] 🔝 Position 1 (course ${ranking.course_id.substring(0, 8)}) gets max score: ${newScore}`);
        } else {
          // Calculate ideal score for this position
          const idealStep = scoreRange / (sortedRankings.length - 1);
          const idealScore = maxScore - (i * idealStep);
          
          // Ensure it's lower than the previous course's score
          newScore = Math.min(prevScore - 0.1, idealScore);
          newScore = Math.max(newScore, minScore); // Ensure it's not below min
          newScore = Math.round(newScore * 10) / 10; // Round to 1 decimal
          
          console.log(
            `[RankingService][FIXED] Position ${i+1} (course ${ranking.course_id.substring(0, 8)}): ` +
            `Ideal score: ${idealScore.toFixed(1)}, ` +
            `Adjusted: ${newScore} (prev: ${prevScore})`
          );
        }
        
        updates.push({
          ...ranking,
          relative_score: newScore
        });
        
        prevScore = newScore;
      }
    }

    // Log the score changes
    this.logScoreChanges(userId, sentiment, rankings, updates);

    // Update all rankings in a transaction
    const { error } = await supabase.from('course_rankings').upsert(updates);
    if (error) {
      console.error('[RankingService][FIXED] Error updating scores:', error);
      throw error;
    }

    // Verify the final rankings
    const finalRankings = await this.getUserRankings(userId, sentiment);
    
    // Validate: scores should strictly decrease as position increases
    let isValid = true;
    let prevScore = Infinity;
    let prevPos = 0;
    
    console.log('[RankingService][FIXED] Final verification:');
    finalRankings.sort((a, b) => a.rank_position - b.rank_position).forEach(r => {
      const scoreOk = r.relative_score < prevScore;
      const posOk = r.rank_position === prevPos + 1;
      const isTopPos = r.rank_position === 1;
      const hasMaxScore = isTopPos && r.relative_score === maxScore;
      
      console.log(
        `  Position ${r.rank_position}: Course ${r.course_id.substring(0, 8)} - ` +
        `Score: ${r.relative_score} ` +
        `${!scoreOk ? '⚠️ HIGHER THAN PREV' : '✓'} ` +
        `${!posOk ? '⚠️ NON-SEQUENTIAL POS' : '✓'} ` +
        `${isTopPos && !hasMaxScore ? '⚠️ TOP NOT MAX' : ''}`
      );
      
      if (!scoreOk || !posOk || (isTopPos && !hasMaxScore)) {
        isValid = false;
      }
      
      prevScore = r.relative_score;
      prevPos = r.rank_position;
    });
    
    if (isValid) {
      console.log('[RankingService][FIXED] ✅ Score redistribution completed successfully with valid rankings');
    } else {
      console.error('[RankingService][FIXED] ⚠️ Score redistribution completed with validation errors');
    }
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
      `[RankingService][FIXED] Updating rankings after comparison: ` +
      `${preferredCourseId} preferred over ${otherCourseId}`
    );

    // Get all rankings for this user and sentiment
    const allRankings = await this.getUserRankings(userId, sentiment);
    
    // Find the courses involved in the comparison
    const preferredCourse = allRankings.find(r => r.course_id === preferredCourseId);
    const otherCourse = allRankings.find(r => r.course_id === otherCourseId);

    if (!preferredCourse || !otherCourse) {
      console.error('[RankingService][FIXED] One or both courses not found in rankings');
      throw new Error('One or both courses not found in rankings');
    }

    console.log(
      `[RankingService][FIXED] Current positions: ` +
      `${preferredCourseId} at position ${preferredCourse.rank_position} (score: ${preferredCourse.relative_score}), ` +
      `${otherCourseId} at position ${otherCourse.rank_position} (score: ${otherCourse.relative_score})`
    );

    // IMPORTANT: Whether we need to reorder depends on current positions
    const preferredPosition = preferredCourse.rank_position;
    const otherPosition = otherCourse.rank_position;
    const needsReordering = preferredPosition > otherPosition;

    if (needsReordering) {
      console.log(`[RankingService][FIXED] Need to reorder rankings: preferred course (${preferredPosition}) is ranked worse than other course (${otherPosition})`);
      
      // Create a copy of all rankings
      let updatedRankings = [...allRankings];
      
      // COMPLETELY REORDER all positions:
      // 1. Move preferred course to other course's position
      // 2. Push other course and all courses in between down by 1
      updatedRankings = updatedRankings.map(ranking => {
        // The preferred course gets the other course's position
        if (ranking.course_id === preferredCourseId) {
          return { ...ranking, rank_position: otherPosition };
        }
        
        // The other course and any courses in between get pushed down by 1
        if (
          ranking.course_id === otherCourseId || 
          (ranking.rank_position >= otherPosition && ranking.rank_position < preferredPosition)
        ) {
          return { ...ranking, rank_position: ranking.rank_position + 1 };
        }
        
        // All other courses stay the same
        return ranking;
      });
      
      console.log('[RankingService][FIXED] Updated positions:');
      updatedRankings.forEach(r => {
        const isPreferred = r.course_id === preferredCourseId;
        const isOther = r.course_id === otherCourseId;
        const originalRanking = allRankings.find(orig => orig.course_id === r.course_id);
        const hasChanged = originalRanking && originalRanking.rank_position !== r.rank_position;
        
        console.log(
          `  Course ${r.course_id.substring(0, 8)}${isPreferred ? ' (PREFERRED)' : ''}${isOther ? ' (OTHER)' : ''}: ` +
          `Position ${hasChanged ? `${originalRanking?.rank_position} → ` : ''}${r.rank_position}`
        );
      });

      // Check for duplicate or missing positions
      const allPositions = updatedRankings.map(r => r.rank_position).sort((a, b) => a - b);
      const hasDuplicates = new Set(allPositions).size !== allPositions.length;
      const expectedPositions = Array.from({ length: updatedRankings.length }, (_, i) => i + 1);
      const missingPositions = expectedPositions.filter(p => !allPositions.includes(p));
      
      if (hasDuplicates || missingPositions.length > 0) {
        console.error(`[RankingService][FIXED] ⚠️ POSITION ERROR DETECTED: `);
        if (hasDuplicates) console.error(`  - Duplicate positions found`);
        if (missingPositions.length > 0) console.error(`  - Missing positions: ${missingPositions.join(', ')}`);
        console.error(`  - Will attempt to fix...`);
        
        // Fix by completely reassigning positions based on preferenceOrder
        updatedRankings.sort((a, b) => {
          // Preferred course always comes before other course
          if (a.course_id === preferredCourseId && b.course_id === otherCourseId) return -1;
          if (a.course_id === otherCourseId && b.course_id === preferredCourseId) return 1;
          
          // Otherwise keep existing order
          return a.rank_position - b.rank_position;
        });
        
        // Reassign positions sequentially
        updatedRankings = updatedRankings.map((ranking, index) => ({
          ...ranking, 
          rank_position: index + 1
        }));
        
        console.log('[RankingService][FIXED] Fixed positions:');
        updatedRankings.forEach((r, idx) => {
          console.log(`  ${idx + 1}. Course ${r.course_id.substring(0, 8)}: Position ${r.rank_position}`);
        });
      }

      // Update the database with new positions
      const { error } = await supabase.from('course_rankings').upsert(updatedRankings);
      if (error) {
        console.error('[RankingService][FIXED] Error updating positions:', error);
        throw error;
      }

      // Verify the change
      const updatedFromDb = await this.getUserRankings(userId, sentiment);
      const newPreferredPosition = updatedFromDb.find(r => r.course_id === preferredCourseId)?.rank_position;
      const newOtherPosition = updatedFromDb.find(r => r.course_id === otherCourseId)?.rank_position;
      
      console.log(
        `[RankingService][FIXED] After DB update: ` +
        `Preferred course at position ${newPreferredPosition}, ` +
        `Other course at position ${newOtherPosition}`
      );
      
      if (newPreferredPosition === undefined || newOtherPosition === undefined) {
        console.error('[RankingService][FIXED] ❌ Failed to verify position update');
      } else if (newPreferredPosition >= newOtherPosition) {
        console.error(`[RankingService][FIXED] ❌ Positions not properly updated: preferred (${newPreferredPosition}) should be lower than other (${newOtherPosition})`);
      } else {
        console.log(`[RankingService][FIXED] ✅ Positions correctly updated`);
      }

      // Redistribute scores with new positions
      await this.redistributeScores(userId, sentiment);
      
      // Final verification after score redistribution
      const finalRankings = await this.getUserRankings(userId, sentiment);
      
      // Log all courses with their final positions and scores
      console.log('[RankingService][FIXED] Final rankings after complete process:');
      finalRankings.sort((a, b) => a.rank_position - b.rank_position).forEach(r => {
        console.log(
          `  Position ${r.rank_position}: Course ${r.course_id.substring(0, 8)}` +
          `${r.course_id === preferredCourseId ? ' (PREFERRED)' : ''}` +
          `${r.course_id === otherCourseId ? ' (OTHER)' : ''} - ` +
          `Score: ${r.relative_score}`
        );
      });
      
      // Specific check for our two courses of interest
      const finalPreferred = finalRankings.find(r => r.course_id === preferredCourseId);
      const finalOther = finalRankings.find(r => r.course_id === otherCourseId);
      
      if (finalPreferred && finalOther) {
        console.log(
          `[RankingService][FIXED] Final comparison: ` +
          `Preferred ${finalPreferred.course_id.substring(0, 8)} (pos ${finalPreferred.rank_position}): ${finalPreferred.relative_score} | ` +
          `Other ${finalOther.course_id.substring(0, 8)} (pos ${finalOther.rank_position}): ${finalOther.relative_score}`
        );
        
        if (finalPreferred.rank_position < finalOther.rank_position && 
            finalPreferred.relative_score > finalOther.relative_score) {
          console.log(`[RankingService][FIXED] ✅ SUCCESS: Preferred course has better position and higher score`);
        } else {
          console.error(`[RankingService][FIXED] ❌ FAILURE: Rankings not properly reflected in final state`);
        }
      }
    } else {
      console.log(
        `[RankingService][FIXED] No position change needed: ` +
        `${preferredCourseId} (position ${preferredPosition}) already ranked higher than ` +
        `${otherCourseId} (position ${otherPosition})`
      );
      
      // Even if positions are already correct, we should still redistribute scores
      // to ensure they reflect the proper ranking
      await this.redistributeScores(userId, sentiment);
      
      // Verify that scores match positions
      const finalRankings = await this.getUserRankings(userId, sentiment);
      const finalPreferred = finalRankings.find(r => r.course_id === preferredCourseId);
      const finalOther = finalRankings.find(r => r.course_id === otherCourseId);
      
      if (finalPreferred && finalOther) {
        console.log(
          `[RankingService][FIXED] Final scores (no position change): ` +
          `Preferred: ${finalPreferred.relative_score}, Other: ${finalOther.relative_score}`
        );
        
        if (finalPreferred.relative_score <= finalOther.relative_score) {
          console.error(`[RankingService][FIXED] ⚠️ SCORE INCONSISTENCY: Preferred course should have higher score`);
          
          // Force score fixes
          const fixedRankings = finalRankings.map(r => {
            if (r.course_id === preferredCourseId) {
              return { ...r, relative_score: Math.max(r.relative_score, finalOther.relative_score + 0.1) };
            }
            return r;
          });
          
          // Update with fixed scores
          const { error } = await supabase.from('course_rankings').upsert(fixedRankings);
          if (error) {
            console.error('[RankingService][FIXED] Error fixing scores:', error);
          } else {
            console.log('[RankingService][FIXED] ✅ Forced score fix applied');
          }
        }
      }
    }
  }

  /**
   * Calculate relative score based on rank position and sentiment
   * Scores are distributed within sentiment-specific ranges:
   * - Liked: 7.0 - 10.0 (top course always 10.0)
   * - Fine: 3.0 - 6.9 (top course always 6.9)
   * - Didn't Like: 0.0 - 2.9 (top course always 2.9)
   * 
   * NOTE: This method is kept for compatibility with existing code.
   * For more robust score assignment, see the redistributeScores method.
   */
  private calculateRelativeScore(position: number, totalRankings: number, sentiment: SentimentRating): number {
    const range = SENTIMENT_RANGES[sentiment];
    
    console.log(`[RankingService][FIXED] Calculating score for position ${position} of ${totalRankings} in ${sentiment} category`);
    
    // Always give the maximum score for the top-ranked course in each category
    if (position === 1) {
      console.log(`[RankingService][FIXED] Top position, giving max score: ${range.max}`);
      return range.max;
    }

    // If there's only one course, it gets the maximum score
    if (totalRankings === 1) {
      console.log(`[RankingService][FIXED] Only one course, giving max score: ${range.max}`);
      return range.max;
    }

    // For positions other than 1, calculate score with linear distribution within the sentiment range
    // Using the formula: max_score - ((position-1) * step)
    // Where step = (max_score - min_score) / (totalRankings - 1)
    const scoreRange = range.max - range.min;
    const step = scoreRange / (totalRankings - 1);
    const score = range.max - ((position - 1) * step);
    
    // Round to one decimal place
    const roundedScore = Math.round(score * 10) / 10;
    
    // Ensure score stays within the category's range
    const clampedScore = this.clampScore(roundedScore, sentiment);
    
    console.log(
      `[RankingService][FIXED] Position ${position}/${totalRankings} in ${sentiment} category: ` +
      `Score calculation: ${range.max} - ((${position}-1) * ${step.toFixed(2)}) = ${score.toFixed(2)}, ` +
      `rounded to ${roundedScore}, clamped to ${clampedScore}`
    );
    
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

  /**
   * Refresh rankings to get the most current data after an update
   * This helps ensure we have the latest scores
   */
  async refreshRankings(userId: string, sentiment: SentimentRating): Promise<CourseRanking[]> {
    // Add a short delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Fetch fresh data
    const rankings = await this.getUserRankings(userId, sentiment);
    console.log(`[RankingService] Refreshed ${rankings.length} rankings with latest scores`);
    
    return rankings;
  }
}

// Export a singleton instance
export const rankingService = new RankingService(); 