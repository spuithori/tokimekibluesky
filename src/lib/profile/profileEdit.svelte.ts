import type { Agent } from '$lib/agent';
import { graphemeLen } from '$lib/atproto-richtext/grapheme';
import { compressImage } from '$lib/imageCompressor/compressor';
import { normalizeProfileLinkUrl, validateLinkInput, type ProfileLink } from '$lib/profileLinks/rules';
import { loadOwnProfileLinks, resolveNewLink, sameProfileLinks, writeProfileLinks } from '$lib/profileLinks/repo';

export const DISPLAY_NAME_MAX = 64;
export const DESCRIPTION_MAX = 256;
export const COUNTER_VISIBLE_RATIO = 0.8;
const IMAGE_MAX_MB = 0.95;

export type ImageTarget = 'avatar' | 'banner';
export type ImageDraft = { kind: 'keep' } | { kind: 'remove' } | { kind: 'replace'; blob: Blob; previewUrl: string };
export type ImageChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'replace'; ref: unknown };

export interface ProfileTextDraft {
    displayName: string;
    description: string;
    pronouns: string;
}

export interface ProfileRecordChange {
    text: ProfileTextDraft;
    avatar: ImageChange;
    banner: ImageChange;
    linkRefs?: unknown[];
    dropWebsite: boolean;
}

export interface SavedImage {
    cid: string;
    previewUrl: string;
}

export interface ProfileEditResult {
    text: ProfileTextDraft;
    avatar: SavedImage | null | undefined;
    banner: SavedImage | null | undefined;
}

export function applyProfileChange(existing: Record<string, unknown>, change: ProfileRecordChange): Record<string, unknown> {
    const next: Record<string, unknown> = { ...existing, ...change.text };
    for (const target of ['avatar', 'banner'] as const) {
        const image = change[target];
        if (image.kind === 'replace') {
            next[target] = image.ref;
        } else if (image.kind === 'remove') {
            delete next[target];
        }
    }
    if (change.linkRefs) {
        if (change.linkRefs.length) {
            next.links = change.linkRefs;
        } else {
            delete next.links;
        }
    }
    if (change.dropWebsite) {
        delete next.website;
    }
    return next;
}

export function remainingGraphemes(text: string, max: number): number {
    return max - graphemeLen(text ?? '');
}

export function isCounterVisible(text: string, max: number): boolean {
    return graphemeLen(text ?? '') >= max * COUNTER_VISIBLE_RATIO;
}

function blobCid(ref: any): string {
    return ref?.ref?.$link ?? ref?.cid ?? '';
}

export class ProfileEditSession {
    displayName = $state('');
    description = $state('');
    pronouns = $state('');
    avatar: ImageDraft = $state({ kind: 'keep' });
    banner: ImageDraft = $state({ kind: 'keep' });
    links: ProfileLink[] = $state([]);
    linksStatus: 'loading' | 'ready' | 'error' = $state('loading');
    linkFormIndex: number | null | undefined = $state();
    isSaving = $state(false);
    error = $state('');
    isConfirmingDiscard = $state(false);

    readonly did: string;
    #agent: Agent;
    #initial: ProfileTextDraft;
    #originalLinks: ProfileLink[] = [];
    #baselineLinks: ProfileLink[] = [];
    #migratedWebsite = false;
    #linksLoading: Promise<void>;
    #websiteResolving: Promise<void> = Promise.resolve();

