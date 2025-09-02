/**
 * Converts bytes to a human-readable file size string.
 * @param {number} bytes - The size in bytes.
 * @returns {string} Human-readable size, e.g., "1.5 MB".
 */
export function humanFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
