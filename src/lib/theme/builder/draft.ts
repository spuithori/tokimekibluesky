import type { ThemeRecord, ThemeToken, ThemeVariant } from '../format';
import type { ThemeProgram } from '../program';
import { DEFAULT_SEEDS, deriveTheme, type SeedBase, type Seeds } from './derive';
import { isHexColor } from './color';

export interface DraftImage {
    key: string;
    blob: Blob;
}

export interface Draft {
    id: string;
    name: string;
    description: string;
    version: string;
    tokens: ThemeToken[];
    dark: ThemeToken[];
    variants: ThemeVariant[];
    seeds: Seeds;
    overrides: Record<string, string | null>;
    darkOverrides: Record<string, string | null>;
    images: DraftImage[];
    program?: ThemeProgram;
    icon?: Blob;
    cover?: Blob;
    sourceUri?: string;
    rkey?: string;
    createdAt: string;
    updatedAt: string;
}

export type ComposedRecord = Pick<ThemeRecord, 'name' | 'description' | 'version' | 'createdAt' | 'tokens' | 'dark' | 'variants' | 'program'>;

function layer(base: ThemeToken[], upper: ThemeToken[]): ThemeToken[] {
    const names = new Set(upper.map((t) => t.name));
    return [...base.filter((t) => !names.has(t.name)), ...upper];
}

function applyOverrides(tokens: ThemeToken[], overrides: Record<string, string | null>): ThemeToken[] {
    const out = tokens.filter((t) => !(t.name in overrides));
    for (const [name, value] of Object.entries(overrides)) {
        if (value !== null) out.push({ name, value });
    }
    return out;
}

export function hasVariants(draft: Pick<Draft, 'variants'>): boolean {
    return draft.variants.length > 0;
}

export function seedBase(draft: Pick<Draft, 'tokens'>): SeedBase {
    const value = (name: string) => draft.tokens.findLast((t) => t.name === name)?.value.trim();
    const hex = (...names: string[]) => names.map(value).find((v): v is string => !!v && isHexColor(v));
    const px = (name: string) => {
        const match = /^(\d+(?:\.\d+)?)px$/.exec(value(name) ?? '');
        return match ? Number(match[1]) : undefined;
    };
    return {
        accent: hex('--current-theme-color', '--primary-color') ?? DEFAULT_SEEDS.accent,
        background: hex('--base-bg-color') ?? DEFAULT_SEEDS.background,
        radius: px('--radius-card') ?? px('--deck-border-radius') ?? DEFAULT_SEEDS.radius,
    };
}

export function composeRecord(draft: Draft): ComposedRecord {
    const derived = deriveTheme(draft.seeds, seedBase(draft));
    const derivedTokens = hasVariants(draft)
        ? derived.tokens.filter((t) => t.name !== '--current-theme-color' && t.name !== '--primary-color')
        : derived.tokens;
    const tokens = applyOverrides(layer(draft.tokens, derivedTokens), draft.overrides);
    const dark = applyOverrides(layer(draft.dark, derived.dark), draft.darkOverrides);
    const record: ComposedRecord = {
        name: draft.name,
        version: draft.version,
        createdAt: draft.createdAt,
        tokens,
    };
    if (draft.description) record.description = draft.description;
    if (dark.length) record.dark = dark;
    if (draft.variants.length) record.variants = draft.variants;
    if (draft.program) record.program = draft.program;
    return record;
}

export function previewRecord(record: ComposedRecord, { dark, variant }: { dark: boolean; variant?: string }): ComposedRecord {
    const chosen = record.variants?.find((v) => v.key === variant) ?? record.variants?.[0];
    const withVariant = chosen ? layer(record.tokens, chosen.tokens) : record.tokens;
    const preview: ComposedRecord = {
        name: record.name,
        version: record.version,
        createdAt: record.createdAt,
        tokens: dark && record.dark ? layer(withVariant, record.dark) : withVariant,
    };
    if (record.program) preview.program = record.program;
    return preview;
}
