import { get } from 'svelte/store';
import { toast } from 'svelte-sonner';
import { t } from 'tokimeki-i18n';
import { themesDb } from '$lib/db';
import { settings, theme as currentTheme } from '$lib/stores';
import { validateThemeRecord, type ThemeRecord } from './format';
import { downloadThemeAssets, type RemoteTheme } from './atproto';
import type { InstalledTheme, ThemeSnapshot } from './installed';
import { THEME_SERVICE_URL } from './store';

const CHECKED_AT_KEY = 'tokimeki-theme-update-checked-at';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_URIS_PER_REQUEST = 50;

export interface ThemeUpdate {
    theme: RemoteTheme;
    approved: boolean;
}

export interface AppliedThemeUpdate {
    before: InstalledTheme;
    after: InstalledTheme;
    silent: boolean;
}

interface UpdateRow {
    uri: string;
    cid: string;
    did: string;
    rkey: string;
    handle: string | null;
    pds: string;
    record: unknown;
    approved: boolean;
}

function readCheckedAt(): number {
    try {
        return Number(localStorage.getItem(CHECKED_AT_KEY)) || 0;
    } catch {
        return 0;
    }
}

function writeCheckedAt(now: number): void {
    try {
        localStorage.setItem(CHECKED_AT_KEY, String(now));
    } catch {}
}

export function shouldApplyUpdate(row: InstalledTheme, update: ThemeUpdate): boolean {
    if (row.cid === update.theme.cid || row.declinedCid === update.theme.cid) return false;
    return row.channel === 'latest' || update.approved;
}

function toUpdate(row: UpdateRow): ThemeUpdate | null {
    const result = validateThemeRecord(row.record);
    if (!result.ok || typeof row.cid !== 'string' || typeof row.pds !== 'string') return null;
    return {
        theme: { uri: row.uri, cid: row.cid, did: row.did, rkey: row.rkey, handle: row.handle, pds: row.pds.replace(/\/$/, ''), record: result.record },
        approved: row.approved === true,
    };
}

export async function fetchThemeUpdates(rows: InstalledTheme[], signal?: AbortSignal): Promise<ThemeUpdate[]> {
    const updates: ThemeUpdate[] = [];
    for (let i = 0; i < rows.length; i += MAX_URIS_PER_REQUEST) {
        const params = new URLSearchParams();
        for (const row of rows.slice(i, i + MAX_URIS_PER_REQUEST)) {
            params.append('uri', row.uri as string);
            params.append('cid', row.cid ?? '');
        }
        const res = await fetch(`${THEME_SERVICE_URL}/xrpc/tech.tokimeki.theme.getUpdates?${params}`, { signal });
        if (!res.ok) throw new Error(`getUpdates ${res.status}`);
        const json = (await res.json()) as { updates?: UpdateRow[] };
        for (const row of json.updates ?? []) {
            const update = toUpdate(row);
            if (update) updates.push(update);
        }
    }
    return updates;
}

function appearance(record: ThemeRecord): string {
    return JSON.stringify([record.tokens, record.dark ?? [], record.variants ?? [], (record.images ?? []).map((image) => [image.key, image.image.ref.$link])]);
}

export function changesAppearance(before: ThemeRecord, after: ThemeRecord): boolean {
    return appearance(before) !== appearance(after);
}

function snapshot(row: InstalledTheme): ThemeSnapshot {
    const snap: ThemeSnapshot = { record: row.record };
    if (row.cid) snap.cid = row.cid;
    if (row.images) snap.images = row.images;
    if (row.thumbnail) snap.thumbnail = row.thumbnail;
    if (row.previewUrl) snap.previewUrl = row.previewUrl;
    return snap;
}

export async function applyThemeUpdate(row: InstalledTheme, update: ThemeUpdate, signal?: AbortSignal): Promise<InstalledTheme | null> {
    const assets = await downloadThemeAssets(update.theme, row, signal);
    return themesDb.transaction('rw', themesDb.themes, async () => {
        const current = await themesDb.themes.get(row.id);
        if (!current || current.cid !== row.cid) return null;
        const { images: _images, thumbnail: _thumbnail, previewUrl, declinedCid: _declined, previous, ...rest } = current;
        const visible = changesAppearance(current.record, update.theme.record);
        const next: InstalledTheme = {
            ...rest,
            cid: update.theme.cid,
            did: update.theme.did,
            record: JSON.parse(JSON.stringify(update.theme.record)) as ThemeRecord,
            ...assets,
        };
        if (visible) next.previous = snapshot(current);
        else if (previous) next.previous = previous;
        if (update.theme.handle) next.handle = update.theme.handle;
        if (!assets.thumbnail && previewUrl) next.previewUrl = previewUrl;
        await themesDb.themes.put(next);
        return next;
    });
}

export async function revertThemeUpdate(id: string): Promise<InstalledTheme | null> {
    return themesDb.transaction('rw', themesDb.themes, async () => {
        const current = await themesDb.themes.get(id);
        if (!current?.previous) return null;
        const { previous, images: _images, thumbnail: _thumbnail, previewUrl: _previewUrl, cid, record: _record, ...rest } = current;
        const next: InstalledTheme = { ...rest, ...previous };
        if (cid) next.declinedCid = cid;
        await themesDb.themes.put(next);
        return next;
    });
}

export async function checkThemeUpdates({ force = false, signal, now = Date.now() }: { force?: boolean; signal?: AbortSignal; now?: number } = {}): Promise<AppliedThemeUpdate[]> {
    if (!force && now - readCheckedAt() < CHECK_INTERVAL_MS) return [];
    const rows = (await themesDb.themes.toArray()).filter((row) => row.uri && !row.builtIn);
    if (!rows.length) {
        writeCheckedAt(now);
        return [];
    }
    const updates = await fetchThemeUpdates(rows, signal);
    writeCheckedAt(now);
    const applied: AppliedThemeUpdate[] = [];
    for (const update of updates) {
        const row = rows.find((item) => item.uri === update.theme.uri);
        if (!row || !shouldApplyUpdate(row, update)) continue;
        try {
            const after = await applyThemeUpdate(row, update, signal);
            if (after) applied.push({ before: row, after, silent: !changesAppearance(row.record, after.record) });
        } catch (e) {
            console.error(e);
        }
    }
    return applied;
}

function notify(applied: AppliedThemeUpdate): void {
    const { before, after } = applied;
    const name = after.record.name;
    const message = before.record.version !== after.record.version
        ? t('theme_updated_version', { name, version: after.record.version })
        : t('theme_updated', { name });
    toast.success(message, {
        action: {
            label: t('theme_update_undo'),
            onClick: () => {
                revertThemeUpdate(after.id)
                    .then((reverted) => {
                        if (reverted && get(settings).design?.skin === reverted.id) currentTheme.set(reverted);
                    })
                    .catch((e) => console.error(e));
            },
        },
    });
}

let running: Promise<AppliedThemeUpdate[]> | null = null;

export function runThemeUpdateCheck(options: { force?: boolean } = {}): Promise<AppliedThemeUpdate[]> {
    running ??= applyAndNotify(options).finally(() => {
        running = null;
    });
    return running;
}

async function applyAndNotify(options: { force?: boolean }): Promise<AppliedThemeUpdate[]> {
    const applied = await checkThemeUpdates(options);
    const active = applied.find((item) => !item.silent && item.after.id === get(settings).design?.skin);
    if (active) {
        currentTheme.set(active.after);
        if (active.before.cid) notify(active);
    }
    return applied;
}
