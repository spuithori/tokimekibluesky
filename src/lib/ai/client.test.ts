// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AI_POLICY_VERSION } from '$lib/ai-policy';

const { store, consent } = vi.hoisted(() => ({
    store: { general: { autoColumnIcon: false, aiPolicyConsent: '' } },
    consent: { ensure: vi.fn(async (_feature?: string) => false) },
}));

vi.mock('$lib/settings/settings.svelte', () => ({ settingsStore: store }));
vi.mock('$lib/ai/consent.svelte', () => ({ aiConsent: consent }));

import { requestAltText, requestColumnIcon } from './client';

describe('requestAltText', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        consent.ensure.mockReset();
        fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 200, json: async () => ({ text: 'ねこ' }) }));
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => vi.unstubAllGlobals());

    it('同意が得られなければ送信せず null を返す', async () => {
        consent.ensure.mockResolvedValue(false);
        expect(await requestAltText(new Blob(['x'], { type: 'image/webp' }), 'ocr', 'ja')).toBeNull();
        expect(consent.ensure).toHaveBeenCalledWith('altText');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('同意済みなら画像を生バイナリで送り、フォーム系の Content-Type を使わない', async () => {
        consent.ensure.mockResolvedValue(true);
        const image = new Blob(['x'], { type: 'image/webp' });
        expect(await requestAltText(image, 'description', 'ja')).toBe('ねこ');
        const [url, init] = fetchMock.mock.calls[0];
        const params = new URL(url, 'http://localhost').searchParams;
        expect(Object.fromEntries(params)).toEqual({ category: 'description', language: 'ja', policy: AI_POLICY_VERSION });
        expect(init.method).toBe('POST');
        expect(init.body).toBe(image);
        expect(init.headers).toEqual({ 'Content-Type': 'image/webp' });
    });

    it('サーバーエラーは例外にする(拒否とは区別する)', async () => {
        consent.ensure.mockResolvedValue(true);
        fetchMock.mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) });
        await expect(requestAltText(new Blob(['x'], { type: 'image/webp' }), 'ocr', 'ja')).rejects.toThrow('alt 502');
    });
});

describe('requestColumnIcon', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('無効時は同意ダイアログも出さず送信もしない(自動機能は黙って何もしない)', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        consent.ensure.mockReset();
        store.general.autoColumnIcon = true;
        store.general.aiPolicyConsent = '';
        expect(await requestColumnIcon('ねこ', '猫')).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(consent.ensure).not.toHaveBeenCalled();
    });
});
