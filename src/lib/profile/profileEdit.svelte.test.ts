import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';

vi.mock('$lib/imageCompressor/compressor', () => ({
    compressImage: vi.fn(async (blob: Blob) => blob),
}));

vi.mock('$lib/profileLinks/repo', async (importOriginal) => {
    const actual = await importOriginal<typeof import('$lib/profileLinks/repo')>();
    return {
        ...actual,
        loadOwnProfileLinks: vi.fn(async () => ({ links: [], refs: [] })),
        writeProfileLinks: vi.fn(),
        resolveNewLink: vi.fn(async () => ({ blocked: false, title: '' })),
    };
});

import { compressImage } from '$lib/imageCompressor/compressor';
import { loadOwnProfileLinks, writeProfileLinks } from '$lib/profileLinks/repo';
import { ProfileEditSession, applyProfileChange, applySavedOverlay, isSavedOverlaySettled, mergeSavedOverlay, DISPLAY_NAME_MAX, DESCRIPTION_MAX } from './profileEdit.svelte';

const text = { displayName: 'Shiori', description: 'hello', pronouns: '' };
const keep = { kind: 'keep' } as const;

describe('applyProfileChange', () => {
    const existing = { $type: 'app.bsky.actor.profile', displayName: 'Old', avatar: { ref: { $link: 'old-avatar' } }, banner: { ref: { $link: 'old-banner' } }, pinnedPost: { uri: 'at://x' }, website: 'https://example.com' };

    it('keeps the images and every field it does not own', () => {
        const next = applyProfileChange(existing, { text, avatar: keep, banner: keep, dropWebsite: false });
        expect(next.avatar).toBe(existing.avatar);
        expect(next.banner).toBe(existing.banner);
        expect(next.pinnedPost).toBe(existing.pinnedPost);
        expect(next.website).toBe('https://example.com');
        expect(next.displayName).toBe('Shiori');
    });

    it('removes an image from the record instead of leaving the old one', () => {
        const next = applyProfileChange(existing, { text, avatar: { kind: 'remove' }, banner: keep, dropWebsite: false });
        expect('avatar' in next).toBe(false);
        expect(next.banner).toBe(existing.banner);
    });

    it('replaces an image with the uploaded blob', () => {
        const ref = { ref: { $link: 'new-banner' } };
        const next = applyProfileChange(existing, { text, avatar: keep, banner: { kind: 'replace', ref }, dropWebsite: false });
        expect(next.banner).toBe(ref);
    });

    it('drops the links key when the last link is removed, and leaves it alone when links were not touched', () => {
        const withLinks = { ...existing, links: [{ uri: 'at://a', cid: 'c' }] };
        expect('links' in applyProfileChange(withLinks, { text, avatar: keep, banner: keep, linkRefs: [], dropWebsite: false })).toBe(false);
        expect(applyProfileChange(withLinks, { text, avatar: keep, banner: keep, dropWebsite: false }).links).toBe(withLinks.links);
    });

    it('drops the legacy website once it was migrated into links', () => {
        const next = applyProfileChange(existing, { text, avatar: keep, banner: keep, linkRefs: [{ uri: 'at://a', cid: 'c' }], dropWebsite: true });
        expect('website' in next).toBe(false);
    });
});

