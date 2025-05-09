// Simple sentiment-based scoring for review screen
// This replaces the complex weighted scoring system while maintaining compatibility

interface ReviewData {
  rating: number;
  comparison: {
    difficulty: number;
    conditions: number;
    value: number;
    amenities: number;
  };
  tags: string[];
}

// Convert 5-star rating to sentiment-aligned 10-point score
export function calculateCourseScore(reviewData: ReviewData): number {
  // Map 1-5 star rating to our 0-10 scale
  // 5 stars → 10.0 (Liked)
  // 4 stars → 8.5 (Liked)
  // 3 stars → 6.5 (Fine)
  // 2 stars → 4.0 (Fine)
  // 1 star → 1.5 (Didn't Like)
  const scoreMap: {[key: number]: number} = {
    5: 10.0,
    4: 8.5,
    3: 6.5,
    2: 4.0,
    1: 1.5
  };
  
  // Return the mapped score, defaulting to 5.0 if rating is invalid
  return scoreMap[reviewData.rating] || 5.0;
}

// Provide simplified score breakdown that matches the UI expectations
export function getScoreBreakdown(reviewData: ReviewData) {
  const baseScore = calculateCourseScore(reviewData);
  
  // Each category gets equal weight (1/6 each)
  const defaultWeight = 1/6;
  
  // Create simplified breakdown with equal weights
  return {
    overall: {
      score: baseScore,
      weight: defaultWeight,
      weightedScore: baseScore * defaultWeight / 10 // Normalize for visualization
    },
    difficulty: {
      score: baseScore,
      weight: defaultWeight,
      weightedScore: baseScore * defaultWeight / 10
    },
    conditions: {
      score: baseScore,
      weight: defaultWeight,
      weightedScore: baseScore * defaultWeight / 10
    },
    value: {
      score: baseScore,
      weight: defaultWeight,
      weightedScore: baseScore * defaultWeight / 10
    },
    amenities: {
      score: baseScore,
      weight: defaultWeight,
      weightedScore: baseScore * defaultWeight / 10
    },
    tags: {
      score: baseScore,
      weight: defaultWeight,
      weightedScore: baseScore * defaultWeight / 10
    }
  };
} 