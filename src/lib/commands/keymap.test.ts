import { describe, expect, it } from 'vitest';
import { comboKey, eventMatches, parseCombo } from './keymap';

function fakeEvent(init: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
    return {
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        code: '',
        ...init,
    } as KeyboardEvent;
}

describe('parseCombo', () => {
    it('単純な修飾+キー', () => {
        expect(parseCombo('ctrl+k', false)).toEqual({ ctrl: true, alt: false, shift: false, meta: false, key: 'k' });
        expect(parseCombo('mod+shift+L', false)).toEqual({ ctrl: true, alt: false, shift: true, meta: false, key: 'l' });
    });

    it('mod は mac で meta、その他で ctrl', () => {
        expect(parseCombo('mod+k', true)?.meta).toBe(true);
        expect(parseCombo('mod+k', false)?.ctrl).toBe(true);
    });

    it('cmd / super は meta エイリアス', () => {
        expect(parseCombo('cmd+p', false)?.meta).toBe(true);
        expect(parseCombo('super+p', false)?.meta).toBe(true);
    });

    it('named keys のエイリアス', () => {
        expect(parseCombo('ctrl+space', false)?.key).toBe(' ');
        expect(parseCombo('ctrl+plus', false)?.key).toBe('+');
        expect(parseCombo('alt+up', false)?.key).toBe('arrowup');
    });

    it('裸キー(修飾なし)と数字キー', () => {
        expect(parseCombo('escape', false)).toEqual({ ctrl: false, alt: false, shift: false, meta: false, key: 'escape' });
        expect(parseCombo('alt+1', false)?.key).toBe('1');
    });

    it('不正コンボは null', () => {
        expect(parseCombo('', false)).toBeNull();
        expect(parseCombo('ctrl+', false)).toBeNull();
        expect(parseCombo('ctrl+k+j', false)).toBeNull();
    });
});

describe('eventMatches', () => {
    it('修飾とキーの完全一致', () => {
        const combo = parseCombo('ctrl+k', false)!;
        expect(eventMatches(combo, fakeEvent({ key: 'k', ctrlKey: true }))).toBe(true);
        expect(eventMatches(combo, fakeEvent({ key: 'k' }))).toBe(false);
        expect(eventMatches(combo, fakeEvent({ key: 'k', ctrlKey: true, shiftKey: true }))).toBe(false);
    });

    it('shift+数字は code フォールバックで一致する', () => {
        const combo = parseCombo('ctrl+shift+1', false)!;
        expect(eventMatches(combo, fakeEvent({ key: '!', ctrlKey: true, shiftKey: true, code: 'Digit1' }))).toBe(true);
    });
});

describe('comboKey', () => {
    it('同一コンボは同一キーになる', () => {
        expect(comboKey(parseCombo('ctrl+shift+k', false)!)).toBe(comboKey(parseCombo('shift+ctrl+K', false)!));
    });
});
