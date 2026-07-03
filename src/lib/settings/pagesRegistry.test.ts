import { describe, it, expect } from 'vitest';
import { pathToCategoryId, parentCategoryId, isSettingsPageId, SETTINGS_PAGE_IDS } from './pagesRegistry';

describe('pathToCategoryId', () => {
    it('/settings は root', () => {
        expect(pathToCategoryId('/settings')).toBe('root');
        expect(pathToCategoryId('/settings/')).toBe('root');
    });

    it('トップカテゴリとサブページを解決する', () => {
        expect(pathToCategoryId('/settings/general')).toBe('general');
        expect(pathToCategoryId('/settings/moderation/labeler')).toBe('moderation/labeler');
        expect(pathToCategoryId('/settings/data/workspace-import-export')).toBe('data/workspace-import-export');
    });

    it('hash / query を無視する', () => {
        expect(pathToCategoryId('/settings/design#skin')).toBe('design');
        expect(pathToCategoryId('/settings/general?foo=1')).toBe('general');
    });

    it('未知パスや設定外パスは root', () => {
        expect(pathToCategoryId('/settings/unknown')).toBe('root');
        expect(pathToCategoryId('/profile/foo')).toBe('root');
        expect(pathToCategoryId('')).toBe('root');
    });
});

describe('parentCategoryId', () => {
    it('サブページは親カテゴリへ・トップは root へ', () => {
        expect(parentCategoryId('moderation/labeler')).toBe('moderation');
        expect(parentCategoryId('design/embed')).toBe('design');
        expect(parentCategoryId('general')).toBe('root');
    });
});

describe('SETTINGS_PAGE_IDS', () => {
    it('全 id が isSettingsPageId で真', () => {
        for (const id of SETTINGS_PAGE_IDS) {
            expect(isSettingsPageId(id)).toBe(true);
        }
        expect(isSettingsPageId('root')).toBe(false);
    });
});
