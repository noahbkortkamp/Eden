import { PlacementStrategy, ZonePlacementState, PlacementZone, ComparisonResult } from '../types/zonePlacement';
import { SentimentRating } from '../types/review';
import { getPlacementStrategy, calculateInitialPosition, getComparisonCount, defineZones, determineInitialZone } from '../config/zoneConfig';

/**
 * Initialize placement state for a course in a sentiment tier
 * Sets up the initial state for strategic middle-out comparison approach
 */
export function initPlacementState(
  courseId: string,
  sentiment: SentimentRating,
  existingCourseCount: number,
  existingCourseRanks: Record<string, number> = {}
): ZonePlacementState {
  // Determine placement strategy based on collection size
  const strategy = getPlacementStrategy(existingCourseCount);
  
  // Calculate initial position (middle by default)
  const initialPosition = calculateInitialPosition(existingCourseCount, strategy);
  
  // Define zone boundaries based on strategy
  const zones = defineZones(existingCourseCount, strategy);
  
  // Determine starting zone (middle by default for most strategies)
  const startingZone = determineInitialZone(strategy, initialPosition, existingCourseCount);
  
  // Calculate comparison count needed
  const maxComparisons = getComparisonCount(existingCourseCount, strategy);
  
  // Convert existing ranks to a map
  const courseRankMap = new Map<string, number>();
  Object.entries(existingCourseRanks).forEach(([id, rank]) => {
    courseRankMap.set(id, rank);
  });
  
  return {
    courseId,
    sentiment,
    strategy,
    currentZone: startingZone,
    zones,
    comparedCourseIds: new Set<string>(),
    completedComparisons: 0,
    maxComparisons,
    bounds: {
      lower: 1,
      upper: existingCourseCount + 1
    },
    courseRankMap,
    isComplete: maxComparisons === 0,
    previousComparisonResults: [],
    metricsData: {
      startTime: Date.now(),
      comparisonTimes: [],
      zonesVisited: [startingZone]
    }
  };
}

/**
 * Select next course for comparison based on current placement state
 * Uses strategic middle-out approach to efficiently find the correct placement
 */
export function selectNextComparisonCourse(
  state: ZonePlacementState,
  existingCourseIds: string[]
): string | null {
  // If completed all comparisons or no courses to compare, return null
  if (state.isComplete || existingCourseIds.length === 0) {
    return null;
  }
  
  // Filter out courses already compared and the current course
  const availableCourses = existingCourseIds.filter(
    id => !state.comparedCourseIds.has(id) && id !== state.courseId
  );
  
  if (availableCourses.length === 0) {
    return null;
  }
  
  // Get total number of existing courses plus the new one
  const totalCourseCount = existingCourseIds.length + 1;
  
  // For direct placement, no comparisons
  if (state.strategy === 'direct') {
    return null;
  }
  
  // Format previous comparison results for strategic selection
  const previousResults = state.previousComparisonResults || [];
  
  // Use strategic course selection for all placement strategies
  console.log(`[Selection] Using strategic selection for comparison #${state.completedComparisons + 1} with strategy: ${state.strategy}`);
  return getStrategicComparisonCourse(
    availableCourses,
    state.courseRankMap,
    state.completedComparisons,
    totalCourseCount,
    state.bounds,
    previousResults
  );
}

/**
 * Helper utility to find the median position course from a list of courses
 */
function getMedianPositionCourse(
  availableCourses: string[],
  courseRankMap: Map<string, number>
): string {
  if (availableCourses.length === 0) return '';
  if (availableCourses.length === 1) return availableCourses[0];
  
  // Sort by rank
  const sortedIds = [...availableCourses].sort((a, b) => {
    const rankA = courseRankMap.get(a) || Number.MAX_SAFE_INTEGER;
    const rankB = courseRankMap.get(b) || Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });
  
  // Return the median
  const medianIndex = Math.floor(sortedIds.length / 2);
  return sortedIds[medianIndex];
}

/**
 * Update placement state based on comparison result
 * Updates bounds and tracks comparison history for strategic selection
 */
