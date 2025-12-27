/**
 * Calculate Words Per Minute (WPM)
 * @param {number} charsTyped - number of characters typed
 * @param {number} startTime - race start timestamp (ms)
 * @param {number} endTime - finish timestamp (ms)
 */
export function calculateWPM(charsTyped, startTime, endTime) {
  const timeInMinutes = (endTime - startTime) / 60000;
  if (timeInMinutes <= 0) return 0;

  // Standard: 5 characters = 1 word
  const words = charsTyped / 5;

  return Math.round(words / timeInMinutes);
}
