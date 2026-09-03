import type { Agent } from '$lib/agent';
import { compressImage } from '$lib/imageCompressor/compressor';
import {
    ATMOSPHERE_DNS_TXT_PREFIX,
    ATMOSPHERE_MAX_SCREENSHOTS,
    ATMOSPHERE_SERVICE_COLLECTION,
    isSafeHttpUrl,
    isServiceRecord,
    type AtmosphereListedService,
    type AtmosphereBlobRef,
    type AtmosphereLocalizedText,
    type AtmosphereScreenshot,
    type AtmosphereServiceRecord,
} from './registry';

export interface OwnedService {
    uri: string;
    rkey: string;
    record: AtmosphereServiceRecord;
}

export interface ScreenshotDraft {
    id: string;
    file: File | null;
    previewUrl: string;
    existing: AtmosphereScreenshot | null;
    alt: string;
}

export interface LocalizedDraft {
    id: string;
    lang: string;
    name: string;
    tagline: string;
    description: string;
}

export interface ServiceDraft {
    name: string;
    tagline: string;
    description: string;
    url: string;
    category: string;
    iconFile: File | null;
    iconPreviewUrl: string;
    existingIcon: AtmosphereBlobRef | null;
    screenshots: ScreenshotDraft[];
    localized: LocalizedDraft[];
}

let draftSeq = 0;
export function draftId(): string {
    draftSeq += 1;
    return `d${draftSeq}`;
}

export function emptyDraft(): ServiceDraft {
    return {
        name: '',
        tagline: '',
        description: '',
        url: '',
        category: '',
        iconFile: null,
        iconPreviewUrl: '',
        existingIcon: null,
        screenshots: [],
        localized: [],
    };
}

export function draftFromRecord(record: AtmosphereServiceRecord, blobUrlOf: (blob: AtmosphereBlobRef | undefined) => string | null): ServiceDraft {
    const screenshots = Array.isArray(record.screenshots) ? record.screenshots : [];
    const localized = Array.isArray(record.localized) ? record.localized : [];
    return {
        name: record.name ?? '',
        tagline: record.tagline ?? '',
        description: record.description ?? '',
        url: record.url ?? '',
        category: record.category ?? '',
        iconFile: null,
        iconPreviewUrl: blobUrlOf(record.icon) ?? '',
        existingIcon: record.icon ?? null,
        screenshots: screenshots.slice(0, ATMOSPHERE_MAX_SCREENSHOTS).map((shot) => ({
            id: draftId(),
            file: null,
            previewUrl: blobUrlOf(shot.image) ?? '',
            existing: shot,
            alt: shot.alt ?? '',
        })),
        localized: localized.map((item) => ({
            id: draftId(),
            lang: item.lang ?? '',
            name: item.name ?? '',
            tagline: item.tagline ?? '',
            description: item.description ?? '',
        })),
    };
}

export function releaseDraftUrls(draft: ServiceDraft) {
    if (draft.iconFile && draft.iconPreviewUrl) URL.revokeObjectURL(draft.iconPreviewUrl);
    for (const shot of draft.screenshots) {
        if (shot.file && shot.previewUrl) URL.revokeObjectURL(shot.previewUrl);
    }
}

export function validateDraft(draft: ServiceDraft): 'name' | 'description' | 'url' | null {
    if (!draft.name.trim()) return 'name';
    if (!draft.description.trim()) return 'description';
    if (!isSafeHttpUrl(draft.url.trim())) return 'url';
    return null;
}

async function imageSize(blob: Blob): Promise<{ width: number; height: number } | null> {
    try {
        const bitmap = await createImageBitmap(blob);
        const size = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
        return size;
    } catch {
        return null;
    }
}

async function uploadImage(agent: Agent, file: File, maxWidthOrHeight: number, maxSizeMB: number): Promise<{ blob: AtmosphereBlobRef; size: { width: number; height: number } | null }> {
    const compressed = await compressImage(file, { outputType: 'image/webp', maxWidthOrHeight, maxSizeMB });
    const [res, size] = await Promise.all([
        agent.xrpc.post('com.atproto.repo.uploadBlob', compressed, { encoding: compressed.type || 'image/webp' }),
        imageSize(compressed),
    ]);
    return { blob: res.blob as unknown as AtmosphereBlobRef, size };
}

