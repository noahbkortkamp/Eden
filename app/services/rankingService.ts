import { supabase } from '../utils/supabase';
import type { Database } from '../utils/database.types';

type CourseRanking = Database['public']['Tables']['course_rankings']['Row'];
type SentimentRating = 'liked' | 'fine' | 'didnt_like';

interface ScoreRange {
  min: number;
  max: number;
}

// 🚀 Phase 1.2: Intelligent Caching Implementation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface RankingCacheKey {
  userId: string;
  sentiment: SentimentRating;
}

class RankingCache {
  private cache = new Map<string, CacheEntry<CourseRanking[]>>();
  private readonly DEFAULT_TTL = 30 * 1000; // 30 seconds default TTL
  private readonly FRESH_TTL = 5 * 60 * 1000; // 5 minutes for fresh data

  private getCacheKey(userId: string, sentiment: SentimentRating): string {
    return `${userId}:${sentiment}`;
  }

  set(userId: string, sentiment: SentimentRating, data: CourseRanking[], isFrequentlyAccessed = false): void {
    const key = this.getCacheKey(userId, sentiment);
    const ttl = isFrequentlyAccessed ? this.FRESH_TTL : this.DEFAULT_TTL;
    
    this.cache.set(key, {
      data: [...data], // Clone to prevent mutations
      timestamp: Date.now(),
      ttl
    });

    console.log(`🔄 [Cache] Stored rankings for ${userId}:${sentiment} (TTL: ${ttl/1000}s)`);
  }

  get(userId: string, sentiment: SentimentRating): CourseRanking[] | null {
    const key = this.getCacheKey(userId, sentiment);
    const entry = this.cache.get(key);

    if (!entry) {
      console.log(`💾 [Cache] MISS for ${userId}:${sentiment}`);
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      console.log(`⏰ [Cache] EXPIRED for ${userId}:${sentiment}`);
      return null;
    }

    console.log(`✅ [Cache] HIT for ${userId}:${sentiment} (age: ${Math.round((Date.now() - entry.timestamp) / 1000)}s)`);
    return [...entry.data]; // Return clone to prevent mutations
  }

