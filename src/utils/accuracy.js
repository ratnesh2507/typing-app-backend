/**
 * Calculate typing accuracy
 * @param {number} correctChars
 * @param {number} totalTypedChars
 */
export function calculateAccuracy(correctChars, totalTypedChars) {
  if (totalTypedChars === 0) return 0;

  return Math.round((correctChars / totalTypedChars) * 100);
}
