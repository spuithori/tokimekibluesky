import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AI_FEATURES, AI_POLICY_VERSION } from '$lib/ai-policy';
import { historyStub } from '$lib/test/appNavigationStub';

const { general } = vi.hoisted(() => ({
    general: { autoColumnIcon: false, aiPolicyConsent: '' },
}));

vi.mock('$lib/settings/settings.svelte', () => ({ settingsStore: { general } }));

import AiConsentDialog from './AiConsentDialog.svelte';
import { aiConsent } from '$lib/ai/consent.svelte';

describe('TOKIMEKI AI の同意', () => {
    beforeEach(() => {
        aiConsent.attach(undefined);
        aiConsent.settle(false);
        historyStub.reset();
        general.autoColumnIcon = false;
        general.aiPolicyConsent = '';
        vi.spyOn(history, 'go').mockImplementation(delta => historyStub.go(delta ?? 0));
        HTMLDialogElement.prototype.showModal = vi.fn();
        Element.prototype.animate = vi.fn(() => ({ cancel() {}, finished: Promise.resolve(), onfinish: null, addEventListener() {}, removeEventListener() {} })) as any;
    });

    const dialogOf = (container: HTMLElement) => container.ownerDocument.querySelector('dialog');

    it('現行版へ同意済みならダイアログを出さず、履歴も積まない', async () => {
        general.aiPolicyConsent = AI_POLICY_VERSION;
        const { container } = render(AiConsentDialog);
        expect(await aiConsent.ensure('altText')).toBe(true);
        expect(dialogOf(container)).toBeNull();
        expect(historyStub.depth).toBe(0);
    });

    it('未同意なら全機能を一覧し、いま使おうとしている機能を強調する(同意画面では表を使わない)', async () => {
        const { container, findByText } = render(AiConsentDialog);
        const pending = aiConsent.ensure('altText');
        await findByText('Enable TOKIMEKI AI');
        const cards = [...container.ownerDocument.querySelectorAll('dialog .ai-feature')];
        expect(cards).toHaveLength(AI_FEATURES.length);
        const current = cards.filter(card => card.classList.contains('ai-feature--current'));
        expect(current).toHaveLength(1);
        expect(current[0].textContent).toContain('Automatic image ALT text');
        expect(container.ownerDocument.querySelector('dialog table')).toBeNull();
        expect(historyStub.depth).toBe(1);
        aiConsent.settle(false);
        expect(await pending).toBe(false);
        expect(historyStub.depth).toBe(0);
    });

    it('チェックするまで有効にできず、チェックして有効にすると現行版への同意を記録して履歴を戻す', async () => {
        const { container, findByText } = render(AiConsentDialog);
        const pending = aiConsent.ensure('columnIcon');
        const enable = await findByText('Enable') as HTMLButtonElement;
        expect(enable.disabled).toBe(true);
        expect(container.ownerDocument.querySelector('.ai-consent-check .checkbox__ui')).not.toBeNull();
        await fireEvent.click(container.ownerDocument.querySelector<HTMLInputElement>('.ai-consent-check input')!);
        await fireEvent.click(enable);
        expect(await pending).toBe(true);
        expect(general.aiPolicyConsent).toBe(AI_POLICY_VERSION);
        expect(general.autoColumnIcon).toBe(false);
        expect(historyStub.depth).toBe(0);
        await waitFor(() => expect(dialogOf(container)).toBeNull());
    });

    it('キャンセルは何も記録せず false を返す', async () => {
        const { findByText } = render(AiConsentDialog);
        const pending = aiConsent.ensure('altText');
        await fireEvent.click(await findByText('Cancel'));
        expect(await pending).toBe(false);
        expect(general.aiPolicyConsent).toBe('');
    });

    it('ポリシーは同じダイアログ内で開き、「戻る」で同意画面へ戻る(チェック状態は保たれ、新規タブも別モーダルも使わない)', async () => {
        const { container, findByText } = render(AiConsentDialog);
        const doc = container.ownerDocument;
        const pending = aiConsent.ensure('altText');
        await findByText('Enable TOKIMEKI AI');
        await fireEvent.click(doc.querySelector<HTMLInputElement>('.ai-consent-check input')!);
        await fireEvent.click(await findByText('Read the TOKIMEKI AI Usage Policy and Terms'));
        await findByText('TOKIMEKI AI Usage Policy and Terms');
        expect(historyStub.depth).toBe(2);
        expect(doc.querySelectorAll('dialog')).toHaveLength(1);
        expect(doc.querySelectorAll('dialog a[target="_blank"]')).toHaveLength(0);
        expect(doc.querySelectorAll('dialog .ai-table-wrap')).toHaveLength(AI_FEATURES.length);

        historyStub.go(-1);
        await waitFor(() => expect(doc.querySelector<HTMLInputElement>('.ai-consent-check input')?.checked).toBe(true));
        await fireEvent.click(await findByText('Enable'));
        expect(await pending).toBe(true);
        expect(historyStub.depth).toBe(0);
    });

    it('ポリシー表示中に閉じると、同意フローごと閉じて積んだ履歴を全部戻し、次回は初期状態で開く', async () => {
        const { container, findByText } = render(AiConsentDialog);
        const doc = container.ownerDocument;
        const pending = aiConsent.ensure('altText');
        await findByText('Enable TOKIMEKI AI');
        await fireEvent.click(doc.querySelector<HTMLInputElement>('.ai-consent-check input')!);
        await fireEvent.click(await findByText('Read the TOKIMEKI AI Usage Policy and Terms'));
        await findByText('TOKIMEKI AI Usage Policy and Terms');
        await fireEvent.click(doc.querySelector<HTMLButtonElement>('.modal-close-button')!);
        expect(await pending).toBe(false);
        expect(historyStub.depth).toBe(0);
        await waitFor(() => expect(dialogOf(container)).toBeNull());

        const again = aiConsent.ensure('altText');
        await findByText('Enable TOKIMEKI AI');
        expect(doc.querySelector<HTMLInputElement>('.ai-consent-check input')!.checked).toBe(false);
        aiConsent.settle(false);
        await again;
    });

    it('ブラウザの「戻る」を同意画面で押すと、ページ移動ではなくダイアログが閉じて false を返す', async () => {
        const { container, findByText } = render(AiConsentDialog);
        const pending = aiConsent.ensure('altText');
        await findByText('Enable TOKIMEKI AI');
        historyStub.go(-1);
        expect(await pending).toBe(false);
        await waitFor(() => expect(dialogOf(container)).toBeNull());
        expect(general.aiPolicyConsent).toBe('');
    });

    it('同意と無関係にポリシーだけを開ける(戻る矢印なし・履歴は 1 つ・閉じても同意状態は変わらない)', async () => {
        const { container, findByText } = render(AiConsentDialog);
        const doc = container.ownerDocument;
        aiConsent.showPolicy();
        await findByText('TOKIMEKI AI Usage Policy and Terms');
        expect(historyStub.depth).toBe(1);
        expect(doc.querySelector('.modal-back-button')).toBeNull();
        expect(doc.querySelector('.ai-consent-check')).toBeNull();
        await fireEvent.click(doc.querySelector<HTMLButtonElement>('.modal-close-button')!);
        await waitFor(() => expect(dialogOf(container)).toBeNull());
        expect(historyStub.depth).toBe(0);
        expect(general.aiPolicyConsent).toBe('');
    });

    it('既存の page.state(スマホの投稿画面など)を消さずに履歴を積む', async () => {
        const { pushState } = await import('$app/navigation');
        pushState('', { showPublish: true });
        const { findByText } = render(AiConsentDialog);
        const pending = aiConsent.ensure('altText');
        await findByText('Enable TOKIMEKI AI');
        const { page } = await import('$app/state');
        expect(page.state).toEqual({ showPublish: true, aiDialog: 'consent' });
        aiConsent.settle(false);
        await pending;
        expect(page.state).toEqual({ showPublish: true });
    });

    it('撤回は 1 操作で同意と自動機能の両方を止める', () => {
        general.aiPolicyConsent = AI_POLICY_VERSION;
        general.autoColumnIcon = true;
        aiConsent.withdraw();
        expect(general.aiPolicyConsent).toBe('');
        expect(general.autoColumnIcon).toBe(false);
    });

    it('旧版への同意は未同意として扱い、再同意を求める', async () => {
        general.aiPolicyConsent = '2000-01-01.v1';
        const { findByText } = render(AiConsentDialog);
        const pending = aiConsent.ensure('altText');
        await findByText('Enable TOKIMEKI AI');
        aiConsent.settle(false);
        expect(await pending).toBe(false);
    });
});
