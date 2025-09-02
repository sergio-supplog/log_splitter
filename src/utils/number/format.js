/**
 * Formats a number using Intl.NumberFormat for better readability.
 * @param {number} num - The number to format.
 * @returns {string} The formatted number string.
 */
export function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}