export function updatePlacementAfterComparison(
  state: ZonePlacementState,
  comparisonCourseId: string,
  result: ComparisonResult
): ZonePlacementState {
  // Skip if comparison was skipped
  if (result === 'skipped') {
    // Track this skipped comparison
    const previousComparisonResults = state.previousComparisonResults || [];
    const newComparisonResults = [
      ...previousComparisonResults,
      { comparisonId: comparisonCourseId, result: 'skipped' }
    ];
    
    return {
      ...state,
      comparedCourseIds: new Set([...state.comparedCourseIds, comparisonCourseId]),
      completedComparisons: state.completedComparisons + 1,
      isComplete: state.completedComparisons + 1 >= state.maxComparisons,
      previousComparisonResults: newComparisonResults
    };
  }
  
  // Get the current position of the comparison course
  const comparisonPosition = state.courseRankMap.get(comparisonCourseId);
  if (comparisonPosition === undefined) {
    console.error('Comparison course position not found:', comparisonCourseId);
    return state;
  }
  
  // Calculate new bounds based on comparison result
  let newLower = state.bounds.lower;
  let newUpper = state.bounds.upper;
  let newZone = state.currentZone;
  
  if (result === 'better') {
    // New course is better than comparison course
    // So it should be ranked higher (lower position number)
    newUpper = Math.min(newUpper, comparisonPosition);
    
    // If we're using zones, potentially move up a zone
    if (state.strategy === 'two_zone' || state.strategy === 'full_zone') {
      newZone = adjustZoneAfterComparison(state.currentZone, 'up', state.strategy);
    }
  } else {
    // New course is worse than comparison course
    // So it should be ranked lower (higher position number)
    newLower = Math.max(newLower, comparisonPosition + 1);
    
    // If we're using zones, potentially move down a zone
    if (state.strategy === 'two_zone' || state.strategy === 'full_zone') {
      newZone = adjustZoneAfterComparison(state.currentZone, 'down', state.strategy);
    }
  }
  
  // Track metrics
  const comparisonTime = Date.now() - (
    state.metricsData.comparisonTimes.length > 0 
      ? state.metricsData.startTime + state.metricsData.comparisonTimes.reduce((a, b) => a + b, 0) 
      : state.metricsData.startTime
  );
  
  // Track this comparison result for strategic selection
  const previousComparisonResults = state.previousComparisonResults || [];
  const newComparisonResults = [
    ...previousComparisonResults,
    { comparisonId: comparisonCourseId, result: result === 'better' ? 'better' : 'worse' }
  ];
  
  // Return updated state
  return {
    ...state,
    bounds: { lower: newLower, upper: newUpper },
    currentZone: newZone,
    comparedCourseIds: new Set([...state.comparedCourseIds, comparisonCourseId]),
    completedComparisons: state.completedComparisons + 1,
    lastComparisonResult: result,
    isComplete: state.completedComparisons + 1 >= state.maxComparisons,
    previousComparisonResults: newComparisonResults,
    metricsData: {
      ...state.metricsData,
      comparisonTimes: [...state.metricsData.comparisonTimes, comparisonTime],
      zonesVisited: [...state.metricsData.zonesVisited, newZone]
    }
  };
}

/**
 * Zone-based adjustment helper for zone strategies
 * This is maintained for backward compatibility with zone-based approaches
 */
function adjustZoneAfterComparison(
  currentZone: PlacementZone,
  direction: 'up' | 'down',
  strategy: PlacementStrategy
): PlacementZone {
  if (strategy === 'two_zone') {
    // For two-zone strategy, can only be in top or bottom
    if (direction === 'up' && currentZone === 'bottom') return 'top';
    if (direction === 'down' && currentZone === 'top') return 'bottom';
    return currentZone; // No change if already at boundary
  }
  
  // For full zone strategy with five zones
  const zoneOrder: PlacementZone[] = ['top', 'upper_middle', 'middle', 'lower_middle', 'bottom'];
  const currentIndex = zoneOrder.indexOf(currentZone);
  
  if (direction === 'up') {
    // Move up a zone (if not already at top)
    return currentIndex > 0 ? zoneOrder[currentIndex - 1] : currentZone;
  } else {
    // Move down a zone (if not already at bottom)
    return currentIndex < zoneOrder.length - 1 ? zoneOrder[currentIndex + 1] : currentZone;
  }
}

/**
 * Check for inconsistent comparison results within a set of comparisons
 * Detects circular preferences like A > B > C > A
 */
