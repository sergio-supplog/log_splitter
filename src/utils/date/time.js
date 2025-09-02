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

    const units = [
        { name: 'h', value: 3600 },
        { name: 'm', value: 60 },
        { name: 's', value: 1 }
    ];

    let result = [];
    let remaining = seconds;

    for (const unit of units) {
        const count = Math.floor(remaining / unit.value);
        if (count > 0) {
            result.push(`${count}${unit.name}`);
            remaining %= unit.value;
        }
    }

    if (result.length === 0) {
        let str = seconds.toFixed(1);
        if (str.endsWith('.0')) str = str.slice(0, -2);
        return `${str}s`;
    }

    return result.join(' ');
}
