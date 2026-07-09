import { CID } from 'multiformats/cid';
import { handleFromDidDoc, pdsEndpointFromDidDoc, resolveDidDoc } from '$lib/util';
import { sha256IntegrityBytes } from './integrity';
import { PLUGIN_COLLECTION, PLUGIN_ID_RE, RicePluginError } from './types';

const SHA256_CODE = 0x12;
const RAW_CODE = 0x55;

export interface ParsedPluginAtUri {
    did: string;
    collection: string;
    rkey: string;
}

export function parsePluginAtUri(uri: string): ParsedPluginAtUri {
    if (!uri.startsWith('at://')) {
        throw new RicePluginError('manifest-invalid', `at-uri ではありません: ${uri}`);
    }
    const [authority, collection, rkey, ...rest] = uri.slice('at://'.length).split('/');
    if (!authority || !collection || !rkey || rest.length > 0) {
        throw new RicePluginError('manifest-invalid', `at-uri の形式が不正です: ${uri}`);
    }
    if (!authority.startsWith('did:')) {
        throw new RicePluginError('manifest-invalid', `at-uri の authority は DID である必要があります: ${authority}`);
    }
    if (collection !== PLUGIN_COLLECTION) {
        throw new RicePluginError('manifest-invalid', `collection が ${PLUGIN_COLLECTION} ではありません: ${collection}`);
    }
    if (!PLUGIN_ID_RE.test(rkey)) {
        throw new RicePluginError('manifest-invalid', `rkey(プラグイン id)が不正です: ${rkey}`);
    }
    return { did: authority, collection, rkey };
}

export function cidToIntegrity(cidString: string): string {
    let cid: CID;
    try {
        cid = CID.parse(cidString);
    } catch (e) {
        throw new RicePluginError('integrity-mismatch', `CID を解釈できません: ${cidString}`);
    }
    if (cid.code !== RAW_CODE) {
        throw new RicePluginError('integrity-mismatch', `blob の CID は raw codec(0x55)である必要があります: 0x${cid.code.toString(16)}`);
    }
    if (cid.multihash.code !== SHA256_CODE) {
        throw new RicePluginError('integrity-mismatch', `blob の CID は sha-256 である必要があります: 0x${cid.multihash.code.toString(16)}`);
    }
    let binary = '';
    for (const byte of cid.multihash.digest) {
        binary += String.fromCharCode(byte);
    }
    return `sha256-${btoa(binary)}`;
}

export interface PluginIdentity {
    did: string;
    pds: string;
    handle?: string;
}

export async function resolvePluginIdentity(did: string): Promise<PluginIdentity> {
    let doc: unknown;
    try {
        doc = await resolveDidDoc(did);
    } catch (e) {
        throw new RicePluginError('fetch-failed', `DID ${did} を解決できませんでした: ${e instanceof Error ? e.message : String(e)}`);
    }
    const pds = pdsEndpointFromDidDoc(doc);
    if (!pds) {
        throw new RicePluginError('fetch-failed', `DID ${did} の DID document に PDS(#atproto_pds)がありません`);
    }
    return { did, pds, handle: handleFromDidDoc(doc) };
}

async function xrpcGet(pds: string, nsid: string, params: Record<string, string>): Promise<Response> {
    const query = new URLSearchParams(params).toString();
    const url = `${pds}/xrpc/${nsid}?${query}`;
    let res: Response;
    try {
        res = await fetch(url, { cache: 'no-cache' });
    } catch (e) {
        throw new RicePluginError('fetch-failed', `${url} の取得に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (res.status === 404 || res.status === 400) {
        throw new RicePluginError('source-moved', `${nsid} が見つかりません (HTTP ${res.status})。作者がレコードを更新または削除した可能性があります`);
    }
    if (!res.ok) {
        throw new RicePluginError('fetch-failed', `${url} の取得に失敗しました (HTTP ${res.status})`);
    }
    return res;
}

export async function fetchDeclarationRecord(pds: string, did: string, rkey: string): Promise<{ uri: string; cid?: string; value: unknown }> {
    const res = await xrpcGet(pds, 'com.atproto.repo.getRecord', { repo: did, collection: PLUGIN_COLLECTION, rkey });
    return await res.json();
}

export async function fetchBlobBytes(pds: string, did: string, cid: string): Promise<ArrayBuffer> {
    const res = await xrpcGet(pds, 'com.atproto.sync.getBlob', { did, cid });
    return await res.arrayBuffer();
}

export async function verifyBlobAgainstCid(bytes: ArrayBuffer, cid: string): Promise<string> {
    const expected = cidToIntegrity(cid);
    const actual = await sha256IntegrityBytes(bytes);
    if (actual !== expected) {
        throw new RicePluginError('integrity-mismatch', `blob の内容が CID ${cid} と一致しません`);
    }
    return expected;
}
