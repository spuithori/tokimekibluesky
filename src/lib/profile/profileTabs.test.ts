import { describe, expect, it } from 'vitest';
import { fitTabCount, profileTabKeys, profileTabOf } from './profileTabs';

const base = { current: 'posts', isLabeler: false, isMe: false, hasBlog: false };
const counted = (feedgens: number, lists: number, starterPacks: number) => ({ associated: { feedgens, lists, starterPacks } });

describe('profileTabKeys', () => {
    it('hides the tabs that the profile reports as empty', () => {
        expect(profileTabKeys({ ...base, profile: counted(0, 0, 0) })).toEqual(['posts', 'media', 'likes']);
        expect(profileTabKeys({ ...base, profile: counted(2, 0, 1) })).toEqual(['posts', 'media', 'likes', 'feed', 'starterpack']);
    });

    it('keeps the tab of the page being shown even when its count is zero', () => {
        expect(profileTabKeys({ ...base, profile: counted(0, 0, 0), current: 'lists' })).toEqual(['posts', 'media', 'likes', 'lists']);
        expect(profileTabKeys({ ...base, profile: counted(0, 0, 0), current: 'blog' })).toEqual(['posts', 'media', 'blog', 'likes']);
    });

    it('does not guess before the profile arrives, and shows everything when the server sends no counts', () => {
        expect(profileTabKeys({ ...base, profile: undefined })).toEqual(['posts', 'media', 'likes']);
        expect(profileTabKeys({ ...base, profile: {} })).toEqual(['posts', 'media', 'likes', 'feed', 'lists', 'starterpack']);
    });

    it('always gives the owner the starter pack tab, where packs are created', () => {
        expect(profileTabKeys({ ...base, profile: counted(0, 0, 0), isMe: true })).toEqual(['posts', 'media', 'likes', 'starterpack']);
    });

    it('places the blog right after media', () => {
        expect(profileTabKeys({ ...base, profile: counted(1, 1, 0), hasBlog: true })).toEqual(['posts', 'media', 'blog', 'likes', 'feed', 'lists']);
    });

    it('gives a labeler only its posts', () => {
        expect(profileTabKeys({ ...base, profile: counted(3, 3, 3), isLabeler: true, hasBlog: true })).toEqual(['posts']);
    });

    it('adds the follow tab right after posts only while a follow list is shown', () => {
        expect(profileTabKeys({ ...base, profile: counted(0, 0, 0), current: 'follower' })).toEqual(['posts', 'follow', 'media', 'likes']);
        expect(profileTabOf('follower')).toBe('follow');
    });

    it('treats the video page as part of the media tab', () => {
        expect(profileTabOf('video')).toBe('media');
        expect(profileTabOf('media')).toBe('media');
        expect(profileTabOf('likes')).toBe('likes');
    });
});

describe('fitTabCount', () => {
    const MORE = 38;
    const CARET = 18;

    it('shows every tab without a menu when they all fit', () => {
        expect(fitTabCount([48, 76, 62], 186, 0, MORE, CARET)).toBe(3);
    });

    it('reserves room for the menu button as soon as one tab does not fit', () => {
        expect(fitTabCount([48, 76, 62], 185, 0, MORE, CARET)).toBe(2);
        expect(fitTabCount([48, 76, 62, 62], 48 + 76 + MORE - 1, 0, MORE, CARET)).toBe(1);
    });

    it('reserves the wider labelled button when the current tab is one of the hidden ones', () => {
        const widths = [48, 76, 62, 62, 132];
        expect(fitTabCount(widths, 48 + 76 + 62 + MORE, 0, MORE, CARET)).toBe(3);
        expect(fitTabCount(widths, 48 + 76 + 62 + MORE, 4, MORE, CARET)).toBe(1);
    });

    it('never hides the current tab behind a button that does not name it', () => {
        const widths = [48, 76, 62, 62, 132];
        for (let available = 0; available <= 400; available += 7) {
            for (let current = 0; current < widths.length; current++) {
                const fit = fitTabCount(widths, available, current, MORE, CARET);
                const used = widths.slice(0, fit).reduce((sum, width) => sum + width, 0);
                const button = fit === widths.length ? 0 : current >= fit ? widths[current] + CARET : MORE;
                expect(fit === 0 || used + button <= available, `available=${available} current=${current}`).toBe(true);
            }
        }
    });
});
