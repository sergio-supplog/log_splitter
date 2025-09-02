/**
 * Converts milliseconds to a human-readable time string.
 * @param {number} ms - The time in milliseconds.
 * @returns {string} Human-readable time, e.g., "1m 30s" or "2.5s".
 */
export function msToHuman(ms) {
  const seconds = ms / 1000;
  return secondsToHuman(seconds);
}

/**
 * Converts seconds to a human-readable time string.
 * @param {number} seconds - The time in seconds.
 * @returns {string} Human-readable time, e.g., "1m 30s" or "2.5s".
 */
export function secondsToHuman(seconds) {
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`;
  }
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${seconds.toFixed(1)}s`;
  }
}