function detectContradictions(results: Array<{ comparisonId: string, result: 'better' | 'worse' | 'skipped' }>): boolean {
  // Build a directed graph of preferences
  const preferenceGraph: Record<string, string[]> = {};
  
  // Initialize graph
  for (const { comparisonId } of results) {
    if (!preferenceGraph[comparisonId]) {
      preferenceGraph[comparisonId] = [];
    }
  }
  
  // Fill graph with edges (A preferred over B)
  for (let i = 0; i < results.length; i++) {
    const current = results[i];
    if (current.result === 'better') {
      // New course preferred over comparison course
      // This doesn't create an edge in our graph since we're tracking comparison courses
      continue;
    } else if (current.result === 'worse') {
      // Comparison course preferred over new course
      // Add edge showing comparison course is preferred
      preferenceGraph[current.comparisonId] = preferenceGraph[current.comparisonId] || [];
      
      // Add edges to courses that were "worse" than the new course
      for (let j = 0; j < i; j++) {
        const earlier = results[j];
        if (earlier.result === 'better') {
          preferenceGraph[current.comparisonId].push(earlier.comparisonId);
        }
      }
    }
  }
  
  // Check for cycles in the graph using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function hasCycle(node: string): boolean {
    if (recursionStack.has(node)) return true;
    if (visited.has(node)) return false;
    
    visited.add(node);
    recursionStack.add(node);
    
    const neighbors = preferenceGraph[node] || [];
    for (const neighbor of neighbors) {
      if (hasCycle(neighbor)) return true;
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  // Check each node for cycles
  for (const node in preferenceGraph) {
    if (hasCycle(node)) {
      console.log(`[Contradiction] Detected circular preference in comparisons`);
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate final position for a course after all comparisons
 * Enhanced to provide more accurate boundary testing for top and bottom placements
 * This uses the comparison history to make intelligent placement decisions
 * based on observed performance patterns
 */
export function calculateFinalPosition(
  state: ZonePlacementState
): number {
  // If we've narrowed down to a single position
  if (state.bounds.lower === state.bounds.upper) {
    return state.bounds.lower;
  }
  
  // Extract comparison history for analysis
  const comparisonPath = state.previousComparisonResults?.map(r => r.result).join('-') || '';
  
  // EDGE CASE: Small tier handling (1-3 courses)
  const totalExistingCourses = state.courseRankMap.size;
  if (totalExistingCourses <= 3) {
    console.log(`[Small Tier] Handling small tier with only ${totalExistingCourses} existing courses`);
    
    // If this is the 1st or 2nd course in the tier, placement is much simpler
    if (totalExistingCourses <= 1) {
      // For the 1st or 2nd course, just check if it beat the existing course
      if (comparisonPath.includes('better')) {
        console.log(`[Small Tier] New course beat the only existing course, placing at position 1`);
        return 1;
      } else if (comparisonPath.includes('worse')) {
        console.log(`[Small Tier] New course ranked below the only existing course, placing at position 2`);
        return 2;
      }
      // If all comparisons were skipped, default to end of list
      return totalExistingCourses + 1;
    }
    
    // For 2-3 existing courses, count wins and losses for simplicity
    const betterCount = (comparisonPath.match(/better/g) || []).length;
    const worseCount = (comparisonPath.match(/worse/g) || []).length;
    
    // Simple approach - rank by win percentage
    const totalComparisons = betterCount + worseCount;
    if (totalComparisons === 0) return totalExistingCourses + 1; // All skipped
    
    const winPercentage = betterCount / totalComparisons;
    
    if (winPercentage >= 0.67) {
      // Won 2/3 or more comparisons, place at top
      console.log(`[Small Tier] New course won ${betterCount}/${totalComparisons} comparisons, placing at position 1`);
      return 1;
    } else if (winPercentage >= 0.33) {
      // Won 1/3 to 2/3 of comparisons, place in middle
      const middlePosition = Math.ceil((totalExistingCourses + 1) / 2);
      console.log(`[Small Tier] New course had mixed results, placing at middle position ${middlePosition}`);
      return middlePosition;
    } else {
      // Won less than 1/3 of comparisons, place at bottom
      console.log(`[Small Tier] New course lost most comparisons, placing at position ${totalExistingCourses + 1}`);
      return totalExistingCourses + 1;
    }
  }
  
  // EDGE CASE: Check for inconsistent comparison results
  if (detectContradictions(state.previousComparisonResults || [])) {
    console.log(`[Contradiction] Detected inconsistent preferences, using fallback placement strategy`);
    
    // Count wins and losses as a fallback when contradictions exist
    const betterCount = (comparisonPath.match(/better/g) || []).length;
    const worseCount = (comparisonPath.match(/worse/g) || []).length;
    const totalComparisons = betterCount + worseCount;
    
    if (totalComparisons === 0) {
      // All comparisons were skipped, place in middle
      const middlePosition = Math.ceil((state.bounds.lower + state.bounds.upper) / 2);
      console.log(`[Contradiction] All comparisons skipped, using middle position ${middlePosition}`);
      return middlePosition;
    }
    
    // Calculate position based on win ratio
    const winRatio = betterCount / totalComparisons;
    const positionRange = state.bounds.upper - state.bounds.lower;
    const relativePosition = Math.floor(positionRange * (1 - winRatio));
    const position = state.bounds.lower + relativePosition;
    
    console.log(`[Contradiction] Using win ratio ${winRatio.toFixed(2)} to place at position ${position}`);
    return position;
  }
  
  // Special boundary handling for top position
  if (state.bounds.lower === 1) {
    // Check if this course has consistently outperformed top-ranked courses
    const hasBeatenTopCourses = comparisonPath.startsWith('better-better-better') || 
                               (comparisonPath.startsWith('better-better') && !comparisonPath.includes('worse'));
    
    // Check if we've explicitly compared with the #1 course
    const comparedCourseIds = state.previousComparisonResults?.map(r => r.comparisonId) || [];
    const topRankedCourseIds = [...state.courseRankMap.entries()]
      .filter(([_, position]) => position === 1)
      .map(([id]) => id);
    
    const hasComparedWithTopCourse = topRankedCourseIds.some(id => comparedCourseIds.includes(id));
    
    // Logic for #1 placement
    if (hasBeatenTopCourses) {
      if (hasComparedWithTopCourse) {
        console.log(`[Boundary Test] Course has outperformed the #1 course, placing at position 1`);
        return 1;
      } else {
        console.log(`[Boundary Test] Course has performed well but not explicitly compared with #1`);
        // Only place at #1 if consistent excellent performance and current bounds suggest it
        if (state.bounds.upper <= 2 && comparisonPath.indexOf('worse') === -1) {
          console.log(`[Boundary Test] Strong performance evidence supports #1 placement`);
          return 1;
        }
      }
    }
  }
  
  // Special boundary handling for bottom position
  const bottomBoundary = state.courseRankMap.size + 1;
  if (state.bounds.upper === bottomBoundary || state.bounds.upper === bottomBoundary - 1) {
    // Check if this course has consistently performed poorly
    const hasLostToBottomCourses = comparisonPath.startsWith('worse-worse-worse') ||
                                  (comparisonPath.startsWith('worse-worse') && !comparisonPath.includes('better'));
    
    if (hasLostToBottomCourses) {
      console.log(`[Boundary Test] Course has performed poorly against bottom courses, placing at bottom`);
      return state.bounds.upper - 1;
    }
  }
  
  // For high performers who didn't quite reach #1
  if (comparisonPath.startsWith('better-better') && comparisonPath.includes('worse')) {
    // Place in upper portion of the range, but not at the very top
    const upperPosition = Math.min(state.bounds.lower + 1, state.bounds.upper - 1);
    console.log(`[Boundary Test] Strong performer but not #1, placing at position ${upperPosition}`);
    return upperPosition;
  }
  
  // For consistently poor performers who aren't at the very bottom
  if (comparisonPath.startsWith('worse-worse') && comparisonPath.includes('better')) {
    // Place in lower portion of the range, but not at the very bottom
    const lowerPosition = Math.max(state.bounds.upper - 1, state.bounds.lower + 1);
    console.log(`[Boundary Test] Poor performer but not worst, placing at position ${lowerPosition}`);
    return lowerPosition;
  }
  
  // Default: middle of the remaining range
  const middlePosition = Math.ceil((state.bounds.lower + state.bounds.upper) / 2);
  console.log(`[Boundary Test] Using middle position ${middlePosition} within bounds ${state.bounds.lower}-${state.bounds.upper}`);
  return middlePosition;
}

/**
 * Strategic course selection for middle-out comparison approach
 * This implements the specific sequence:
 * 1. First comparison with middle course
 * 2. Second comparison with top or bottom course based on first result
 * 3. Subsequent comparisons from top 10% or bottom portion based on results
 * 4. Strategic sampling within top/bottom ranges for more accurate placement
 * 5. Explicit boundary testing for potential top and bottom positions
 * 
 * This implementation focuses on efficient placement with enhanced accuracy at
 * boundary positions (top and bottom) through strategic sampling and explicit testing.
 */
export function getStrategicComparisonCourse(
  availableCourses: string[],
  courseRankMap: Map<string, number>,
  completedComparisons: number,
  totalCourseCount: number,
  currentBounds: { lower: number, upper: number },
  previousResults: Array<{ comparisonId: string, result: 'better' | 'worse' | 'skipped' }> = []
): string | null {
  if (availableCourses.length === 0) return null;
  if (availableCourses.length === 1) return availableCourses[0];
  
  // Sort available courses by rank position (lowest position/highest rank first)
  const sortedCourses = [...availableCourses].sort((a, b) => {
    const rankA = courseRankMap.get(a) || Number.MAX_SAFE_INTEGER;
    const rankB = courseRankMap.get(b) || Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });
  
  // Track which courses have already been compared
  const previousCourseIds = previousResults.map(r => r.comparisonId);
  
  // Helper function to get comparison results history
  const getComparisonPath = () => {
    return previousResults.map(r => r.result).join('-');
  };
  
  // Helper function to get courses in a specific percentile range that haven't been compared yet
  const getCoursesInPercentileRange = (startPercentile: number, endPercentile: number) => {
    const startIndex = Math.floor(sortedCourses.length * startPercentile);
    const endIndex = Math.min(sortedCourses.length - 1, Math.floor(sortedCourses.length * endPercentile));
    
    return sortedCourses
      .slice(startIndex, endIndex + 1)
      .filter(id => !previousCourseIds.includes(id));
  };
  
  // BOUNDARY TESTING: Get specific ranked course if available and not yet compared
  const getSpecificRankedCourse = (targetRank: number) => {
    const courseAtRank = [...courseRankMap.entries()]
      .find(([_, rank]) => rank === targetRank)?.[0];
      
    if (courseAtRank && !previousCourseIds.includes(courseAtRank) && availableCourses.includes(courseAtRank)) {
      return courseAtRank;
    }
    return null;
  };
  
  // Helper: Find if we're approaching boundary conditions
  const isApproachingTopBoundary = () => currentBounds.lower <= 2;
  const isApproachingBottomBoundary = () => {
    const maxPosition = Math.max(...Array.from(courseRankMap.values())) + 1;
    return currentBounds.upper >= maxPosition - 1;
  };
  
  // FIRST COMPARISON: Always use the middle-ranked course
  if (completedComparisons === 0) {
    const medianIndex = Math.floor(sortedCourses.length / 2);
    const medianCourse = sortedCourses[medianIndex];
    console.log(`[Strategic] 1st comparison: Using median-ranked course at position ${courseRankMap.get(medianCourse)}`);
    return medianCourse;
  }
  
  // SECOND COMPARISON: Use top or bottom ranked course based on first result
  if (completedComparisons === 1) {
    const firstResult = previousResults[0]?.result;
    
    // If user preferred the new course over the median course, show top course
    if (firstResult === 'better') {
      // BOUNDARY TEST: Always test against the absolute #1 ranked course if available
      const topRankedCourse = getSpecificRankedCourse(1) || sortedCourses[0];
      console.log(`[Strategic] 2nd comparison: User preferred new course, showing top-ranked course at position ${courseRankMap.get(topRankedCourse)}`);
      return topRankedCourse;
    }
    // If user preferred the median course over the new course, show bottom course
    else {
      // BOUNDARY TEST: Always test against the absolute bottom ranked course if available
      const bottomRank = Math.max(...Array.from(courseRankMap.values()));
      const bottomRankedCourse = getSpecificRankedCourse(bottomRank) || sortedCourses[sortedCourses.length - 1];
      console.log(`[Strategic] 2nd comparison: User preferred existing course, showing bottom-ranked course at position ${courseRankMap.get(bottomRankedCourse)}`);
      return bottomRankedCourse;
    }
  }
  
  // THIRD COMPARISON: Refine placement based on first two results
  if (completedComparisons === 2) {
    const firstResult = previousResults[0]?.result;
    const secondResult = previousResults[1]?.result;
    
    // If user preferred new course over both median and top course
    if (firstResult === 'better' && secondResult === 'better') {
      // EXPLICIT BOUNDARY TEST: Has this course beaten the #1 course?
      const comparedTopCourseId = previousResults[1]?.comparisonId;
      const comparedTopCourseRank = courseRankMap.get(comparedTopCourseId) || 0;
      
      if (comparedTopCourseRank === 1) {
        // Already compared with #1 and won, find another top 5% course
        console.log(`[Strategic] 3rd comparison: Course has already beaten #1 ranked course`);
        const topEliteCourses = getCoursesInPercentileRange(0, 0.05);
        
        if (topEliteCourses.length > 0) {
          const courseToCompare = topEliteCourses[0];
          console.log(`[Strategic] 3rd comparison: Confirming elite performance, testing against another top 5% course at position ${courseRankMap.get(courseToCompare)}`);
          return courseToCompare;
        }
      } else {
        // If we haven't compared with #1 yet, do that now
        const topRankedCourse = getSpecificRankedCourse(1);
        if (topRankedCourse) {
          console.log(`[Strategic] 3rd comparison: BOUNDARY TEST - Explicitly testing against #1 ranked course at position ${courseRankMap.get(topRankedCourse)}`);
          return topRankedCourse;
        }
        
        // If #1 not available, continue with regular strategy
        const topFivePercentCourses = getCoursesInPercentileRange(0, 0.05);
        
        if (topFivePercentCourses.length > 0) {
          const courseToCompare = topFivePercentCourses[0];
          console.log(`[Strategic] 3rd comparison: Excellent performance, testing against top 5% course at position ${courseRankMap.get(courseToCompare)}`);
          return courseToCompare;
        }
      }
      
      // Fallback to another top 10% course if no top 5% courses are available
      const topTenPercentCourses = getCoursesInPercentileRange(0, 0.1);
      
      if (topTenPercentCourses.length > 0) {
        const courseToCompare = topTenPercentCourses[0];
        console.log(`[Strategic] 3rd comparison: Great performance, testing against top 10% course at position ${courseRankMap.get(courseToCompare)}`);
        return courseToCompare;
      }
    }
    // If user preferred new course over median but not over top course
    else if (firstResult === 'better' && secondResult === 'worse') {
      // Find a course in the upper quarter (between top and median)
      // More precise: target upper 10-25% range
      const upperQuarterCourses = getCoursesInPercentileRange(0.1, 0.25);
      
      if (upperQuarterCourses.length > 0) {
        const courseToCompare = upperQuarterCourses[Math.floor(upperQuarterCourses.length / 2)];
        console.log(`[Strategic] 3rd comparison: Good performance, testing against upper quarter course at position ${courseRankMap.get(courseToCompare)}`);
        return courseToCompare;
      }
    }
    // If user preferred median over new course but new course over bottom course
    else if (firstResult === 'worse' && secondResult === 'better') {
      // Find a course in the lower middle range (between median and bottom)
      // More precise: target 60-75% range
      const lowerMiddleCourses = getCoursesInPercentileRange(0.6, 0.75);
      
      if (lowerMiddleCourses.length > 0) {
        const courseToCompare = lowerMiddleCourses[Math.floor(lowerMiddleCourses.length / 2)];
        console.log(`[Strategic] 3rd comparison: Below average performance, testing against lower middle course at position ${courseRankMap.get(courseToCompare)}`);
        return courseToCompare;
      }
    }
    // If user preferred median and bottom over new course
    else if (firstResult === 'worse' && secondResult === 'worse') {
      // EXPLICIT BOUNDARY TEST: Has this course lost to the lowest ranked course?
      const comparedBottomCourseId = previousResults[1]?.comparisonId;
      const comparedBottomCourseRank = courseRankMap.get(comparedBottomCourseId) || 0;
      const maxRank = Math.max(...Array.from(courseRankMap.values()));
      
      if (comparedBottomCourseRank === maxRank) {
        // Already lost to the bottom ranked course, find another bottom 5% course
        console.log(`[Strategic] 3rd comparison: Course has already lost to lowest ranked course`);
        const bottomFivePercentCourses = getCoursesInPercentileRange(0.95, 1.0);
        
        if (bottomFivePercentCourses.length > 0) {
          const courseToCompare = bottomFivePercentCourses[bottomFivePercentCourses.length - 1];
          console.log(`[Strategic] 3rd comparison: Confirming very poor performance, testing against another bottom 5% course at position ${courseRankMap.get(courseToCompare)}`);
          return courseToCompare;
        }
      } else {
        // If we haven't compared with the absolute bottom yet, do that now
        const bottomRankedCourse = getSpecificRankedCourse(maxRank);
        if (bottomRankedCourse) {
          console.log(`[Strategic] 3rd comparison: BOUNDARY TEST - Explicitly testing against lowest ranked course at position ${courseRankMap.get(bottomRankedCourse)}`);
          return bottomRankedCourse;
        }
        
        // Otherwise, use regular strategy
        const lowerBottomCourses = getCoursesInPercentileRange(0.9, 0.95);
        
        if (lowerBottomCourses.length > 0) {
          const courseToCompare = lowerBottomCourses[Math.floor(lowerBottomCourses.length / 2)];
          console.log(`[Strategic] 3rd comparison: Poor performance, testing against lower bottom course at position ${courseRankMap.get(courseToCompare)}`);
          return courseToCompare;
        }
      }
    }
  }
  
  // FOURTH+ COMPARISONS: Strategic sampling based on performance pattern
  if (completedComparisons >= 3) {
    const comparisonPath = getComparisonPath();
    console.log(`[Strategic] Comparison path so far: ${comparisonPath}`);
    
    // BOUNDARY TESTS FOR LATE-STAGE COMPARISONS
    
    // If approaching top boundary and haven't explicitly compared with #1
    if (isApproachingTopBoundary() && comparisonPath.indexOf('better') !== -1) {
      const topRankedCourse = getSpecificRankedCourse(1);
      if (topRankedCourse && !previousCourseIds.includes(topRankedCourse)) {
        console.log(`[Strategic] Comparison #${completedComparisons + 1}: BOUNDARY TEST - Explicitly testing against #1 ranked course at position ${courseRankMap.get(topRankedCourse)}`);
        return topRankedCourse;
      }
    }
    
    // If approaching bottom boundary and haven't explicitly compared with lowest
    if (isApproachingBottomBoundary() && comparisonPath.indexOf('worse') !== -1) {
      const maxRank = Math.max(...Array.from(courseRankMap.values()));
      const bottomRankedCourse = getSpecificRankedCourse(maxRank);
      if (bottomRankedCourse && !previousCourseIds.includes(bottomRankedCourse)) {
        console.log(`[Strategic] Comparison #${completedComparisons + 1}: BOUNDARY TEST - Explicitly testing against lowest ranked course at position ${courseRankMap.get(bottomRankedCourse)}`);
        return bottomRankedCourse;
      }
    }
    
    // Potential top performer (won against top courses)
    if (comparisonPath.startsWith('better-better-better')) {
      // Course is outperforming even top courses - continue testing in top 5%
      // This helps confirm if it should be #1 or just in the top tier
      
      // Try to find the absolute #1 course if not already compared
      const topCourse = getSpecificRankedCourse(1);
      if (topCourse) {
        console.log(`[Strategic] Comparison #${completedComparisons + 1}: Exceptional performance, testing against #1 course at position ${courseRankMap.get(topCourse)}`);
        return topCourse;
      }
      
      // Otherwise find another top 5% course
      const topEliteCourses = getCoursesInPercentileRange(0, 0.05);
      if (topEliteCourses.length > 0) {
        const courseToCompare = topEliteCourses[0];
        console.log(`[Strategic] Comparison #${completedComparisons + 1}: Exceptional performance, testing against elite top 5% course at position ${courseRankMap.get(courseToCompare)}`);
        return courseToCompare;
      }
    }
    // High performer (better than median, mixed against top courses)
    else if (comparisonPath.startsWith('better-better') || 
             (comparisonPath.startsWith('better') && comparisonPath.includes('better-better'))) {
      // Find courses in top 15% for more precise placement
      const topTierCourses = getCoursesInPercentileRange(0, 0.15);
      
      if (topTierCourses.length > 0) {
        // For more precise placement, pick a course we haven't compared with yet
        const courseToCompare = topTierCourses[0];
        console.log(`[Strategic] Comparison #${completedComparisons + 1}: Strong performance, testing against top 15% course at position ${courseRankMap.get(courseToCompare)}`);
        return courseToCompare;
      }
    }
    // Above average performer (better than median, worse than top)
    else if (comparisonPath.startsWith('better-worse')) {
      // Target the 15-35% range for more precise placement
      const upperMiddleCourses = getCoursesInPercentileRange(0.15, 0.35);
      
      if (upperMiddleCourses.length > 0) {
        const courseToCompare = upperMiddleCourses[Math.floor(upperMiddleCourses.length / 2)];
        console.log(`[Strategic] Comparison #${completedComparisons + 1}: Above average performance, testing against upper middle course at position ${courseRankMap.get(courseToCompare)}`);
        return courseToCompare;
      }
    }
    // Below average performer (worse than median, better than bottom)
    else if (comparisonPath.startsWith('worse-better')) {
      // Target the 60-80% range for more precise placement
      const lowerMiddleCourses = getCoursesInPercentileRange(0.6, 0.8);
      
      if (lowerMiddleCourses.length > 0) {
        const courseToCompare = lowerMiddleCourses[Math.floor(lowerMiddleCourses.length / 2)];
        console.log(`[Strategic] Comparison #${completedComparisons + 1}: Below average performance, testing against lower middle course at position ${courseRankMap.get(courseToCompare)}`);
        return courseToCompare;
      }
    }
    // Poor performer (worse than both median and bottom)
    else if (comparisonPath.startsWith('worse-worse-worse')) {
      // Find if there's an absolute bottom course to compare against
      const maxRank = Math.max(...Array.from(courseRankMap.values()));
      const absoluteBottomCourse = getSpecificRankedCourse(maxRank);
      if (absoluteBottomCourse) {
        console.log(`[Strategic] Comparison #${completedComparisons + 1}: Very poor performance, testing against absolute bottom course at position ${courseRankMap.get(absoluteBottomCourse)}`);
        return absoluteBottomCourse;
      }
      
      // Otherwise target the bottom 5% for precise placement
      const bottomCourses = getCoursesInPercentileRange(0.95, 1.0);
      if (bottomCourses.length > 0) {
        const courseToCompare = bottomCourses[bottomCourses.length - 1]; // Pick lowest
        console.log(`[Strategic] Comparison #${completedComparisons + 1}: Very poor performance, testing against bottom 5% course at position ${courseRankMap.get(courseToCompare)}`);
        return courseToCompare;
      }
    }
    // Low performer (worse than median, mixed against bottom courses)
    else if (comparisonPath.startsWith('worse-worse')) {
      // Target the 80-95% range for more precise placement
      const bottomTierCourses = getCoursesInPercentileRange(0.8, 0.95);
      
      if (bottomTierCourses.length > 0) {
        const courseToCompare = bottomTierCourses[Math.floor(bottomTierCourses.length / 2)];
        console.log(`[Strategic] Comparison #${completedComparisons + 1}: Poor performance, testing against bottom tier course at position ${courseRankMap.get(courseToCompare)}`);
        return courseToCompare;
      }
    }
    
    // If specific logic didn't apply, use current bounds to estimate an appropriate placement
    const targetPosition = Math.ceil((currentBounds.lower + currentBounds.upper) / 2);
    
    // Try to find a course at exactly the target position for more precise placement
    const courseAtTargetPosition = getSpecificRankedCourse(targetPosition);
    if (courseAtTargetPosition) {
      console.log(`[Strategic] Comparison #${completedComparisons + 1}: Found course exactly at target position ${targetPosition}`);
      return courseAtTargetPosition;
    }
    
    // Otherwise find closest available course
    let closestCourse = null;
    let closestDistance = Number.MAX_SAFE_INTEGER;
    
    for (const courseId of sortedCourses) {
      // Skip courses that have already been compared
      if (previousCourseIds.includes(courseId)) continue;
      
      const position = courseRankMap.get(courseId) || 0;
      const distance = Math.abs(position - targetPosition);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCourse = courseId;
      }
    }
    
    if (closestCourse) {
      console.log(`[Strategic] Comparison #${completedComparisons + 1}: Using course at position ${courseRankMap.get(closestCourse)}, closest to target ${targetPosition}`);
      return closestCourse;
    }
  }
  
  // Fallback: If all else fails, find any course that hasn't been compared yet
  const unusedCourses = sortedCourses.filter(id => !previousCourseIds.includes(id));
  if (unusedCourses.length > 0) {
    const fallbackCourse = unusedCourses[0];
    console.log(`[Strategic] Fallback: Using course at position ${courseRankMap.get(fallbackCourse)}`);
    return fallbackCourse;
  }
  
  // If we've compared with all available courses, return null
  return null;
}