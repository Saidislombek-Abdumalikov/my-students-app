/**
 * Score & Test Integrity Validation Utility for Teacher OS.
 * Enforces canonical score bounds and computes accurate percentages and IELTS band scores.
 */

export interface ValidatedScoreResult {
  score: number;
  maxScore: number;
  percentage: number;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates and clamps a raw score against a test's maximum score,
 * and calculates the exact integer percentage (0 - 100%).
 */
export function validateAndFormatScore(
  rawScore: number,
  maxScore: number = 100,
  category: string = 'GENERAL'
): ValidatedScoreResult {
  const isIELTS = category.startsWith('IELTS');
  const safeMax = maxScore > 0 ? maxScore : isIELTS ? 9.0 : 100;
  
  // Clamp score between 0 and maxScore
  const clampedScore = Math.min(safeMax, Math.max(0, isNaN(rawScore) ? 0 : rawScore));
  
  // Calculate accurate percentage
  const percentage = Math.round((clampedScore / safeMax) * 100);

  return {
    score: clampedScore,
    maxScore: safeMax,
    percentage,
    isValid: rawScore >= 0 && rawScore <= safeMax,
    errorMessage: rawScore > safeMax ? `Score cannot exceed maximum score of ${safeMax}` : undefined
  };
}

/**
 * Calculates IELTS overall band score from 4 subskill scores (Reading, Listening, Writing, Speaking),
 * rounded to the nearest 0.5 according to official IELTS rules.
 */
export function calculateIELTSOverallBand(
  listening: number,
  reading: number,
  writing: number,
  speaking: number
): number {
  const avg = (listening + reading + writing + speaking) / 4;
  const rounded = Math.round(avg * 2) / 2;
  return Math.min(9.0, Math.max(0.0, rounded));
}