export async function buildRecord(agent: Agent, draft: ServiceDraft, createdAt?: string): Promise<AtmosphereServiceRecord> {
    let icon = draft.existingIcon ?? undefined;
    if (draft.iconFile) {
        icon = (await uploadImage(agent, draft.iconFile, 512, 0.45)).blob;
    }

    const screenshots: AtmosphereScreenshot[] = [];
    for (const shot of draft.screenshots.slice(0, ATMOSPHERE_MAX_SCREENSHOTS)) {
        const alt = shot.alt.trim();
        if (shot.file) {
            const uploaded = await uploadImage(agent, shot.file, 1600, 0.95);
            screenshots.push({
                image: uploaded.blob,
                alt: alt || undefined,
                aspectRatio: uploaded.size ?? undefined,
            });
        } else if (shot.existing) {
            screenshots.push({ ...shot.existing, alt: alt || undefined });
        }
    }

    const localized: AtmosphereLocalizedText[] = [];
    for (const item of draft.localized) {
        const lang = item.lang.trim();
        if (!lang) continue;
        const entry: AtmosphereLocalizedText = { lang };
        if (item.name.trim()) entry.name = item.name.trim();
        if (item.tagline.trim()) entry.tagline = item.tagline.trim();
        if (item.description.trim()) entry.description = item.description.trim();
        if (!entry.name && !entry.tagline && !entry.description) continue;
        localized.push(entry);
    }

    const record: AtmosphereServiceRecord = {
        $type: ATMOSPHERE_SERVICE_COLLECTION,
        name: draft.name.trim(),
        description: draft.description.trim(),
        url: draft.url.trim(),
        createdAt: createdAt || new Date().toISOString(),
    };
    if (draft.tagline.trim()) record.tagline = draft.tagline.trim();
    if (draft.category.trim()) record.category = draft.category.trim();
    if (icon) record.icon = icon;
    if (screenshots.length) record.screenshots = screenshots;
    if (localized.length) record.localized = localized;
    return record;
}

export async function listOwnedServices(agent: Agent): Promise<OwnedService[]> {
    const did = agent.did() as string;
    const res = await agent.xrpc.get('com.atproto.repo.listRecords', {
        repo: did,
        collection: ATMOSPHERE_SERVICE_COLLECTION,
        limit: 50,
    });
    const owned: OwnedService[] = [];
    for (const item of res.records ?? []) {
        const rkey = String(item.uri).split('/').pop() ?? '';
        if (!rkey || !isServiceRecord(item.value)) continue;
        owned.push({ uri: item.uri, rkey, record: item.value });
    }
    return owned;
}

export async function saveService(agent: Agent, record: AtmosphereServiceRecord, rkey?: string): Promise<{ uri: string; rkey: string }> {
    const did = agent.did() as string;
    if (rkey) {
        const res = await agent.xrpc.post('com.atproto.repo.putRecord', {
            repo: did,
            collection: ATMOSPHERE_SERVICE_COLLECTION,
            rkey,
            record,
        });
        return { uri: res.uri, rkey };
    }
    const res = await agent.xrpc.post('com.atproto.repo.createRecord', {
        repo: did,
        collection: ATMOSPHERE_SERVICE_COLLECTION,
        record,
    });
    return { uri: res.uri, rkey: String(res.uri).split('/').pop() ?? '' };
}

export async function deleteService(agent: Agent, rkey: string): Promise<void> {
    await agent.xrpc.post('com.atproto.repo.deleteRecord', {
        repo: agent.did() as string,
        collection: ATMOSPHERE_SERVICE_COLLECTION,
        rkey,
    });
}

export const SUBMIT_ERROR_NAMES = ['InvalidUri', 'NotOwner', 'RepoUnresolvable', 'RecordNotFound', 'RecordInvalid', 'OwnershipNotVerified', 'ServiceHidden'] as const;
export type SubmitErrorName = typeof SUBMIT_ERROR_NAMES[number];

export function submitErrorName(error: unknown): SubmitErrorName | null {
    const name = (error as { error?: unknown } | null)?.error;
    return typeof name === 'string' && (SUBMIT_ERROR_NAMES as readonly string[]).includes(name) ? name as SubmitErrorName : null;
}

export function hostOfUrl(url: string): string {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch {
        return '';
    }
}

export function ownershipHints(url: string, did: string): { host: string; dnsName: string; dnsValue: string } {
    const host = hostOfUrl(url);
    return {
        host,
        dnsName: `${ATMOSPHERE_DNS_TXT_PREFIX}.${host}`,
        dnsValue: `did=${did}`,
    };
}

export async function submitService(agent: Agent, uri: string): Promise<AtmosphereListedService> {
    const res = await agent.callWithProxy<{ service: AtmosphereListedService }>('tech.tokimeki.atmosphere.submitService', undefined, {
        method: 'POST',
        data: { uri },
    });
    return res.service;
}

export async function setServiceVisibility(agent: Agent, uri: string, visible: boolean, reason?: string): Promise<AtmosphereListedService> {
    const res = await agent.callWithProxy<{ service: AtmosphereListedService }>('tech.tokimeki.atmosphere.setVisibility', undefined, {
        method: 'POST',
        data: { uri, visible, reason },
    });
    return res.service;
}
