/**
 * Score Display Utilities
 * 
 * Handles formatting of internal high-precision scores (0.01) for user display (0.1)
 * Maintains mathematical integrity internally while presenting clean UI
 */

/**
 * Formats a high-precision score for display to users
 * @param score - Internal score with up to 0.01 precision
 * @returns Score rounded to 1 decimal place for display
 */
export const formatScoreForDisplay = (score: number): number => {
  return Math.round(score * 10) / 10;
};

/**
 * Formats multiple scores for display
 * @param scores - Array of internal scores
 * @returns Array of scores formatted for display
 */
export const formatScoresForDisplay = (scores: number[]): number[] => {
  return scores.map(formatScoreForDisplay);
};

/**
 * Formats a score to string with consistent decimal places
 * @param score - Internal score
 * @param showDecimal - Whether to always show decimal place (default: true)
 * @returns Formatted score string (e.g., "2.9", "2.0")
 */
export const formatScoreToString = (score: number, showDecimal: boolean = true): string => {
  const displayScore = formatScoreForDisplay(score);
  return showDecimal ? displayScore.toFixed(1) : displayScore.toString();
}; 