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
   * Redistributes scores for all rankings in a sentiment category to ensure even spacing
   * and proper ordering based on positions.
   */
  private async redistributeScores(userId: string, sentiment: SentimentRating): Promise<void> {
    const rankings = await this.getUserRankings(userId, sentiment);
    
    if (rankings.length === 0) {
      console.log(`[RankingService] No rankings found for redistribution`);
      return;
    }
    
    // Step 1: Sort rankings by position
    const sortedRankings = [...rankings].sort((a, b) => a.rank_position - b.rank_position);
    
    console.log(`[RankingService] Redistributing scores for ${rankings.length} courses in ${sentiment} category:`);
    sortedRankings.forEach((ranking, idx) => {
      console.log(`  ${idx + 1}. Course ${ranking.course_id.substring(0, 8)}: Position ${ranking.rank_position}`);
    });

    // Step 2: Calculate new scores - ensuring top course always has max score and enforce strict descending order
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
      // For multiple courses, calculate evenly distributed scores with guaranteed separation
      // First course always gets max score
      updates.push({
        ...sortedRankings[0],
        relative_score: maxScore
      });
      
      console.log(`[RankingService] 🔝 Position 1 (course ${sortedRankings[0].course_id.substring(0, 8)}) gets max score: ${maxScore}`);
      
      // For remaining courses, ensure proper score spacing
      for (let i = 1; i < sortedRankings.length; i++) {
        const ranking = sortedRankings[i];
        
        // Calculate ideal score step for even distribution
        const step = scoreRange / Math.max(1, sortedRankings.length - 1);
        
        // Base score using position - this creates even spacing
        let newScore = maxScore - (i * step);
        
        // Round to 1 decimal place for cleaner scores
        newScore = Math.round(newScore * 10) / 10;
        
        // IMPROVED FIX: Always ensure a minimum difference from the previous score
        // This guarantees no two courses will have the same score
        const prevScore = updates[i - 1].relative_score;
        const minDifference = 0.1; // Minimum score difference between adjacent rankings
        
        // Force a different score than the previous one, no matter what
        if (newScore >= prevScore - minDifference) {
          // Calculate a new score that is exactly minDifference below the previous
          newScore = Math.max(minScore, prevScore - minDifference);
          
          // If we reach the minimum score and still need to go lower, force spacing
          if (i < sortedRankings.length - 1 && newScore <= minScore) {
            // Recalculate all remaining scores to fit within the available space
            const remainingScores = sortedRankings.length - i;
            const availableRange = prevScore - minScore;
            
            // If we can fit all remaining scores with proper spacing
            if (availableRange >= remainingScores * minDifference) {
              newScore = prevScore - minDifference;
            }
          }
          
          console.log(`[RankingService] ⚠️ Force-correcting score for ${ranking.course_id.substring(0, 8)} to ensure proper spacing: ${newScore.toFixed(1)}`);
        }
        
        console.log(
          `[RankingService] Position ${i+1} (course ${ranking.course_id.substring(0, 8)}): ` +
          `Score: ${newScore.toFixed(1)}`
        );
        
        updates.push({
          ...ranking,
          relative_score: newScore
        });
      }
    }

    // Step 3: Log the score changes for debugging
    this.logScoreChanges(userId, sentiment, rankings, updates);

    // Step 4: Update all rankings in a transaction
    const { error } = await supabase.from('course_rankings').upsert(updates);
    if (error) {
      console.error('[RankingService] Error updating scores:', error);
      throw error;
    }

    // Step 5: Verify the final rankings
    const finalRankings = await this.getUserRankings(userId, sentiment);
    
    // Validate: scores should strictly decrease as position increases
    let isValid = true;
    let prevScore = Infinity;
    let prevPos = 0;
    
    console.log('[RankingService] Final verification:');
    finalRankings.sort((a, b) => a.rank_position - b.rank_position).forEach(r => {
      if (r.rank_position <= prevPos) {
        console.error(`[RankingService] ❌ Position error: ${r.rank_position} ≤ ${prevPos}`);
        isValid = false;
      }
      
      if (r.relative_score >= prevScore) {
        console.error(`[RankingService] ❌ Score error: ${r.relative_score} ≥ ${prevScore}`);
        isValid = false;
      }
      
      console.log(`  Position ${r.rank_position}: Score ${r.relative_score.toFixed(1)}`);
      
      prevPos = r.rank_position;
      prevScore = r.relative_score;
    });
    
    if (isValid) {
      console.log(`[RankingService] ✅ Score redistribution successful`);
    } else {
      console.error(`[RankingService] ⚠️ Score redistribution issues detected`);
    }
  }

  /**
   * Add a new course ranking
   */
  async addCourseRanking(
    userId: string,
    courseId: string,
    sentiment: SentimentRating,
    rankPosition?: number
  ): Promise<CourseRanking> {
    // Get existing rankings to determine course count
    const existingRankings = await this.getUserRankings(userId, sentiment);
    
    // Calculate middle position if not explicitly provided
    if (!rankPosition) {
      const totalCourses = existingRankings.length;
      if (totalCourses === 0) {
        // If no courses, position is 1
        rankPosition = 1;
      } else {
        // Calculate middle position (rounds up for odd numbers of courses)
        rankPosition = Math.ceil((totalCourses + 1) / 2);
      }
    }
    
    console.log(`[RankingService] Adding new ranking for course ${courseId} at position ${rankPosition} (middle placement)`);

    // Use the database function to shift ranks and insert at position
    const { data, error } = await supabase.rpc('insert_course_at_position', {
      user_id_param: userId,
      course_id_param: courseId,
      sentiment_param: sentiment,
      position_param: rankPosition,
      score_param: SENTIMENT_RANGES[sentiment].max // Temporary score
    });

    if (error) {
      console.error('[RankingService] Error adding new ranking:', error);
      throw error;
    }

    // Verify and fix any ranking integrity issues
    console.log(`[RankingService] Verifying ranking integrity after adding new course`);
    await this.verifyRankingsIntegrity(userId, sentiment);

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
   * This method moves the preferred course to a better position if needed,
   * and ensures all other courses shift accordingly
   */
  async updateRankingsAfterComparison(
    userId: string,
    preferredCourseId: string,
    otherCourseId: string,
    sentiment: SentimentRating
  ): Promise<void> {
    console.log(
      `[RankingService] Updating rankings after comparison: ` +
      `${preferredCourseId.substring(0, 8)} preferred over ${otherCourseId.substring(0, 8)}`
    );

    try {
      // Get all rankings for this user and sentiment
      const allRankings = await this.getUserRankings(userId, sentiment);
      
      // Find the courses involved in the comparison
      const preferredCourse = allRankings.find(r => r.course_id === preferredCourseId);
      const otherCourse = allRankings.find(r => r.course_id === otherCourseId);
  
      if (!preferredCourse || !otherCourse) {
        console.error('[RankingService] One or both courses not found in rankings');
        throw new Error('One or both courses not found in rankings');
      }
  
      console.log(
        `[RankingService] Current positions: ` +
        `${preferredCourseId.substring(0, 8)} at position ${preferredCourse.rank_position}, ` +
        `${otherCourseId.substring(0, 8)} at position ${otherCourse.rank_position}`
      );
  
      // Check if reordering is needed
      const preferredPosition = preferredCourse.rank_position;
      const otherPosition = otherCourse.rank_position;
      const needsReordering = preferredPosition > otherPosition;
  
      if (needsReordering) {
        console.log(`[RankingService] Reordering needed: preferred course should move from position ${preferredPosition} to ${otherPosition}`);
        
        // Create a transaction for updating multiple records
        try {
          // Use the swap_course_rankings DB function for atomic updates
          const { error } = await supabase.rpc('swap_course_rankings', {
            preferred_ranking_id: preferredCourse.id,
            other_ranking_id: otherCourse.id
          });
          
          if (error) {
            console.error('[RankingService] Error swapping rankings:', error);
            throw error;
          }
          
          console.log('[RankingService] Rankings swapped successfully');
        } catch (err) {
          console.error('[RankingService] Transaction error:', err);
          
          // Fallback approach if the DB function fails
          console.log('[RankingService] Using fallback method to update positions');
          
          // Create a copy of all rankings
          let updatedRankings = [...allRankings];
          
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
          
          // Update the database with new positions
          const { error } = await supabase.from('course_rankings').upsert(updatedRankings);
          if (error) {
            console.error('[RankingService] Error updating positions:', error);
            throw error;
          }
        }
      } else {
        console.log(
          `[RankingService] No position change needed: ` +
          `${preferredCourseId.substring(0, 8)} (position ${preferredPosition}) already ranked higher than ` +
          `${otherCourseId.substring(0, 8)} (position ${otherPosition})`
        );
        
        // Still update comparison counts - using course_id_params (plural) for the array parameter
        const { error } = await supabase.rpc('increment_comparison_count', {
          user_id_param: userId,
          course_id_params: [preferredCourseId, otherCourseId]
        });
        
        if (error) {
          console.error('[RankingService] Error updating comparison counts:', error);
          // Non-critical error, can continue
        }
      }
      
      // Verify integrity of rankings after update
      const isValid = await this.verifyRankingsIntegrity(userId, sentiment);
      if (!isValid) {
        console.warn('[RankingService] Integrity issues detected and repaired');
      }
      
      // Redistribute scores with new positions
      await this.redistributeScores(userId, sentiment);
      
      // Final verification after score redistribution
      const finalRankings = await this.getUserRankings(userId, sentiment);
      
      console.log('[RankingService] Final rankings after comparison:');
      finalRankings.sort((a, b) => a.rank_position - b.rank_position).forEach(r => {
        const isPreferred = r.course_id === preferredCourseId;
        const isOther = r.course_id === otherCourseId;
        console.log(
          `  Position ${r.rank_position}: Course ${r.course_id.substring(0, 8)}` +
          `${isPreferred ? ' (PREFERRED)' : ''}${isOther ? ' (OTHER)' : ''} - ` +
          `Score: ${r.relative_score.toFixed(1)}`
        );
      });
    } catch (error) {
      console.error('[RankingService] Error in updateRankingsAfterComparison:', error);
      throw error;
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

  /**
   * Verify the integrity of rankings and repair if necessary
   * This checks for duplicate positions, gaps in sequence, and ensures scores align with positions
   */
  async verifyRankingsIntegrity(userId: string, sentiment: SentimentRating): Promise<boolean> {
    const rankings = await this.getUserRankings(userId, sentiment);
    
    if (rankings.length === 0) {
      console.log(`[RankingService] No rankings to verify for ${userId} in ${sentiment} category`);
      return true;
    }
    
    console.log(`[RankingService] Verifying integrity of ${rankings.length} rankings in ${sentiment} category`);
    
    // Sort rankings by position
    const sortedRankings = [...rankings].sort((a, b) => a.rank_position - b.rank_position);
    
    // Check for position issues
    const positions = sortedRankings.map(r => r.rank_position);
    const uniquePositions = new Set(positions);
    
    // Check for duplicates
    const hasDuplicates = uniquePositions.size !== positions.length;
    
    // Check for gaps or out-of-sequence positions
    const expectedPositions = Array.from({ length: rankings.length }, (_, i) => i + 1);
    const missingPositions = expectedPositions.filter(p => !positions.includes(p));
    const outOfSequence = positions.some((pos, idx) => pos !== expectedPositions[idx]);
    
    // Check for score alignment issues
    let prevScore = Infinity;
    let scoreErrors = false;
    let scoresMap = new Map<number, string[]>(); // Map to track duplicate scores
    
    sortedRankings.forEach(r => {
      // Check if score is not decreasing
      if (r.relative_score >= prevScore) {
        scoreErrors = true;
      }
      
      // Track duplicate scores
      const roundedScore = Math.round(r.relative_score * 10) / 10;
      if (!scoresMap.has(roundedScore)) {
        scoresMap.set(roundedScore, []);
      }
      scoresMap.get(roundedScore)?.push(r.course_id);
      
      prevScore = r.relative_score;
    });
    
    // Check for duplicate scores (courses with identical scores)
    const duplicateScores = Array.from(scoresMap.entries())
      .filter(([_, courseIds]) => courseIds.length > 1)
      .map(([score, _]) => score);
    
    const hasDuplicateScores = duplicateScores.length > 0;
    
    const hasIssues = hasDuplicates || missingPositions.length > 0 || outOfSequence || scoreErrors || hasDuplicateScores;
    
    if (hasIssues) {
      console.log('[RankingService] ⚠️ Ranking integrity issues detected:');
      if (hasDuplicates) console.log(`- Duplicate positions found`);
      if (missingPositions.length > 0) console.log(`- Missing positions: ${missingPositions.join(', ')}`);
      if (outOfSequence) console.log(`- Positions out of sequence`);
      if (scoreErrors) console.log(`- Score alignment errors`);
      if (hasDuplicateScores) console.log(`- Duplicate scores found: ${duplicateScores.join(', ')}`);
      
      // Fix position issues by reassigning sequentially
      if (hasDuplicates || missingPositions.length > 0 || outOfSequence) {
        console.log('[RankingService] 🔧 Repairing position issues...');
        
        const repairedRankings = sortedRankings.map((ranking, idx) => ({
          ...ranking,
          rank_position: idx + 1
        }));
        
        // Update fixed positions
        const { error } = await supabase.from('course_rankings').upsert(repairedRankings);
        if (error) {
          console.error('[RankingService] ❌ Error repairing positions:', error);
          return false;
        }
        
        console.log('[RankingService] ✓ Position issues repaired');
      }
      
      // Fix score issues by redistributing
      if (scoreErrors || hasDuplicateScores) {
        console.log('[RankingService] 🔧 Repairing score issues...');
        await this.redistributeScores(userId, sentiment);
        console.log('[RankingService] ✓ Score issues repaired');
      }
      
      // Verify the fix worked
      const verifyResult = await this.verifyRankingsIntegrity(userId, sentiment);
      if (!verifyResult) {
        console.error('[RankingService] ❌ Failed to repair ranking integrity issues after attempt');
      }
      
      return verifyResult;
    }
    
    console.log('[RankingService] ✅ Ranking integrity verified - no issues found');
    return true;
  }

  /**
   * Admin function to verify and fix all rankings for a user across all sentiment categories
   * Can be called to repair corrupt or inconsistent rankings
   */
  async refreshAllRankings(userId: string): Promise<void> {
    console.log(`[RankingService] Refreshing all rankings for user ${userId}`);
    
    const sentiments: SentimentRating[] = ['liked', 'fine', 'didnt_like'];
    const results: Record<string, boolean> = {};
    
    for (const sentiment of sentiments) {
      console.log(`[RankingService] Processing ${sentiment} category...`);
      
      try {
        // Use the force refresh function which does integrity check, redistribution and final verification
        await this.forceRefreshRankings(userId, sentiment);
        
        // Store result as success
        results[sentiment] = true;
      } catch (error) {
        console.error(`[RankingService] Error refreshing ${sentiment} rankings:`, error);
        results[sentiment] = false;
      }
    }
    
    // Log final results
    console.log('[RankingService] Ranking refresh results:');
    for (const [sentiment, isValid] of Object.entries(results)) {
      console.log(`- ${sentiment}: ${isValid ? '✅ OK' : '❌ Had issues (attempted fix)'}`);
    }
    
    const allValid = Object.values(results).every(r => r === true);
    if (allValid) {
      console.log('[RankingService] ✅ All rankings verified and in good condition');
    } else {
      console.log('[RankingService] ⚠️ Some rankings had issues but were repaired');
    }
  }

  /**
   * Export ranking data for a user in a simplified format that can be used for debugging
   * Returns a structured object with all rankings by sentiment category
   */
  async exportRankingData(userId: string): Promise<Record<SentimentRating, Array<{
    courseId: string;
    position: number;
    score: number;
    comparisonCount: number;
    lastCompared: string | null;
  }>>> {
    console.log(`[RankingService] Exporting ranking data for user ${userId}`);
    
    const sentiments: SentimentRating[] = ['liked', 'fine', 'didnt_like'];
    const result: Record<SentimentRating, any[]> = {
      liked: [],
      fine: [],
      didnt_like: []
    };
    
    for (const sentiment of sentiments) {
      const rankings = await this.getUserRankings(userId, sentiment);
      
      // Convert to simplified format and sort by position
      const simplifiedRankings = rankings
        .map(r => ({
          courseId: r.course_id,
          position: r.rank_position,
          score: r.relative_score,
          comparisonCount: r.comparison_count,
          lastCompared: r.last_compared_at ? new Date(r.last_compared_at).toISOString() : null
        }))
        .sort((a, b) => a.position - b.position);
      
      result[sentiment] = simplifiedRankings;
    }
    
    return result;
  }

  /**
   * Force a refresh of all rankings in a sentiment tier
   * This can be used as a one-time fix for existing rankings that might have duplicate scores
   */
  async forceRefreshRankings(userId: string, sentiment: SentimentRating): Promise<void> {
    console.log(`[RankingService] Force refreshing all rankings for user ${userId} in ${sentiment} category`);
    
    // First verify and fix any position issues
    const integrityResult = await this.verifyRankingsIntegrity(userId, sentiment);
    if (!integrityResult) {
      console.warn('[RankingService] Detected and fixed ranking integrity issues');
    }
    
    // Now ensure all scores are properly distributed
    await this.redistributeScores(userId, sentiment);
    
    // Final verification
    const rankings = await this.getUserRankings(userId, sentiment);
    
    if (rankings.length <= 1) {
      console.log(`[RankingService] Only ${rankings.length} rankings found, no need for additional verification`);
      return;
    }
    
    // Verify no duplicate scores exist
    const scores = rankings.map(r => r.relative_score);
    const uniqueScores = new Set(scores);
    
    if (uniqueScores.size === scores.length) {
      console.log(`[RankingService] ✅ All scores are unique after refresh`);
    } else {
      console.error(`[RankingService] ⚠️ Duplicate scores still exist after refresh - forcing explicit spacing`);
      
      // Last resort: force explicit spacing for all courses
      const sortedRankings = [...rankings].sort((a, b) => a.rank_position - b.rank_position);
      const updates: CourseRanking[] = [];
      const range = SENTIMENT_RANGES[sentiment];
      
      // First course gets max score
      updates.push({
        ...sortedRankings[0],
        relative_score: range.max
      });
      
      // Force progressively lower scores for all other courses
      for (let i = 1; i < sortedRankings.length; i++) {
        // Calculate a score that's exactly 0.1 lower than the previous course
        const prevScore = updates[i-1].relative_score;
        const newScore = Math.max(range.min, prevScore - 0.1);
        
        console.log(`[RankingService] Emergency fix: Course ${sortedRankings[i].course_id.substring(0, 8)}: Position ${i+1}, Score: ${sortedRankings[i].relative_score} → ${newScore}`);
        
        updates.push({
          ...sortedRankings[i],
          relative_score: newScore
        });
      }
      
      // Update the database with these explicitly spaced scores
      const { error } = await supabase.from('course_rankings').upsert(updates);
      if (error) {
        console.error('[RankingService] Failed to update duplicate scores:', error);
      } else {
        console.log(`[RankingService] ✅ Successfully forced explicit score spacing for ${updates.length} rankings`);
      }
      
      // One more verification to confirm the fix worked
      const finalCheck = await this.getUserRankings(userId, sentiment);
      const finalScores = finalCheck.map(r => r.relative_score);
      const finalUniqueScores = new Set(finalScores);
      
      if (finalUniqueScores.size === finalScores.length) {
        console.log(`[RankingService] ✅ All scores are now unique after emergency fix`);
      } else {
        console.error(`[RankingService] ⚠️ Still have duplicate scores after emergency fix - please report this issue`);
      }
    }
  }

  /**
   * One-time fix for duplicate scores in the "fine" tier
   * This addresses the specific bug where courses in the fine tier have identical scores
   */
  async fixDuplicateScoresInFineTier(userId: string): Promise<void> {
    console.log(`[RankingService] Running one-time fix for "fine" tier duplicate scores`);
    
    const sentiment: SentimentRating = 'fine';
    const rankings = await this.getUserRankings(userId, sentiment);
    
    if (rankings.length <= 1) {
      console.log(`[RankingService] Only ${rankings.length} courses in fine tier, no fix needed`);
      return;
    }
    
    // Check for duplicate scores
    const scores = rankings.map(r => r.relative_score);
    const uniqueScores = new Set(scores);
    
    if (uniqueScores.size === scores.length) {
      console.log(`[RankingService] No duplicate scores detected in fine tier, no fix needed`);
      return;
    }
    
    console.log(`[RankingService] Detected duplicate scores in fine tier, applying fix`);
    
    // Sort by position
    const sortedRankings = [...rankings].sort((a, b) => a.rank_position - b.rank_position);
    
    // Fix the scores
    const updates: CourseRanking[] = [];
    const range = SENTIMENT_RANGES[sentiment];
    const maxScore = range.max; // 6.9 for fine tier
    
    // First course gets max score
    updates.push({
      ...sortedRankings[0],
      relative_score: maxScore
    });
    
    // Force different scores for remaining courses
    for (let i = 1; i < sortedRankings.length; i++) {
      const prevScore = updates[i-1].relative_score;
      const newScore = Math.max(range.min, prevScore - 0.1 * i); // Ensure bigger gaps
      
      console.log(`[RankingService] Fine tier fix: Course ${sortedRankings[i].course_id.substring(0, 8)}: ${sortedRankings[i].relative_score} → ${newScore}`);
      
      updates.push({
        ...sortedRankings[i],
        relative_score: newScore
      });
    }
    
    // Update the database
    const { error } = await supabase.from('course_rankings').upsert(updates);
    if (error) {
      console.error('[RankingService] Failed to fix fine tier scores:', error);
    } else {
      console.log(`[RankingService] ✅ Successfully fixed ${updates.length} fine tier scores`);
    }
  }
}

// Export a singleton instance
export const rankingService = new RankingService(); 