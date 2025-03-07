// Weights for different aspects of the course
const WEIGHTS = {
  overallRating: 0.3,      // Overall star rating (1-5)
  difficulty: 0.15,        // Course difficulty rating
  conditions: 0.2,         // Course conditions rating
  value: 0.15,            // Value for money rating
  amenities: 0.1,         // Amenities rating
  tags: 0.1,              // Selected tags impact
};

// Tag impact scores (positive and negative)
const TAG_IMPACTS = {
  // Layout tags
  'Challenging Layout': 0.8,
  'Strategic Design': 0.7,
  'Open Fairways': 0.6,
  'Tight Fairways': 0.7,
  'Elevation Changes': 0.6,
  'Water Hazards': 0.7,
  'Bunker Placement': 0.6,
  'Dogleg Holes': 0.5,
  'Par 3 Course': 0.4,
  'Links Style': 0.7,

  // Conditions tags
  'Perfect Greens': 0.8,
  'Well-Maintained': 0.7,
  'Fast Greens': 0.6,
  'True Roll': 0.6,
  'Firm Fairways': 0.5,
  'Lush Rough': 0.5,
  'Pristine Bunkers': 0.6,
  'Excellent Tee Boxes': 0.5,
  'Good Drainage': 0.4,
  'Scenic Views': 0.3,

  // Amenities tags
  'Pro Shop': 0.3,
  'Driving Range': 0.4,
  'Practice Green': 0.4,
  'Clubhouse': 0.3,
  'Restaurant': 0.3,
  'Caddie Service': 0.5,
  'Cart Service': 0.4,
  'Locker Room': 0.3,
  'Golf Lessons': 0.4,
  'Tournament Ready': 0.5,

  // Value tags
  'Great Value': 0.7,
  'Premium Experience': 0.6,
  'Reasonable Rates': 0.6,
  'Membership Benefits': 0.5,
  'Special Offers': 0.4,
  'Weekend Rates': 0.3,
  'Twilight Specials': 0.3,
  'Group Discounts': 0.3,
  'Season Passes': 0.4,
  'Stay & Play': 0.5,
};

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

export function calculateCourseScore(reviewData: ReviewData): number {
  // Convert 1-5 ratings to 0-10 scale
  const overallScore = (reviewData.rating / 5) * 10;
  
  // Convert comparison ratings to 0-10 scale
  const difficultyScore = (reviewData.comparison.difficulty / 5) * 10;
  const conditionsScore = (reviewData.comparison.conditions / 5) * 10;
  const valueScore = (reviewData.comparison.value / 5) * 10;
  const amenitiesScore = (reviewData.comparison.amenities / 5) * 10;

  // Calculate tag impact score
  const tagScore = reviewData.tags.reduce((acc, tag) => {
    return acc + (TAG_IMPACTS[tag as keyof typeof TAG_IMPACTS] || 0);
  }, 0) / Math.max(reviewData.tags.length, 1); // Normalize by number of tags

  // Calculate weighted average
  const finalScore = 
    overallScore * WEIGHTS.overallRating +
    difficultyScore * WEIGHTS.difficulty +
    conditionsScore * WEIGHTS.conditions +
    valueScore * WEIGHTS.value +
    amenitiesScore * WEIGHTS.amenities +
    tagScore * WEIGHTS.tags;

  // Round to 1 decimal place
  return Math.round(finalScore * 10) / 10;
}

export function getScoreBreakdown(reviewData: ReviewData) {
  const overallScore = (reviewData.rating / 5) * 10;
  const difficultyScore = (reviewData.comparison.difficulty / 5) * 10;
  const conditionsScore = (reviewData.comparison.conditions / 5) * 10;
  const valueScore = (reviewData.comparison.value / 5) * 10;
  const amenitiesScore = (reviewData.comparison.amenities / 5) * 10;

  const tagScore = reviewData.tags.reduce((acc, tag) => {
    return acc + (TAG_IMPACTS[tag as keyof typeof TAG_IMPACTS] || 0);
  }, 0) / Math.max(reviewData.tags.length, 1);

  return {
    overall: {
      score: overallScore,
      weight: WEIGHTS.overallRating,
      weightedScore: overallScore * WEIGHTS.overallRating
    },
    difficulty: {
      score: difficultyScore,
      weight: WEIGHTS.difficulty,
      weightedScore: difficultyScore * WEIGHTS.difficulty
    },
    conditions: {
      score: conditionsScore,
      weight: WEIGHTS.conditions,
      weightedScore: conditionsScore * WEIGHTS.conditions
    },
    value: {
      score: valueScore,
      weight: WEIGHTS.value,
      weightedScore: valueScore * WEIGHTS.value
    },
    amenities: {
      score: amenitiesScore,
      weight: WEIGHTS.amenities,
      weightedScore: amenitiesScore * WEIGHTS.amenities
    },
    tags: {
      score: tagScore,
      weight: WEIGHTS.tags,
      weightedScore: tagScore * WEIGHTS.tags
    }
  };
} 