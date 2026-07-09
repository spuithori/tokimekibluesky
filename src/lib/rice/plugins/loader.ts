import { HOST_SVELTE_VERSION as hostSvelteVersion } from './hostVersion';
import { ricePluginsDb, type RicePluginRecord } from '$lib/db';
import { settingsStore } from '$lib/settings/settings.svelte';
import { RICE_API_VERSION } from '../modules/types';
import { verifyIntegrity } from './integrity';
import { rewriteImports } from './rewrite';
import { shimUrlFor } from './shims';
import { RicePluginError, svelteMajor, validatePluginManifest, validatePluginDeclaration, declarationToManifest, type RicePluginManifestJson, type RicePluginModule } from './types';
import { fetchBlobBytes, fetchDeclarationRecord, parsePluginAtUri, resolvePluginIdentity, verifyBlobAgainstCid } from './atproto';

export type PluginSource =
    | { kind: 'url'; manifestUrl: string }
    | { kind: 'at'; uri: string; did: string; entryCid: string; handle?: string };

export interface FetchedPlugin {
    source: PluginSource;
    manifestText: string;
    manifest: RicePluginManifestJson;
    code: string;
    integrity: string;
    svelteVersionMismatch: boolean;
}

export function sourceLabel(source: PluginSource): string {
    return source.kind === 'at' ? source.uri : source.manifestUrl;
}

async function fetchText(url: string): Promise<string> {
    let res: Response;
    try {
        res = await fetch(url, { cache: 'no-cache' });
    } catch (e) {
        throw new RicePluginError('fetch-failed', `${url} の取得に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!res.ok) {
        throw new RicePluginError('fetch-failed', `${url} の取得に失敗しました (HTTP ${res.status})`);
    }
    return res.text();
}

function assertHostCompatible(manifest: RicePluginManifestJson): void {
    if (manifest.apiVersion !== RICE_API_VERSION) {
        throw new RicePluginError('api-version', `apiVersion ${manifest.apiVersion} はサポートされていません(ホスト: ${RICE_API_VERSION})`);
    }
    if (svelteMajor(manifest.svelteVersion) !== svelteMajor(hostSvelteVersion)) {
        throw new RicePluginError('svelte-major-mismatch', `svelte ${manifest.svelteVersion} でビルドされたプラグインは svelte ${hostSvelteVersion} のホストでは動作しません`);
    }
}

export async function fetchPluginFromUrl(manifestUrl: string): Promise<FetchedPlugin> {
    const manifestText = await fetchText(manifestUrl);
    let json: unknown;
    try {
        json = JSON.parse(manifestText);
    } catch {
        throw new RicePluginError('manifest-invalid', 'manifest が JSON として解釈できません');
    }
    const validated = validatePluginManifest(json);
    if ('error' in validated) {
        throw new RicePluginError('manifest-invalid', validated.error);
    }
    const manifest = validated.ok;
    assertHostCompatible(manifest);
    const entryUrl = new URL(manifest.entry, manifestUrl).href;
    const code = await fetchText(entryUrl);
    if (!(await verifyIntegrity(code, manifest.integrity))) {
        throw new RicePluginError('integrity-mismatch', `${entryUrl} の内容が manifest の integrity と一致しません`);
    }
    return {
        source: { kind: 'url', manifestUrl },
        manifestText,
        manifest,
        code,
        integrity: manifest.integrity,
        svelteVersionMismatch: manifest.svelteVersion !== hostSvelteVersion,
    };
}

export async function fetchPluginFromAtUri(uri: string): Promise<FetchedPlugin> {
    const { did, rkey } = parsePluginAtUri(uri);
    const identity = await resolvePluginIdentity(did);
    const record = await fetchDeclarationRecord(identity.pds, did, rkey);
    const validated = validatePluginDeclaration(record.value);
    if ('error' in validated) {
        throw new RicePluginError('manifest-invalid', validated.error);
    }
    const declaration = validated.ok;
    const entryCid = declaration.entry.ref.$link;
    const bytes = await fetchBlobBytes(identity.pds, did, entryCid);
    const integrity = await verifyBlobAgainstCid(bytes, entryCid);
    const manifest = declarationToManifest(rkey, declaration, integrity);
    assertHostCompatible(manifest);
    return {
        source: { kind: 'at', uri, did, entryCid, handle: identity.handle },
        manifestText: JSON.stringify(manifest),
        manifest,
        code: new TextDecoder().decode(bytes),
        integrity,
        svelteVersionMismatch: manifest.svelteVersion !== hostSvelteVersion,
    };
}

export function fetchPluginFromSource(source: PluginSource): Promise<FetchedPlugin> {
    return source.kind === 'at' ? fetchPluginFromAtUri(source.uri) : fetchPluginFromUrl(source.manifestUrl);
}

export async function refetchRecord(id: string, source: PluginSource, integrity: string): Promise<RicePluginRecord> {
    const fetched = await fetchPluginFromSource(source);
    if (fetched.integrity !== integrity) {
        if (source.kind === 'at') {
            throw new RicePluginError('source-moved', `${source.uri} の作者がプラグインを更新しています。内容を確認して更新を承認してください`);
        }
        throw new RicePluginError('integrity-mismatch', `配布元 ${source.manifestUrl} の内容がインストール時の integrity と一致しません(プラグインの更新が必要です)`);
    }
    const record: RicePluginRecord = {
        id,
        source: fetched.source,
        manifest: fetched.manifestText,
        code: fetched.code,
        integrity: fetched.integrity,
        version: fetched.manifest.version,
        updatedAt: new Date().toISOString(),
    };
    await ricePluginsDb.plugins.put(record);
    return record;
}

async function ensureRecord(id: string): Promise<RicePluginRecord> {
    const installed = settingsStore.rice.plugins?.[id];
    if (!installed) {
        throw new RicePluginError('not-installed', `プラグイン "${id}" はインストールされていません`);
    }
    const cached = await ricePluginsDb.plugins.get(id);
    if (cached && (await verifyIntegrity(cached.code, installed.integrity))) {
        return cached;
    }
    return refetchRecord(id, installed.source, installed.integrity);
}

async function importPlugin(id: string): Promise<RicePluginModule> {
    const record = await ensureRecord(id);
    const runtime = await import('./runtime');
    const rewritten = await rewriteImports(record.code, (specifier) => {
        const mod = runtime.resolveRuntimeModule(specifier);
        return mod === undefined ? undefined : shimUrlFor(specifier, mod);
    });
    const blobUrl = URL.createObjectURL(new Blob([rewritten], { type: 'text/javascript' }));
    try {
        let imported: { default?: unknown };
        try {
            imported = await import(/* @vite-ignore */ blobUrl);
        } catch (e) {
            if (e instanceof RicePluginError) throw e;
            throw new RicePluginError('import-failed', `プラグイン "${id}" の実行に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
        }
        const plugin = imported.default;
        if (plugin === null || plugin === undefined || typeof plugin !== 'object') {
            throw new RicePluginError('entry-missing', `プラグイン "${id}" の main.js に default export がありません`);
        }
        return plugin as RicePluginModule;
    } finally {
        URL.revokeObjectURL(blobUrl);
    }
}

const inflight = new Map<string, Promise<RicePluginModule>>();

export function loadPluginModule(id: string): Promise<RicePluginModule> {
    let promise = inflight.get(id);
    if (!promise) {
        promise = importPlugin(id);
        inflight.set(id, promise);
        promise.catch(() => {
            if (inflight.get(id) === promise) {
                inflight.delete(id);
            }
        });
    }
    return promise;
}

export function invalidatePluginModule(id: string): void {
    inflight.delete(id);
}
