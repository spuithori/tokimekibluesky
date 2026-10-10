import { CID } from 'multiformats/cid';
import { create as createDigest } from 'multiformats/hashes/digest';
import type { Agent } from '$lib/agent';
import { themesDb } from '$lib/db';
import { THEME_COLLECTION, type BlobRef, type ThemeRecord } from '../format';
import { validateThemeRecord } from '../validate';
import type { InstalledTheme } from '../installed';
import { composeRecord, type Draft } from './draft';

const RAW = 0x55;
const SHA2_256 = 0x12;

export class PublishError extends Error {
    constructor(public code: 'invalid' | 'blob-mismatch', message: string, public details: string[] = []) {
        super(message);
    }
}

export async function localBlobRef(blob: Blob): Promise<BlobRef> {
    const digest = createDigest(SHA2_256, new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())));
    return { $type: 'blob', ref: { $link: CID.createV1(RAW, digest).toString() }, mimeType: blob.type, size: blob.size };
}

export async function buildRecord(draft: Draft, autoIcon: Blob | null, now = new Date().toISOString()): Promise<{ record: ThemeRecord; refs: Map<Blob, BlobRef> }> {
    const refs = new Map<Blob, BlobRef>();
    const refOf = async (blob: Blob) => {
        if (!refs.has(blob)) refs.set(blob, await localBlobRef(blob));
        return refs.get(blob) as BlobRef;
    };
    const composed = composeRecord(draft);
    const record: ThemeRecord = { ...composed, createdAt: draft.sourceUri ? draft.createdAt : now } as ThemeRecord;
    if (draft.sourceUri) record.updatedAt = now;
    if (draft.images.length) {
        record.images = [];
        for (const image of draft.images) record.images.push({ key: image.key, image: await refOf(image.blob) });
    }
    const icon = draft.icon ?? autoIcon;
    if (icon) record.thumbnail = await refOf(icon);
    if (draft.cover) record.cover = await refOf(draft.cover);
    const result = validateThemeRecord(record);
    if (!result.ok) throw new PublishError('invalid', 'the theme does not pass validation', result.errors);
    return { record: result.record, refs };
}

export async function uploadVerified(agent: Agent, blob: Blob, expected: BlobRef): Promise<void> {
    const uploaded = await agent.uploadBlob(new Uint8Array(await blob.arrayBuffer()), blob.type);
    const stored = (uploaded.blob?.ref as { $link?: unknown } | undefined)?.$link;
    if (stored !== expected.ref.$link) {
        throw new PublishError('blob-mismatch', `the PDS stored ${String(stored)}, expected ${expected.ref.$link}`);
    }
}

export interface Published {
    uri: string;
    cid: string;
    rkey: string;
    installed: InstalledTheme;
}

export async function publishDraft(agent: Agent, draft: Draft, autoIcon: Blob | null): Promise<Published> {
    const { record, refs } = await buildRecord(draft, autoIcon);
    const thumbnail = draft.icon ?? autoIcon;
    for (const [blob, expected] of refs) await uploadVerified(agent, blob, expected);
    const value = { ...record, $type: THEME_COLLECTION };
    const written = draft.rkey
        ? await agent.xrpc.post('com.atproto.repo.putRecord', { repo: agent.did(), collection: THEME_COLLECTION, rkey: draft.rkey, record: value })
        : await agent.xrpc.post('com.atproto.repo.createRecord', { repo: agent.did(), collection: THEME_COLLECTION, record: value });
    const rkey = written.uri.split('/').pop() as string;

    const installed: InstalledTheme = {
        id: written.uri,
        uri: written.uri,
        cid: written.cid,
        did: agent.did(),
        record: JSON.parse(JSON.stringify(record)) as ThemeRecord,
        channel: 'latest',
        installedAt: new Date().toISOString(),
    };
    const handle = agent.handle();
    if (handle && handle !== agent.did()) installed.handle = handle;
    if (draft.images.length) installed.images = Object.fromEntries(draft.images.map((image) => [image.key, image.blob]));
    if (thumbnail) installed.thumbnail = thumbnail;
    await themesDb.themes.put(installed);
    return { uri: written.uri, cid: written.cid, rkey, installed };
}
