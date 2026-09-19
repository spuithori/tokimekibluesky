import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AI_POLICY_VERSION } from '$lib/ai-policy';

const { general } = vi.hoisted(() => ({
    general: { autoColumnIcon: false, aiPolicyConsent: '' },
}));

vi.mock('$lib/settings/settings.svelte', () => ({ settingsStore: { general } }));

import Page from './+page.svelte';
import { aiConsent } from '$lib/ai/consent.svelte';

describe('設定 > TOKIMEKI AI', () => {
    beforeEach(() => {
        general.autoColumnIcon = false;
        general.aiPolicyConsent = '';
    });

    it('チェックするまで「有効にする」は押せない', async () => {
        const { container } = render(Page);
        const enable = container.querySelector<HTMLButtonElement>('.ai-status__actions .button')!;
        expect(enable.disabled).toBe(true);
        await fireEvent.click(enable);
        expect(general.aiPolicyConsent).toBe('');
    });

    it('チェックして有効にすると、ダイアログを開かずに現行版への同意を記録する', async () => {
        const ensure = vi.spyOn(aiConsent, 'ensure');
        const { container } = render(Page);
        await fireEvent.click(container.querySelector<HTMLInputElement>('.ai-status__check input')!);
        const enable = container.querySelector<HTMLButtonElement>('.ai-status__actions .button')!;
        expect(enable.disabled).toBe(false);
        await fireEvent.click(enable);
        expect(general.aiPolicyConsent).toBe(AI_POLICY_VERSION);
        expect(general.autoColumnIcon).toBe(false);
        expect(ensure).not.toHaveBeenCalled();
    });
});