    constructor(profile: { did: string; displayName?: string; description?: string; pronouns?: string; website?: unknown }, agent: Agent) {
        this.did = profile.did;
        this.#agent = agent;
        this.#initial = {
            displayName: profile.displayName ?? '',
            description: profile.description ?? '',
            pronouns: profile.pronouns ?? '',
        };
        this.displayName = this.#initial.displayName;
        this.description = this.#initial.description;
        this.pronouns = this.#initial.pronouns;
        this.#linksLoading = loadOwnProfileLinks(agent)
            .then((own) => {
                this.#originalLinks = own.links;
                this.links = [...own.links];
                if (!own.refs?.length) {
                    this.#migrateWebsite(profile.website);
                }
                this.#baselineLinks = $state.snapshot(this.links) as ProfileLink[];
                this.linksStatus = 'ready';
            })
            .catch((e) => {
                console.error(e);
                this.linksStatus = 'error';
            });
    }

    #migrateWebsite(website: unknown) {
        if (typeof website !== 'string') {
            return;
        }
        const url = normalizeProfileLinkUrl(website.trim().replace(/^http:\/\//i, 'https://'));
        if (!url || validateLinkInput(url, []).error) {
            return;
        }
        this.links = [{ url }];
        this.#migratedWebsite = true;
        this.#websiteResolving = resolveNewLink(this.#agent, url, true).then((resolved) => {
            if (resolved.blocked) {
                this.links = this.links.filter((link) => link.url !== url);
                this.#migratedWebsite = false;
                return;
            }
            this.links = this.links.map((link) => {
                if (link.url !== url || link.icon) {
                    return link;
                }
                const next = { ...link };
                if (resolved.icon) next.icon = resolved.icon;
                if (resolved.iconUrl) next.iconUrl = resolved.iconUrl;
                if (!next.title && resolved.title) next.title = resolved.title;
                return next;
            });
        });
    }

    get displayNameLeft(): number {
        return remainingGraphemes(this.displayName, DISPLAY_NAME_MAX);
    }

    get descriptionLeft(): number {
        return remainingGraphemes(this.description, DESCRIPTION_MAX);
    }

    get isValid(): boolean {
        return this.displayNameLeft >= 0 && this.descriptionLeft >= 0;
    }

    get isDirty(): boolean {
        if (this.displayName !== this.#initial.displayName
            || this.description !== this.#initial.description
            || this.pronouns !== this.#initial.pronouns
            || this.avatar.kind !== 'keep'
            || this.banner.kind !== 'keep') {
            return true;
        }
        return this.linksStatus === 'ready' && !sameProfileLinks($state.snapshot(this.links) as ProfileLink[], this.#baselineLinks);
    }

    get canSave(): boolean {
        return this.isDirty && this.isValid && !this.isSaving;
    }

    preview(target: ImageTarget, current: string | undefined): string | undefined {
        const draft = this[target];
        if (draft.kind === 'replace') return draft.previewUrl;
        if (draft.kind === 'remove') return undefined;
        return current;
    }

    setImage(target: ImageTarget, blob: Blob) {
        this.#release(target);
        this[target] = { kind: 'replace', blob, previewUrl: URL.createObjectURL(blob) };
    }

    removeImage(target: ImageTarget) {
        this.#release(target);
        this[target] = { kind: 'remove' };
    }

    #release(target: ImageTarget) {
        const draft = this[target];
        if (draft.kind === 'replace') {
            URL.revokeObjectURL(draft.previewUrl);
        }
    }

    saveLink(saved: ProfileLink) {
        const index = this.linkFormIndex;
        this.links = index == null ? [...this.links, saved] : this.links.map((link, i) => (i === index ? saved : link));
        this.linkFormIndex = undefined;
    }

    removeLink() {
        const index = this.linkFormIndex;
        this.links = this.links.filter((_link, i) => i !== index);
        this.linkFormIndex = undefined;
    }

    async #upload(draft: ImageDraft): Promise<ImageChange> {
        if (draft.kind !== 'replace') {
            return draft;
        }
        const image = await compressImage(draft.blob, {
            outputType: 'image/jpeg',
            maxSizeMB: IMAGE_MAX_MB,
            maxWidthOrHeight: 2000,
        });
        const res = await this.#agent.xrpc.post('com.atproto.repo.uploadBlob', image, { encoding: image.type });
        return { kind: 'replace', ref: res.blob };
    }

    async save(): Promise<ProfileEditResult | null> {
        if (!this.canSave) {
            return null;
        }
        this.isSaving = true;
        this.error = '';

        const text: ProfileTextDraft = {
            displayName: this.displayName,
            description: this.description,
            pronouns: this.pronouns,
        };
        const avatarDraft = this.avatar;
        const bannerDraft = this.banner;
        let linkWrite: Awaited<ReturnType<typeof writeProfileLinks>> | undefined;

        try {
            await this.#linksLoading;
            await this.#websiteResolving;
            const [avatar, banner] = await Promise.all([this.#upload(avatarDraft), this.#upload(bannerDraft)]);
            const nextLinks = $state.snapshot(this.links) as ProfileLink[];
            const linksReady = this.linksStatus === 'ready';
            if (linksReady && !sameProfileLinks(nextLinks, this.#originalLinks)) {
                linkWrite = await writeProfileLinks(this.#agent, nextLinks, this.#originalLinks);
            }
            const change: ProfileRecordChange = {
                text,
                avatar,
                banner,
                linkRefs: linkWrite?.refs,
                dropWebsite: linksReady && this.#migratedWebsite,
            };
            await this.#agent.upsertProfile((existing: Record<string, unknown>) => applyProfileChange(existing, change));
            await linkWrite?.deleteRemoved();

            const saved = (change: ImageChange, draft: ImageDraft): SavedImage | null | undefined => {
                if (change.kind === 'remove') return null;
                if (change.kind === 'replace' && draft.kind === 'replace') {
                    return { cid: blobCid(change.ref), previewUrl: draft.previewUrl };
                }
                return undefined;
            };
            return { text, avatar: saved(avatar, avatarDraft), banner: saved(banner, bannerDraft) };
        } catch (e) {
            await linkWrite?.deleteCreated();
            console.error(e);
            this.error = e instanceof Error ? e.message : String(e);
            return null;
        } finally {
            this.isSaving = false;
        }
    }

    dispose(keep: readonly string[] = []) {
        for (const target of ['avatar', 'banner'] as const) {
            const draft = this[target];
            if (draft.kind === 'replace' && !keep.includes(draft.previewUrl)) {
                URL.revokeObjectURL(draft.previewUrl);
            }
        }
    }
}

interface OverlayTarget {
    displayName?: string;
    description?: string;
    pronouns?: string;
    avatar?: string;
    banner?: string;
}

function overlayImage(current: string | undefined, saved: SavedImage | null | undefined): string | undefined {
    if (saved === undefined) return current;
    if (saved === null) return undefined;
    return saved.cid && current?.includes(saved.cid) ? current : saved.previewUrl;
}

function isImageSettled(current: string | undefined, saved: SavedImage | null | undefined): boolean {
    if (saved === undefined) return true;
    if (saved === null) return !current;
    return !!saved.cid && !!current?.includes(saved.cid);
}

export function mergeSavedOverlay(previous: ProfileEditResult | undefined, next: ProfileEditResult): ProfileEditResult {
    return {
        text: next.text,
        avatar: next.avatar === undefined ? previous?.avatar : next.avatar,
        banner: next.banner === undefined ? previous?.banner : next.banner,
    };
}

export function applySavedOverlay<T extends OverlayTarget>(profile: T, overlay: ProfileEditResult | undefined): T {
    if (!overlay) {
        return profile;
    }
    return {
        ...profile,
        ...overlay.text,
        avatar: overlayImage(profile.avatar, overlay.avatar),
        banner: overlayImage(profile.banner, overlay.banner),
    };
}

export function isSavedOverlaySettled(profile: OverlayTarget, overlay: ProfileEditResult): boolean {
    return (profile.displayName ?? '') === overlay.text.displayName
        && (profile.description ?? '') === overlay.text.description
        && (profile.pronouns ?? '') === overlay.text.pronouns
        && isImageSettled(profile.avatar, overlay.avatar)
        && isImageSettled(profile.banner, overlay.banner);
}

export function savedOverlayUrls(overlay: ProfileEditResult | undefined): string[] {
    return [overlay?.avatar?.previewUrl, overlay?.banner?.previewUrl].filter((url): url is string => !!url);
}
