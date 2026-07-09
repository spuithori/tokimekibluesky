import { describe, expect, it } from 'vitest';
import { PUBLISH_EDITOR_MAX, PUBLISH_EDITOR_MIN, clampPublishEditorHeight } from './publishHeight';

describe('clampPublishEditorHeight', () => {
    it('範囲内は四捨五入してそのまま返す', () => {
        expect(clampPublishEditorHeight(320)).toBe(320);
        expect(clampPublishEditorHeight(320.6)).toBe(321);
    });

    it('範囲外はmin/maxへクランプする', () => {
        expect(clampPublishEditorHeight(10)).toBe(PUBLISH_EDITOR_MIN);
        expect(clampPublishEditorHeight(5000)).toBe(PUBLISH_EDITOR_MAX);
    });

    it('NaNはminへ落ちる', () => {
        expect(clampPublishEditorHeight(Number.NaN)).toBe(PUBLISH_EDITOR_MIN);
    });
});