describe('ProfileEditSession', () => {
    const uploaded: Blob[] = [];
    let record: Record<string, unknown>;
    let upserts = 0;
    let revoked: string[] = [];
    let cleanup: () => void;

    const agent = {
        xrpc: {
            post: vi.fn(async (_nsid: string, blob: Blob) => {
                uploaded.push(blob);
                return { blob: { ref: { $link: `cid-${uploaded.length}` }, mimeType: blob.type, size: blob.size } };
            }),
        },
        upsertProfile: vi.fn(async (update: (existing: Record<string, unknown>) => Record<string, unknown>) => {
            upserts++;
            record = update(record);
        }),
    } as any;

    function open(profile: Record<string, unknown> = { did: 'did:plc:me', displayName: 'Old', description: 'bio' }) {
        let session!: ProfileEditSession;
        cleanup = $effect.root(() => {
            session = new ProfileEditSession(profile as any, agent);
        });
        return session;
    }

    beforeEach(() => {
        uploaded.length = 0;
        upserts = 0;
        revoked = [];
        record = { displayName: 'Old', description: 'bio', avatar: { ref: { $link: 'old' } } };
        let n = 0;
        vi.stubGlobal('URL', Object.assign(URL, {
            createObjectURL: () => `blob:preview-${++n}`,
            revokeObjectURL: (url: string) => { revoked.push(url); },
        }));
        vi.mocked(loadOwnProfileLinks).mockResolvedValue({ links: [], refs: [] } as any);
        vi.mocked(compressImage).mockImplementation(async (blob: Blob) => blob);
        agent.xrpc.post.mockClear();
        agent.upsertProfile.mockClear();
    });

    afterEach(() => {
        cleanup?.();
    });

    it('cannot be saved until something changed', async () => {
        const session = open();
        await vi.waitFor(() => expect(session.linksStatus).toBe('ready'));
        expect(session.isDirty).toBe(false);
        expect(await session.save()).toBeNull();
        expect(upserts).toBe(0);
    });

    it('does not count the automatic website migration as a change by the user', async () => {
        const session = open({ did: 'did:plc:me', displayName: 'Old', description: 'bio', website: 'https://example.com' });
        await vi.waitFor(() => expect(session.linksStatus).toBe('ready'));
        expect(session.links.length).toBe(1);
        expect(session.isDirty).toBe(false);
    });

    it('refuses to save text over the limit', async () => {
        const session = open();
        session.displayName = 'あ'.repeat(DISPLAY_NAME_MAX + 1);
        flushSync();
        expect(session.displayNameLeft).toBe(-1);
        expect(session.canSave).toBe(false);
        session.displayName = 'ok';
        session.description = '👨‍👩‍👧'.repeat(DESCRIPTION_MAX);
        expect(session.descriptionLeft).toBe(0);
        expect(session.canSave).toBe(true);
    });

    it('uploads nothing until save, then uploads each replaced image once', async () => {
        const session = open();
        session.setImage('avatar', new Blob(['a'], { type: 'image/png' }));
        const latest = new Blob(['b'], { type: 'image/png' });
        session.setImage('avatar', latest);
        expect(agent.xrpc.post).not.toHaveBeenCalled();
        expect(revoked).toEqual(['blob:preview-1']);

        const result = await session.save();
        expect(uploaded.length).toBe(1);
        expect(uploaded[0]).toBe(latest);
        expect(result?.avatar).toEqual({ cid: 'cid-1', previewUrl: 'blob:preview-2' });
        expect((record.avatar as any).ref.$link).toBe('cid-1');
    });

    it('sends nothing at all when the edit is cancelled', async () => {
        const session = open();
        session.displayName = 'New';
        session.setImage('banner', new Blob(['x'], { type: 'image/png' }));
        session.dispose();
        expect(agent.xrpc.post).not.toHaveBeenCalled();
        expect(upserts).toBe(0);
        expect(revoked).toEqual(['blob:preview-1']);
    });

    it('removes the avatar from the record', async () => {
        const session = open();
        session.removeImage('avatar');
        const result = await session.save();
        expect(result?.avatar).toBeNull();
        expect('avatar' in record).toBe(false);
    });

    it('keeps the typed text and reports the error when saving fails', async () => {
        const session = open();
        session.displayName = 'New name';
        agent.upsertProfile.mockRejectedValueOnce(new Error('BlobTooLarge'));
        expect(await session.save()).toBeNull();
        expect(session.error).toBe('BlobTooLarge');
        expect(session.displayName).toBe('New name');
        expect(session.isSaving).toBe(false);
        expect(session.canSave).toBe(true);
    });

    it('rolls back link records it created when the profile write fails', async () => {
        const deleteCreated = vi.fn(async () => {});
        vi.mocked(writeProfileLinks).mockResolvedValueOnce({ refs: [{ uri: 'at://a', cid: 'c' }], deleteRemoved: vi.fn(), deleteCreated } as any);
        const session = open();
        await vi.waitFor(() => expect(session.linksStatus).toBe('ready'));
        session.linkFormIndex = null;
        session.saveLink({ url: 'https://example.com' });
        agent.upsertProfile.mockRejectedValueOnce(new Error('boom'));
        expect(await session.save()).toBeNull();
        expect(deleteCreated).toHaveBeenCalledTimes(1);
    });

    it('asks the compressor for a JPEG under the 1MB lexicon limit', async () => {
        const session = open();
        session.setImage('banner', new Blob(['x'], { type: 'image/png' }));
        await session.save();
        const options = vi.mocked(compressImage).mock.calls[0][1]!;
        expect(options.outputType).toBe('image/jpeg');
        expect(options.maxSizeMB! * 1024 * 1024).toBeLessThan(1_000_000);
    });
});

describe('saved overlay', () => {
    const saved = { text: { displayName: 'New', description: 'bio', pronouns: '' }, avatar: { cid: 'bafynew', previewUrl: 'blob:preview-1' }, banner: undefined };
    const stale = { displayName: 'Old', description: 'bio', avatar: 'https://cdn.example/img/avatar/plain/did:plc:me/bafyold@jpeg', banner: 'https://cdn.example/banner' };
    const fresh = { displayName: 'New', description: 'bio', avatar: 'https://cdn.example/img/avatar/plain/did:plc:me/bafynew@jpeg', banner: 'https://cdn.example/banner' };

    it('keeps showing what was saved while the server still returns the old profile', () => {
        const shown = applySavedOverlay(stale, saved);
        expect(shown.displayName).toBe('New');
        expect(shown.avatar).toBe('blob:preview-1');
        expect(shown.banner).toBe(stale.banner);
        expect(isSavedOverlaySettled(stale, saved)).toBe(false);
    });

    it('hands over to the server image once it carries the saved blob', () => {
        expect(applySavedOverlay(fresh, saved).avatar).toBe(fresh.avatar);
        expect(isSavedOverlaySettled(fresh, saved)).toBe(true);
    });

    it('shows a removed image as removed even if the server still has it', () => {
        const removed = { ...saved, avatar: null };
        expect(applySavedOverlay(stale, removed).avatar).toBeUndefined();
        expect(isSavedOverlaySettled({ ...fresh, avatar: undefined }, removed)).toBe(true);
    });

    it('does not forget an unsettled image when a later save only changes text', () => {
        const merged = mergeSavedOverlay(saved, { text: { displayName: 'Newer', description: 'bio', pronouns: '' }, avatar: undefined, banner: undefined });
        expect(merged.avatar).toBe(saved.avatar);
        expect(merged.text.displayName).toBe('Newer');
    });
});
