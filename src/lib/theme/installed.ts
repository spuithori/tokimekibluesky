import { validateThemeRecord, type ThemeRecord } from './format';
import { convertLegacyTheme, type LegacyTheme } from './legacy';
import { legacyThemeUri } from './legacyMap';
import { DEFAULT_THEME, DEFAULT_THEME_ID, DEFAULT_THEME_PREVIEW } from './builtin';

export interface ThemeSnapshot {
    record: ThemeRecord;
    cid?: string;
    images?: Record<string, Blob>;
    thumbnail?: Blob;
    previewUrl?: string;
}

export interface InstalledTheme {
    id: string;
    record: ThemeRecord;
    uri?: string;
    cid?: string;
    did?: string;
    handle?: string;
    images?: Record<string, Blob>;
    thumbnail?: Blob;
    previewUrl?: string;
    author?: string;
    legacyId?: string;
    builtIn?: boolean;
    channel?: 'approved' | 'latest';
    previous?: ThemeSnapshot;
    declinedCid?: string;
    installedAt: string;
}

export const BUILTIN_THEMES: readonly InstalledTheme[] = [
    {
        id: DEFAULT_THEME_ID,
        record: DEFAULT_THEME,
        previewUrl: DEFAULT_THEME_PREVIEW,
        builtIn: true,
        installedAt: DEFAULT_THEME.createdAt,
    },
];

export function findBuiltinTheme(id: string | undefined | null): InstalledTheme | undefined {
    return BUILTIN_THEMES.find((t) => t.id === id);
}

export function installedFromLegacy(row: LegacyTheme, now = new Date().toISOString()): InstalledTheme | null {
    const result = validateThemeRecord(convertLegacyTheme(row), { strict: false });
    if (!result.ok) return null;
    const uri = legacyThemeUri(row.id);
    const theme: InstalledTheme = {
        id: uri ?? row.id,
        record: result.record,
        legacyId: row.id,
        installedAt: now,
    };
    if (uri) theme.uri = uri;
    if (row.author) theme.author = row.author;
    if (row.options?.thumbnail) theme.previewUrl = row.options.thumbnail;
    return theme;
}

export function isLegacyThemeRow(row: unknown): row is LegacyTheme {
    const r = row as Partial<LegacyTheme> | null;
    return !!r && typeof r.id === 'string' && typeof r.style === 'string' && !('record' in (r as object));
}