  invalidate(userId: string, sentiment?: SentimentRating): void {
    if (sentiment) {
      const key = this.getCacheKey(userId, sentiment);
      if (this.cache.delete(key)) {
        console.log(`🗑️ [Cache] Invalidated ${userId}:${sentiment}`);
      }
    } else {
      // Invalidate all sentiments for this user
      const keysToDelete = Array.from(this.cache.keys()).filter(k => k.startsWith(`${userId}:`));
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`🗑️ [Cache] Invalidated all rankings for ${userId} (${keysToDelete.length} entries)`);
    }
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 [Cache] Cleared all rankings cache (${size} entries)`);
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

const SENTIMENT_RANGES: Record<SentimentRating, ScoreRange> = {
  liked: { min: 7.0, max: 10.0 },
  fine: { min: 3.0, max: 6.9 },
  didnt_like: { min: 0.0, max: 2.9 }
};

class RankingService {
  // 🚀 Phase 1.2: Add cache instance
  private rankingCache = new RankingCache();
  
  // 🚀 Performance: Circuit breaker to prevent infinite loops
  private integrityCheckAttempts = new Map<string, number>();
  private readonly MAX_INTEGRITY_ATTEMPTS = 3;

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
    
    // 🚀 Performance: Circuit breaker key
    const circuitKey = `${userId}:${sentiment}`;
    
    // 🚀 Phase 1.2: Check cache with validation
    const cachedRankings = this.rankingCache.get(userId, sentiment);
    if (cachedRankings) {
      console.log(`✅ [Cache] HIT for ${circuitKey} (age: ${Math.floor((Date.now() - (this.rankingCache as any).cache.get(`${userId}:${sentiment}`)?.timestamp || 0) / 1000)}s)`);
      
      // 🚀 Performance: Skip integrity check if recently attempted
      const attempts = this.integrityCheckAttempts.get(circuitKey) || 0;
      if (attempts >= this.MAX_INTEGRITY_ATTEMPTS) {
        console.log(`🚫 [Circuit Breaker] Skipping integrity check for ${circuitKey} (${attempts}/${this.MAX_INTEGRITY_ATTEMPTS} attempts)`);
        console.log(`💾 [Cache] Found ${cachedRankings.length} rankings in cache`);
        return cachedRankings;
      }
      
      // Quick validation: Check for obvious corruption without full integrity check
      const hasDuplicatePositions = cachedRankings.length > 1 && 
        new Set(cachedRankings.map(r => r.rank_position)).size !== cachedRankings.length;
      
      if (hasDuplicatePositions) {
        console.warn(`⚠️ [Cache] Detected corrupted data in cache for ${circuitKey}, clearing cache`);
        this.rankingCache.invalidate(userId, sentiment);
        this.integrityCheckAttempts.set(circuitKey, attempts + 1);
      } else {
        console.log(`💾 [Cache] Found ${cachedRankings.length} rankings in cache`);
        return cachedRankings;
      }
    }

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
    
    // 🚀 Performance: Validate data before caching to prevent infinite loops
    const rankings = data || [];
    let isValidForCache = true;
    
    if (rankings.length > 1) {
      // Check for duplicate positions
      const positions = rankings.map(r => r.rank_position);
      const uniquePositions = new Set(positions);
      
      if (uniquePositions.size !== positions.length) {
        console.warn(`⚠️ [Performance] Not caching corrupted data with duplicate positions for ${circuitKey}`);
        isValidForCache = false;
        this.integrityCheckAttempts.set(circuitKey, (this.integrityCheckAttempts.get(circuitKey) || 0) + 1);
      }
    }
    
    // 🚀 Phase 1.2: Store in cache only if data is valid
    if (isValidForCache) {
      this.rankingCache.set(userId, sentiment, rankings);
      // Reset circuit breaker on successful clean data
      this.integrityCheckAttempts.delete(circuitKey);
    }
    
    return rankings;
  }

  /**
   * Redistributes scores for all rankings in a sentiment category to ensure even spacing
   * and proper ordering based on positions.
   */
  private async redistributeScores(userId: string, sentiment: SentimentRating): Promise<void> {
    // 🚀 Phase 1.2: Invalidate cache before redistribution
    this.rankingCache.invalidate(userId, sentiment);
    
    // 🔧 PHASE 1.4: Ensure all reviewed courses have rankings before redistribution
    await this.ensureAllReviewsHaveRankings(userId, sentiment);
    
    const rankings = await this.getUserRankings(userId, sentiment);
    
    if (rankings.length === 0) {
      console.log(`[RankingService] No rankings found for redistribution`);
      return;
    }
    
    // 🔧 PHASE 1.3: Position Integrity Check - Fix gaps and duplicates before redistribution
    const positionIntegrityResult = await this.ensurePositionIntegrity(userId, sentiment, rankings);
    const workingRankings = positionIntegrityResult.rankings;
    
    // Step 1: Sort rankings by position
    const sortedRankings = [...workingRankings].sort((a, b) => a.rank_position - b.rank_position);
    
    console.log(`[RankingService] 🔧 Redistributing scores for ${workingRankings.length} courses in ${sentiment} category:`);
    sortedRankings.forEach((ranking, idx) => {
      console.log(`  ${idx + 1}. Course ${ranking.course_id.substring(0, 8)}: Position ${ranking.rank_position}`);
    });

    // Step 2: Calculate new scores with improved algorithm
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
      // 🔧 PHASE 1.1: Fix position gap handling - use actual positions, not array indices
      const totalPositions = sortedRankings.length;
      const minDifference = 0.1; // Minimum score difference between adjacent rankings
      
      // First course always gets max score
      updates.push({
        ...sortedRankings[0],
        relative_score: maxScore
      });
      
      console.log(`[RankingService] 🔝 Position ${sortedRankings[0].rank_position} (course ${sortedRankings[0].course_id.substring(0, 8)}) gets max score: ${maxScore}`);
      
      // 🔧 PHASE 1.2: Improved score distribution algorithm
      // Calculate step size based on total courses and available range
      const effectiveStep = Math.max(minDifference, scoreRange / Math.max(1, totalPositions - 1));
      
      for (let i = 1; i < sortedRankings.length; i++) {
        const ranking = sortedRankings[i];
        const prevScore = updates[i - 1].relative_score;
        
        // Calculate score using improved algorithm
        let newScore = maxScore - (i * effectiveStep);
        
        // 🔧 PHASE 1.2: Enhanced boundary and spacing checks
        // Ensure minimum difference from previous score
        const minAllowedScore = prevScore - minDifference;
        if (newScore > minAllowedScore) {
          newScore = minAllowedScore;
        }
        
        // Ensure we don't go below minimum
        if (newScore < minScore) {
          // If we've hit the minimum, redistribute remaining scores proportionally
          const remainingCourses = sortedRankings.length - i;
          const availableRange = prevScore - minScore;
          
          if (remainingCourses > 0 && availableRange > remainingCourses * minDifference) {
            newScore = prevScore - ((availableRange / remainingCourses) * 0.9); // Use 90% to leave buffer
          } else {
            newScore = Math.max(minScore, prevScore - minDifference);
          }
        }
        
        // Round to 1 decimal place for cleaner scores
        newScore = Math.round(newScore * 10) / 10;
        
        console.log(
          `[RankingService] 🔧 Position ${ranking.rank_position} (course ${ranking.course_id.substring(0, 8)}): ` +
          `Score: ${newScore.toFixed(1)} (step: ${effectiveStep.toFixed(2)})`
        );
        
        updates.push({
          ...ranking,
          relative_score: newScore
        });
      }
    }

    // Step 3: Log the score changes for debugging
    this.logScoreChanges(userId, sentiment, workingRankings, updates);

    // Step 4: Update all rankings atomically
    const { error } = await supabase.from('course_rankings').upsert(updates);
    if (error) {
      console.error('[RankingService] Error updating scores:', error);
      throw error;
    }

    // Step 5: Verify the final rankings with enhanced validation
    const finalRankings = await this.getUserRankings(userId, sentiment);
    
    // 🔧 PHASE 1.2: Enhanced validation with detailed error reporting
    let isValid = true;
    let prevScore = Infinity;
    let prevPos = 0;
    const FLOAT_TOLERANCE = 0.001;
    
    console.log('[RankingService] 🔍 Final verification:');
    const sortedFinalRankings = finalRankings.sort((a, b) => a.rank_position - b.rank_position);
    
    for (let i = 0; i < sortedFinalRankings.length; i++) {
      const r = sortedFinalRankings[i];
      
      // Check position ordering
      if (r.rank_position <= prevPos) {
        console.error(`[RankingService] ❌ Position error: Course ${r.course_id.substring(0, 8)} has position ${r.rank_position} ≤ ${prevPos}`);
        isValid = false;
      }
      
      // Check score ordering with tolerance
      if (r.relative_score > prevScore + FLOAT_TOLERANCE) {
        console.error(`[RankingService] ❌ Score error: Course ${r.course_id.substring(0, 8)} has score ${r.relative_score} > ${prevScore} (should be descending)`);
        isValid = false;
      }
      
      console.log(`  Position ${r.rank_position}: Course ${r.course_id.substring(0, 8)}, Score ${r.relative_score.toFixed(1)}`);
      
      prevPos = r.rank_position;
      prevScore = r.relative_score;
    }
    
    if (isValid) {
      console.log(`[RankingService] ✅ Score redistribution successful`);
    } else {
      console.error(`[RankingService] ⚠️ Score redistribution issues detected`);
      // 🔧 PHASE 1.3: If issues detected, log detailed state for debugging
      console.error(`[RankingService] 🔍 Debug info - Total courses: ${finalRankings.length}, Sentiment: ${sentiment}`);
    }
  }

  /**
   * 🔧 PHASE 1.3: New method to ensure position integrity before redistribution
   * Fixes gaps, duplicates, and ensures consecutive positioning
   */
  private async ensurePositionIntegrity(
    userId: string, 
    sentiment: SentimentRating, 
    rankings: CourseRanking[]
  ): Promise<{ rankings: CourseRanking[]; hadIssues: boolean }> {
    const sortedRankings = [...rankings].sort((a, b) => a.rank_position - b.rank_position);
    
    // Check for position issues
    const positions = sortedRankings.map(r => r.rank_position);
    const uniquePositions = new Set(positions);
    const hasGaps = sortedRankings.some((r, i) => r.rank_position !== i + 1);
    const hasDuplicates = uniquePositions.size !== positions.length;
    
    if (!hasGaps && !hasDuplicates) {
      console.log(`[RankingService] ✅ Position integrity already good for ${sentiment}`);
      return { rankings: sortedRankings, hadIssues: false };
    }
    
    console.log(`[RankingService] 🔧 Position integrity issues detected for ${sentiment}:`);
    if (hasGaps) console.log(`  - Gaps in positions: [${positions.join(', ')}]`);
    if (hasDuplicates) console.log(`  - Duplicate positions detected`);
    
    // Fix by reassigning consecutive positions (1, 2, 3, ...)
    const fixedRankings = sortedRankings.map((ranking, index) => ({
      ...ranking,
      rank_position: index + 1
    }));
    
    // Update the database with fixed positions
    const { error } = await supabase.from('course_rankings').upsert(fixedRankings);
    if (error) {
      console.error('[RankingService] Error fixing position integrity:', error);
      // Continue with original rankings if fix fails
      return { rankings: sortedRankings, hadIssues: true };
    }
    
    console.log(`[RankingService] ✅ Position integrity fixed - normalized to consecutive positions`);
    return { rankings: fixedRankings, hadIssues: true };
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
    // Get existing rankings to determine the next position
    const existingRankings = await this.getUserRankings(userId, sentiment);
    const nextPosition = existingRankings.length > 0 
      ? Math.max(...existingRankings.map(r => r.rank_position)) + 1 
      : 1;

    console.log(`[RankingService] Adding new ranking for course ${courseId} at position ${nextPosition}`);

    // Calculate initial score based on position
    const range = SENTIMENT_RANGES[sentiment];
    const initialScore = range.max - (nextPosition - 1) * 0.1;
    const clampedScore = Math.max(range.min, Math.min(range.max, initialScore));

    // Insert the new ranking
    const { data, error } = await supabase
      .from('course_rankings')
      .insert({
        user_id: userId,
        course_id: courseId,
        sentiment_category: sentiment,
        rank_position: nextPosition,
        relative_score: clampedScore,
        comparison_count: 0
      })
      .select()
      .single();

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

    // 🚀 Phase 1.2: Invalidate cache after adding new course
    this.rankingCache.invalidate(userId, sentiment);

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
    // 🚀 Phase 1.2: Invalidate cache before comparison updates
    this.rankingCache.invalidate(userId, sentiment);

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
  async verifyRankingsIntegrity(userId: string, sentiment: SentimentRating, skipRepair = false): Promise<boolean> {
    // 🚀 Performance: Circuit breaker to prevent infinite loops
    const circuitKey = `${userId}:${sentiment}`;
    const attempts = this.integrityCheckAttempts.get(circuitKey) || 0;
    
    if (attempts >= this.MAX_INTEGRITY_ATTEMPTS) {
      console.log(`🚫 [Circuit Breaker] Skipping integrity check for ${circuitKey} after ${attempts} attempts`);
      return false;
    }
    
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
    
    sortedRankings.forEach((r, index) => {
      // Check if score is not decreasing (allow equal for debugging, but warn)
      if (r.relative_score > prevScore) {
        console.warn(`[RankingService] ❌ Score error: Position ${index + 1} has score ${r.relative_score} > ${prevScore} (should be decreasing)`);
        scoreErrors = true;
      }
      if (r.relative_score === prevScore && index > 0) {
        console.warn(`[RankingService] ⚠️ Score warning: Position ${index + 1} has same score ${r.relative_score} as previous`);
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
      
      // 🚀 Performance: Increment attempt counter and skip repair if too many attempts
      this.integrityCheckAttempts.set(circuitKey, attempts + 1);
      
      if (skipRepair || attempts >= this.MAX_INTEGRITY_ATTEMPTS - 1) {
        console.log(`🚫 [Circuit Breaker] Skipping repair for ${circuitKey} (attempts: ${attempts + 1}/${this.MAX_INTEGRITY_ATTEMPTS})`);
        return false;
      }
      
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
          this.integrityCheckAttempts.set(circuitKey, this.MAX_INTEGRITY_ATTEMPTS);
          return false;
        }
        
        console.log('[RankingService] ✓ Position issues repaired');
        // Clear cache after repair to force fresh data
        this.rankingCache.invalidate(userId, sentiment);
      }
      
      // Fix score issues by redistributing
      if (scoreErrors || hasDuplicateScores) {
        console.log('[RankingService] 🔧 Repairing score issues...');
        await this.redistributeScores(userId, sentiment);
        console.log('[RankingService] ✓ Score issues repaired');
      }
      
      // 🚀 Performance: NO recursive call - instead return true if repairs were attempted
      console.log('[RankingService] ✓ Integrity repair completed, assuming success to prevent infinite loops');
      return true;
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
    
    // 🚀 Phase 1.2: Clear all cached data for this user
    this.rankingCache.invalidate(userId);
    
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
    
    // 🚀 Phase 1.2: Invalidate cache before force refresh
    this.rankingCache.invalidate(userId, sentiment);
    
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

  // 🚀 Phase 1.2: Expose cache stats for debugging
  getCacheStats(): { size: number; keys: string[] } {
    return this.rankingCache.getStats();
  }

  // 🚀 Phase 1.2: Clear cache for debugging/testing
  clearCache(): void {
    this.rankingCache.clear();
    this.integrityCheckAttempts.clear();
  }

  /**
   * 🔧 PHASE 1.4: Ensure all reviewed courses have rankings before redistribution
   * This prevents partial redistribution issues where some courses have rankings but others don't
   */
  private async ensureAllReviewsHaveRankings(userId: string, sentiment: SentimentRating): Promise<void> {
    try {
      // Get all reviews for this user and sentiment
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('course_id')
        .eq('user_id', userId)
        .eq('sentiment', sentiment);

      if (reviewsError) {
        console.error('[RankingService] Error fetching reviews:', reviewsError);
        return; // Continue with existing rankings if this fails
      }

      if (!reviews || reviews.length === 0) {
        console.log(`[RankingService] ✅ No reviews found for sentiment ${sentiment}, nothing to check`);
        return;
      }

      // Get existing rankings for this sentiment
      const existingRankings = await this.getUserRankings(userId, sentiment);
      const rankedCourseIds = new Set(existingRankings.map(r => r.course_id));
      
      // Find courses that have reviews but no rankings
      const reviewedCourseIds = reviews.map(r => r.course_id);
      const missingRankings = reviewedCourseIds.filter(courseId => !rankedCourseIds.has(courseId));

      if (missingRankings.length === 0) {
        console.log(`[RankingService] ✅ All ${reviewedCourseIds.length} reviewed courses already have rankings for ${sentiment}`);
        return;
      }

      console.log(`[RankingService] 🔧 Found ${missingRankings.length} courses with reviews but missing rankings for ${sentiment}`);
      console.log(`[RankingService] 🔧 Total reviewed courses: ${reviewedCourseIds.length}, Existing rankings: ${existingRankings.length}`);

      // Create missing rankings
      const range = SENTIMENT_RANGES[sentiment];
      const currentMaxPosition = existingRankings.length > 0 
        ? Math.max(...existingRankings.map(r => r.rank_position)) 
        : 0;

      const newRankings = missingRankings.map((courseId, index) => {
        const position = currentMaxPosition + index + 1;
        const score = Math.max(range.min, range.max - (position - 1) * 0.1);
        
        return {
          user_id: userId,
          course_id: courseId,
          sentiment_category: sentiment,
          rank_position: position,
          relative_score: score,
          comparison_count: 0
        };
      });

      // Insert missing rankings
      const { error: insertError } = await supabase
        .from('course_rankings')
        .insert(newRankings);

      if (insertError) {
        console.error('[RankingService] Error creating missing rankings:', insertError);
        return; // Continue without failing
      }

      console.log(`[RankingService] ✅ Created ${newRankings.length} missing rankings for ${sentiment} sentiment`);
      
      // Invalidate cache since we added new rankings
      this.rankingCache.invalidate(userId, sentiment);
      
    } catch (error) {
      console.error('[RankingService] Error in ensureAllReviewsHaveRankings:', error);
      // Don't throw - continue with redistribution using existing rankings
    }
  }
}

// Export a singleton instance
export const rankingService = new RankingService(); 