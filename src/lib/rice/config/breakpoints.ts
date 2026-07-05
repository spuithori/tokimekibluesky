export const MOBILE_MAX_WIDTH = 767;
export const DESKTOP_MIN_WIDTH = 768;

export const MEDIA_ALIASES: Record<string, string> = {
    mobile: `(max-width: ${MOBILE_MAX_WIDTH}px)`,
    desktop: `(min-width: ${DESKTOP_MIN_WIDTH}px)`,
};

const PARENTHESIS_RE = /\(.+\)/;
const NON_PARENTHESIZED_KEYWORDS = new Set(['all', 'print', 'screen', 'and', 'or', 'not', 'only']);

export function normalizeMediaQuery(label: string): string | null {
    const trimmed = label.trim();
    if (!trimmed) return null;
    if (MEDIA_ALIASES[trimmed]) return MEDIA_ALIASES[trimmed];
    if (PARENTHESIS_RE.test(trimmed)) return trimmed;
    if (trimmed.split(/[\s,]+/).some((word) => NON_PARENTHESIZED_KEYWORDS.has(word))) return trimmed;
    return `(${trimmed})`;
}
