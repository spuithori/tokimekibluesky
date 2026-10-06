import { THEME_COLLECTION, type ThemeRecord, type ThemeToken, type ThemeVariant } from './format';

export interface LegacyColor {
    id?: string;
    name: string;
    colorCode: string;
    code?: string;
}

export interface LegacyTheme {
    id: string;
    name: string;
    description?: string;
    style: string;
    options?: {
        cover?: string;
        thumbnail?: string;
        colorDisabled?: boolean | string;
        darkmodeDisabled?: boolean | string;
        colors?: LegacyColor[];
        bubbleStyle?: string;
        darkmodeStyle?: string;
    };
    author?: string;
    keyword?: string;
    version?: string;
    code?: string;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
}

const BUBBLE_ONLY = /^--(bubble-|deck-heading-bubble-color$)/;

function renameLegacyBubble(tokens: ThemeToken[]): ThemeToken[] {
    return tokens.flatMap((t) => t.name === '--deck-heading-bubble-color'
        ? [{ name: '--bubble-heading-bg-color', value: t.value }, { name: '--bubble-single-bg-color', value: t.value }]
        : [t]);
}

export function parseDeclarations(css: string | undefined | null): ThemeToken[] {
    if (!css) return [];
    const out: ThemeToken[] = [];
    let depth = 0;
    let quote: string | null = null;
    let start = 0;
    const flush = (end: number) => {
        const decl = css.slice(start, end);
        const colon = decl.indexOf(':');
        if (colon > 0) {
            const name = decl.slice(0, colon).trim();
            const value = decl.slice(colon + 1).trim();
            if (name.startsWith('--') && value) out.push({ name, value });
        }
        start = end + 1;
    };
    for (let i = 0; i < css.length; i++) {
        const ch = css[i];
        if (quote) {
            if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '(') depth++;
        else if (ch === ')') depth = Math.max(0, depth - 1);
        else if (ch === ';' && depth === 0) flush(i);
    }
    flush(css.length);
    return out;
}

function flag(value: boolean | string | undefined): boolean {
    return value === true || value === 'true';
}

function iso(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const date = new Date(value.includes('T') ? value : value.replace(' ', 'T').replace(/\+00$/, 'Z'));
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function convertLegacyTheme(legacy: LegacyTheme): ThemeRecord {
    const options = legacy.options ?? {};
    const tokens = renameLegacyBubble([
        ...parseDeclarations(legacy.style),
        ...parseDeclarations(options.bubbleStyle).filter((t) => BUBBLE_ONLY.test(t.name)),
    ]);
    if (options.bubbleStyle && !tokens.some((t) => t.name === '--bubble-border')) {
        tokens.push({ name: '--bubble-border', value: '1px solid var(--border-color-2)' });
    }
    const variants: ThemeVariant[] = (options.colors ?? []).map((color, i) => ({
        key: color.id || `color-${i + 1}`,
        name: color.name,
        swatch: color.colorCode,
        tokens: renameLegacyBubble(parseDeclarations(color.code)),
    }));
    const record: ThemeRecord = {
        $type: THEME_COLLECTION,
        name: legacy.name,
        version: legacy.version || '1.0',
        tokens,
        createdAt: iso(legacy.createdAt ?? legacy.created_at) ?? new Date(0).toISOString(),
    };
    if (legacy.description) record.description = legacy.description;
    if (!flag(options.darkmodeDisabled)) record.dark = renameLegacyBubble(parseDeclarations(options.darkmodeStyle));
    if (variants.length) record.variants = variants;
    const tags = (legacy.keyword ?? '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8);
    if (tags.length) record.tags = tags;
    const updatedAt = iso(legacy.updatedAt ?? legacy.updated_at);
    if (updatedAt) record.updatedAt = updatedAt;
    return record;
}
