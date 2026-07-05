import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { animEasing, animMs } from './anim';
import { settingsStore } from '$lib/settings/settings.svelte';

function mockMatchMedia(reduced: boolean) {
    window.matchMedia = ((query: string) => ({
        matches: reduced && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener() {},
        removeEventListener() {},
    })) as any;
}

describe('anim helpers', () => {
    beforeEach(() => {
        mockMatchMedia(false);
        settingsStore.rice.enabled = true;
        settingsStore.rice.config = '';
    });

    afterEach(() => {
        settingsStore.rice.enabled = true;
        settingsStore.rice.config = '';
    });

    it('rice無効/animationセクション無しはfallbackを返す', () => {
        expect(animMs('panel', 250)).toBe(250);
        expect(animEasing('panel', 'ease')).toBe('ease');

        settingsStore.rice.config = 'animation {\n    panel = 100ms\n}';
        settingsStore.rice.enabled = false;
        expect(animMs('panel', 250)).toBe(250);
    });

    it('設定済みtargetのduration/easingを返し未設定targetはfallback', () => {
        settingsStore.rice.config = 'animation {\n    bezier = smooth, 0.2, 0, 0, 1\n    panel = 100ms, smooth\n}';
        expect(animMs('panel', 250)).toBe(100);
        expect(animEasing('panel', 'ease')).toBe('cubic-bezier(0.2, 0, 0, 1)');
        expect(animMs('modal', 250)).toBe(250);
        expect(animEasing('modal', 'ease')).toBe('ease');
    });

    it('enabled=falseで0を返す', () => {
        settingsStore.rice.config = 'animation {\n    enabled = false\n    panel = 100ms\n}';
        expect(animMs('panel', 250)).toBe(0);
    });

    it('target=offで0を返す', () => {
        settingsStore.rice.config = 'animation {\n    tooltip = off\n}';
        expect(animMs('tooltip', 150)).toBe(0);
    });

    it('prefers-reduced-motionが最優先で0(rice未設定でも)', () => {
        mockMatchMedia(true);
        expect(animMs('panel', 250)).toBe(0);

        settingsStore.rice.config = 'animation {\n    panel = 100ms\n}';
        expect(animMs('panel', 250)).toBe(0);
    });
});
