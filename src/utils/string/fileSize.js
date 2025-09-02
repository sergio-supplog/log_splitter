/**
 * Converts bytes to a human-readable file size string.
 * @param {number} bytes - The size in bytes.
 * @returns {string} Human-readable size, e.g., "1.5 MB".
 */
export function humanFileSize(bytes) {
    if (bytes < 0) return 'Invalid size';
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = bytes / Math.pow(k, i);
    
    return `${size.toFixed(1).replace(/\.0$/, '')} ${units[i]}`;
}
