import { describe, it, expect } from 'vitest';
import { AI_FEATURES, AI_POLICY_SECTIONS, AI_POLICY_VERSION, aiEndpoint, hasAiPolicyConsent, isAutoColumnIconEnabled } from './ai-policy';
import en from '$lib/i18n/locales/en.json';
import ja from '$lib/i18n/locales/ja.json';
import { getAiPolicyCopy } from './ai-policy-copy';
import { createDefaultSettings } from '$lib/settings/defaults';

describe('isAutoColumnIconEnabled', () => {
    it('初期設定では無効(オプトイン)', () => {
        const { general } = createDefaultSettings();
        expect(hasAiPolicyConsent(general)).toBe(false);
        expect(isAutoColumnIconEnabled(general)).toBe(false);
    });

    it('現行版へ同意済みかつトグル ON のときだけ有効', () => {
        expect(isAutoColumnIconEnabled({ autoColumnIcon: true, aiPolicyConsent: AI_POLICY_VERSION })).toBe(true);
        expect(isAutoColumnIconEnabled({ autoColumnIcon: false, aiPolicyConsent: AI_POLICY_VERSION })).toBe(false);
    });

    it('同意なしでトグルだけ ON(設定インポート等)は無効', () => {
        expect(isAutoColumnIconEnabled({ autoColumnIcon: true, aiPolicyConsent: '' })).toBe(false);
    });

    it('旧版への同意は無効(文書改定時は再同意)', () => {
        expect(isAutoColumnIconEnabled({ autoColumnIcon: true, aiPolicyConsent: '2000-01-01.v1' })).toBe(false);
    });
});

describe('getAiPolicyCopy', () => {
    it('日英とも全セクションの見出しと本文、全機能の表の全列を持つ', () => {
        for (const locale of ['ja', 'en']) {
            const copy = getAiPolicyCopy(locale);
            for (const section of AI_POLICY_SECTIONS) {
                expect(copy.sections[section].title).not.toBe('');
                expect(copy.sections[section].body).not.toBe('');
            }
            for (const feature of AI_FEATURES) {
                for (const column of ['name', 'data', 'trigger', 'purpose', 'retention'] as const) {
                    expect(copy.features[feature.id][column], `${locale} ${feature.id} ${column}`).not.toBe('');
                }
            }
        }
    });

    it('ja 以外・未確定ロケールは英語へフォールバック', () => {
        expect(getAiPolicyCopy('ko-kr')).toBe(getAiPolicyCopy('en'));
        expect(getAiPolicyCopy(undefined)).toBe(getAiPolicyCopy('en'));
        expect(getAiPolicyCopy('ja')).not.toBe(getAiPolicyCopy('en'));
    });
});

describe('AI_FEATURES', () => {
    it('全機能に名前・送信データ・起動種別の文言が日英ともある', () => {
        for (const feature of AI_FEATURES) {
            for (const key of [`ai_feature_${feature.id}`, `ai_feature_${feature.id}_data`, `ai_trigger_${feature.trigger}`]) {
                expect((ja as Record<string, string>)[key], key).toBeTruthy();
                expect((en as Record<string, string>)[key], key).toBeTruthy();
            }
        }
    });

    it('aiEndpoint は同意した文書の版を必ず付ける', () => {
        const url = new URL(aiEndpoint('altText', { category: 'ocr', language: 'ja' }), 'http://localhost');
        expect(url.pathname).toBe('/api/ai/alt');
        expect(url.searchParams.get('policy')).toBe(AI_POLICY_VERSION);
    });
});
