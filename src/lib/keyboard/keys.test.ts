import { describe, expect, it } from 'vitest';
import { comboToString, eventToCombo, formatComboParts, normalizeComboString, parseCombo } from './keys';

function keyEvent(init: KeyboardEventInit): KeyboardEvent {
    return new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
}

describe('parseCombo / comboToString', () => {
    it('lowercases letters and orders modifiers canonically', () => {
        expect(normalizeComboString('Shift+S')).toBe('shift+s');
        expect(normalizeComboString('shift+ctrl+K')).toBe('ctrl+shift+k');
        expect(normalizeComboString('cmd+enter')).toBe('meta+Enter');
    });

    it('maps aliases to KeyboardEvent.key names', () => {
        expect(normalizeComboString('up')).toBe('ArrowUp');
        expect(normalizeComboString('esc')).toBe('Escape');
        expect(normalizeComboString('space')).toBe('Space');
        expect(normalizeComboString('return')).toBe('Enter');
    });

    it('drops shift from printable symbols because the key already encodes it', () => {
        expect(normalizeComboString('shift+?')).toBe('?');
        expect(normalizeComboString('.')).toBe('.');
        expect(normalizeComboString('+')).toBe('+');
    });

    it('rejects empty or malformed input', () => {
        expect(parseCombo('')).toBeNull();
        expect(parseCombo('ctrl+')).toBeNull();
        expect(parseCombo('foo+s')).toBeNull();
    });

    it('round-trips through comboToString', () => {
        const combo = parseCombo('ctrl+shift+ArrowDown');
        expect(combo && comboToString(combo)).toBe('ctrl+shift+ArrowDown');
    });
});

describe('eventToCombo', () => {
    it('reads letters with the shift flag and symbols without it', () => {
        expect(eventToCombo(keyEvent({ key: 'S', shiftKey: true }))).toBe('shift+s');
        expect(eventToCombo(keyEvent({ key: 's' }))).toBe('s');
        expect(eventToCombo(keyEvent({ key: '?', shiftKey: true }))).toBe('?');
        expect(eventToCombo(keyEvent({ key: '/', shiftKey: false }))).toBe('/');
    });

    it('keeps modifiers for named keys and digits', () => {
        expect(eventToCombo(keyEvent({ key: 'ArrowDown' }))).toBe('ArrowDown');
        expect(eventToCombo(keyEvent({ key: 'Enter', ctrlKey: true }))).toBe('ctrl+Enter');
        expect(eventToCombo(keyEvent({ key: '3' }))).toBe('3');
        expect(eventToCombo(keyEvent({ key: ' ' }))).toBe('Space');
    });

    it('ignores IME composition, dead keys and bare modifiers', () => {
        expect(eventToCombo(keyEvent({ key: 'j', isComposing: true }))).toBeNull();
        expect(eventToCombo(keyEvent({ key: 'Process' }))).toBeNull();
        expect(eventToCombo(keyEvent({ key: 'Dead' }))).toBeNull();
        expect(eventToCombo(keyEvent({ key: 'Shift', shiftKey: true }))).toBeNull();
        expect(eventToCombo(keyEvent({ key: 'Control', ctrlKey: true }))).toBeNull();
    });
});

describe('formatComboParts', () => {
    it('renders human readable chips per platform', () => {
        expect(formatComboParts('shift+s', false)).toEqual(['Shift', 'S']);
        expect(formatComboParts('shift+s', true)).toEqual(['⇧', 'S']);
        expect(formatComboParts('ArrowDown', false)).toEqual(['↓']);
        expect(formatComboParts('Escape', false)).toEqual(['Esc']);
        expect(formatComboParts('?', false)).toEqual(['?']);
    });
});
