import { ZoneConfig } from '../types/zonePlacement';
import { SentimentRating } from '../types/review';

/**
 * Scoring ranges by sentiment category
 */
export const SENTIMENT_RANGES: Record<SentimentRating, { min: number; max: number }> = {
  liked: { min: 7.0, max: 10.0 },
  fine: { min: 3.0, max: 6.9 },
  didnt_like: { min: 0.0, max: 2.9 }
};

/**
 * Configuration for zone-based scoring
 */
export const ZONE_CONFIG: ZoneConfig = {
  // Thresholds for different placement strategies based on collection size
  zoneThresholds: {
    simple: 4,    // 0-4 courses: Simple linear comparisons
    two_zone: 8,  // 5-8 courses: Two-zone approach (top/bottom)
    // 9+ courses: Full five-zone approach
  },
  
  // Base comparison counts for each strategy
  comparisonCounts: {
    direct: 0,       // No comparisons for direct placement (0-1 courses)
    simple: 2,       // Min comparisons for simple strategy
    two_zone: 3,     // Min comparisons for two-zone strategy
    full_zone: 4,    // Min comparisons for full-zone strategy
  },
  
  // Thresholds for triggering rebalancing
  rebalancingThresholds: {
    liked: 7,
    fine: 7,
    didnt_like: 5
  },
  
  // Minimum courses needed before rebalancing makes sense
  minCoursesForRebalancing: {
    liked: 5,
    fine: 5,
    didnt_like: 3
  }
};

/**
 * Calculate strategy based on collection size
 */
export function getPlacementStrategy(courseCount: number): 'direct' | 'simple' | 'two_zone' | 'full_zone' {
  if (courseCount <= 1) {
    return 'direct';
  } else if (courseCount <= ZONE_CONFIG.zoneThresholds.simple) {
    return 'simple';
  } else if (courseCount <= ZONE_CONFIG.zoneThresholds.two_zone) {
    return 'two_zone';
  } else {
    return 'full_zone';
  }
}

/**
 * Calculate initial position based on collection size and strategy
 */
export function calculateInitialPosition(courseCount: number, strategy: 'direct' | 'simple' | 'two_zone' | 'full_zone'): number {
  switch (strategy) {
    case 'direct':
      return courseCount + 1; // Position 1 for first course
    
    case 'simple':
      return Math.ceil(courseCount / 2); // Middle position for small collections
    
    case 'two_zone':
    case 'full_zone':
      // Middle position with slight randomization for larger collections
      const middle = Math.ceil(courseCount / 2);
      // Add slight variation (+/- 1) for collections > 10 to prevent predictable placements
      if (courseCount > 10) {
        const variation = Math.floor(Math.random() < 0.5 ? 0 : 1);
        return middle + (Math.random() < 0.5 ? -variation : variation);
      }
      return middle;
  }
}

/**
 * Calculate maximum comparisons based on collection size and strategy
 */
export function getComparisonCount(courseCount: number, strategy: 'direct' | 'simple' | 'two_zone' | 'full_zone'): number {
  // For direct placement, no comparisons needed
  if (strategy === 'direct' || courseCount <= 1) {
    return 0;
  }

  // Number of other courses (excluding the new one being placed)
  const otherCourseCount = courseCount;
  
  // Determine comparison count based on tier size as specified:
  if (otherCourseCount === 1) {
    // If only one other course, just one comparison
    return 1;
  } else if (otherCourseCount === 2) {
    // If two other courses, two comparisons
    return 2;
  } else if (otherCourseCount <= 5) {
    // 3-5 other courses: 3 comparisons 
    return 3;
  } else if (otherCourseCount <= 10) {
    // 6-10 other courses: 4 comparisons
    return 4;
  } else if (otherCourseCount <= 20) {
    // 11-20 other courses: 5 comparisons
    return 5;
  } else {
    // 21+ other courses: 6 comparisons
    return 6;
  }
}

/**
 * Define zone boundaries based on collection size and strategy
 */
export function defineZones(courseCount: number, strategy: 'direct' | 'simple' | 'two_zone' | 'full_zone') {
  switch (strategy) {
    case 'direct':
    case 'simple':
      // Single zone encompassing all positions
      return {
        top: { start: 1, end: courseCount + 1 },
        upper_middle: { start: 1, end: courseCount + 1 },
        middle: { start: 1, end: courseCount + 1 },
        lower_middle: { start: 1, end: courseCount + 1 },
        bottom: { start: 1, end: courseCount + 1 }
      };
    
    case 'two_zone':
      // Two zones - upper and lower half
      const midpoint = Math.ceil(courseCount / 2);
      return {
        top: { start: 1, end: midpoint },
        upper_middle: { start: 1, end: midpoint },
        middle: { start: midpoint, end: midpoint + 1 },
        lower_middle: { start: midpoint + 1, end: courseCount + 1 },
        bottom: { start: midpoint + 1, end: courseCount + 1 }
      };
    
    case 'full_zone':
      // Five distinct zones based on percentiles
      return {
        top: { start: 1, end: Math.max(2, Math.ceil(courseCount * 0.2)) },
        upper_middle: { 
          start: Math.max(2, Math.ceil(courseCount * 0.2)) + 1, 
          end: Math.ceil(courseCount * 0.4) 
        },
        middle: { 
          start: Math.ceil(courseCount * 0.4) + 1, 
          end: Math.ceil(courseCount * 0.6) 
        },
        lower_middle: { 
          start: Math.ceil(courseCount * 0.6) + 1, 
          end: Math.ceil(courseCount * 0.8) 
        },
        bottom: { 
          start: Math.ceil(courseCount * 0.8) + 1, 
          end: courseCount + 1 
        }
      };
  }
}

/**
 * Determine initial zone for placement based on strategy
 */
export function determineInitialZone(
  strategy: 'direct' | 'simple' | 'two_zone' | 'full_zone',
  initialPosition: number,
  courseCount: number
): 'top' | 'upper_middle' | 'middle' | 'lower_middle' | 'bottom' {
  switch (strategy) {
    case 'direct':
    case 'simple':
      return 'middle'; // Single zone
    
    case 'two_zone':
      const midpoint = Math.ceil(courseCount / 2);
      return initialPosition <= midpoint ? 'top' : 'bottom';
    
    case 'full_zone':
      // Default to middle zone for initial placement
      return 'middle';
  }
} 