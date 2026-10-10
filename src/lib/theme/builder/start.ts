import { DEFAULT_THEME } from '../builtin';
import type { ThemeRecord, ThemeToken } from '../format';
import type { InstalledTheme } from '../installed';
import { downloadThemeAssets, fetchThemeBlob, type RemoteTheme } from '../atproto';
import type { Draft } from './draft';
import { editDraftId } from './session';
import { isAutoIcon } from './image';

function copyTokens(tokens: readonly ThemeToken[] | undefined): ThemeToken[] {
    return (tokens ?? []).map((t) => ({ name: t.name, value: t.value }));
}

export function draftFromRecord(
    record: ThemeRecord,
    images: Record<string, Blob> | undefined,
    { name, sourceUri, rkey, icon, cover, now = new Date().toISOString() }: { name?: string; sourceUri?: string; rkey?: string; icon?: Blob; cover?: Blob; now?: string } = {},
): Draft {
    const draft: Draft = {
        id: crypto.randomUUID(),
        name: name ?? record.name,
        description: record.description ?? '',
        version: sourceUri ? record.version : '1.0',
        tokens: copyTokens(record.tokens),
        dark: copyTokens(record.dark),
        variants: (record.variants ?? []).map((v) => ({ key: v.key, name: v.name, swatch: v.swatch, tokens: copyTokens(v.tokens) })),
        seeds: {},
        overrides: {},
        darkOverrides: {},
        images: (record.images ?? []).flatMap((image) => (images?.[image.key] ? [{ key: image.key, blob: images[image.key] }] : [])),
        createdAt: sourceUri ? record.createdAt : now,
        updatedAt: now,
    };
    if (sourceUri) {
        draft.id = editDraftId(sourceUri);
        draft.sourceUri = sourceUri;
    }
    if (record.program) draft.program = structuredClone(record.program);
    if (rkey) draft.rkey = rkey;
    if (icon) draft.icon = icon;
    if (cover) draft.cover = cover;
    return draft;
}

export function draftFromDefault(name: string): Draft {
    const [first] = DEFAULT_THEME.variants ?? [];
    const names = new Set(first?.tokens.map((t) => t.name) ?? []);
    const tokens = [...DEFAULT_THEME.tokens.filter((t) => !names.has(t.name)), ...(first?.tokens ?? [])];
    return draftFromRecord({ ...DEFAULT_THEME, tokens, variants: undefined, description: undefined }, undefined, { name });
}

export function draftFromInstalled(theme: InstalledTheme): Draft {
    return draftFromRecord(theme.record, theme.images);
}

export async function draftFromOwn(theme: RemoteTheme, local?: InstalledTheme, signal?: AbortSignal): Promise<Draft> {
    const [assets, cover] = await Promise.all([
        downloadThemeAssets(theme, local, signal),
        theme.record.cover ? fetchThemeBlob(theme, theme.record.cover, signal) : undefined,
    ]);
    const thumbnail = assets.thumbnail;
    const icon = thumbnail && !isAutoIcon(new Uint8Array(await thumbnail.arrayBuffer())) ? thumbnail : undefined;
    return draftFromRecord(theme.record, assets.images, { sourceUri: theme.uri, rkey: theme.rkey, icon, cover });
}
