import { SentimentRating } from './review';
import type { Course } from './review';

/**
 * Defines the different strategies for course placement based on collection size
 */
export type PlacementStrategy = 'direct' | 'simple' | 'two_zone' | 'full_zone';

/**
 * Zones in the scoring distribution
 */
export type PlacementZone = 
  | 'top' 
  | 'upper_middle' 
  | 'middle' 
  | 'lower_middle'
  | 'bottom';

/**
 * Defines boundaries for a zone in the ranking distribution
 */
export interface ZoneBoundaries {
  start: number;  // Starting position (inclusive)
  end: number;    // Ending position (inclusive)
}

/**
 * Result of a course comparison
 */
export type ComparisonResult = 
  | 'better'  // New course is preferred over comparison
  | 'worse'   // Comparison course is preferred over new course
  | 'skipped'; // User skipped comparison

/**
 * State for a course during placement
 */
export interface ZonePlacementState {
  courseId: string;
  sentiment: SentimentRating;
  strategy: PlacementStrategy;
  currentZone: PlacementZone;
  zones: Record<PlacementZone, ZoneBoundaries>;
  comparedCourseIds: Set<string>;
  completedComparisons: number;
  maxComparisons: number;
  lastComparisonResult?: ComparisonResult;
  bounds: {
    lower: number;
    upper: number;
  };
  courseRankMap: Map<string, number>; // Course ID to rank position mapping
  isComplete: boolean;
  // Track all previous comparison results for strategic selection
  previousComparisonResults: Array<{ 
    comparisonId: string; 
    result: 'better' | 'worse' | 'skipped' 
  }>;
  metricsData: {
    startTime: number;
    comparisonTimes: number[]; // Time in ms for each comparison
    zonesVisited: PlacementZone[];
  };
}

/**
 * Configuration for zone thresholds and comparison counts
 */
export interface ZoneConfig {
  zoneThresholds: {
    simple: number;   // Max courses for simple strategy
    two_zone: number; // Max courses for two-zone strategy
  };
  comparisonCounts: {
    direct: number;   // Comparisons for direct placement
    simple: number;   // Comparisons for simple strategy
    two_zone: number; // Base comparisons for two-zone strategy
    full_zone: number; // Base comparisons for full-zone strategy
  };
  rebalancingThresholds: {
    liked: number;
    fine: number;
    didnt_like: number;
  };
  minCoursesForRebalancing: {
    liked: number;
    fine: number;
    didnt_like: number;
  };
}

/**
 * Data for a persistent comparison modal
 */
export interface PersistentComparisonData {
  courseA: Course | null;
  courseB: Course | null;
  remainingComparisons: number;
  totalComparisons: number;
  currentSentiment: SentimentRating;
  previousCourseRating?: number;
  placementState: ZonePlacementState | null;
  isTransitioning: boolean;
  isRebalancing: boolean;
}

/**
 * Data passed between comparison screens
 */
export interface ComparisonNavigationParams {
  courseAId: string;
  courseBId: string;
  remainingComparisons: number;
  originalSentiment: SentimentRating;
  originalReviewedCourseId: string;
  isRebalancing?: boolean;
}

/**
 * Weight factors for course selection
 */
export interface CourseSelectionWeights {
  // Time since last comparison (higher = more weight)
  recencyFactor: number;
  // Inverse of comparison count (higher = more weight)
  countFactor: number;
  // Position relevance to target zone (higher = more weight)
  positionFactor: number;
} 