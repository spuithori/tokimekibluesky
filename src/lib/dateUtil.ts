/**
 * Format a date using a pattern string (replacing date-fns lightFormat).
 * Supported tokens: yyyy, MM, dd, HH, mm, ss
 */
export function formatDate(date: Date, pattern: string): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return pattern
        .replace('yyyy', String(date.getFullYear()))
        .replace('MM', pad(date.getMonth() + 1))
        .replace('dd', pad(date.getDate()))
        .replace('HH', pad(date.getHours()))
        .replace('mm', pad(date.getMinutes()))
        .replace('ss', pad(date.getSeconds()));
}

/**
 * Convert Unix timestamp (seconds) to Date object.
 */
export function fromUnixTime(seconds: number): Date {
    return new Date(seconds * 1000);
}
