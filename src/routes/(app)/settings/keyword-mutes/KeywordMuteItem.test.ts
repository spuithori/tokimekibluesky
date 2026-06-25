import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import KeywordMuteItem from './KeywordMuteItem.svelte';
import { makeKeywordMute } from '$lib/test-fixtures/fixtures';

describe('KeywordMuteItem', () => {
    it('renders the stored word into the text input', () => {
        const keyword = makeKeywordMute({ word: 'spoiler' });
        const { container } = render(KeywordMuteItem, { props: { keyword, index: 0 } });
        const input = container.querySelector('.keyword-name__input') as HTMLInputElement;
        expect(input.value).toBe('spoiler');
    });

    it('reflects the enabled flag on the toggle', () => {
        const keyword = makeKeywordMute({ word: 'x', enabled: false });
        const { container } = render(KeywordMuteItem, { props: { keyword, index: 1 } });
        const toggle = container.querySelector('.input-toggle__input') as HTMLInputElement;
        expect(toggle.checked).toBe(false);
    });

    it('renders the period start and end into the time inputs', () => {
        const keyword = makeKeywordMute({ word: 'x', period: { start: '08:30', end: '17:45' } });
        const { container } = render(KeywordMuteItem, { props: { keyword, index: 0 } });
        const times = Array.from(container.querySelectorAll('input[type="time"]')) as HTMLInputElement[];
        expect(times.map((t) => t.value)).toEqual(['08:30', '17:45']);
    });

    it('reflects the ignoreCaseSensitive flag', () => {
        const keyword = makeKeywordMute({ word: 'x', ignoreCaseSensitive: true });
        const { container } = render(KeywordMuteItem, { props: { keyword, index: 2 } });
        const checkbox = container.querySelector('.checkbox__input') as HTMLInputElement;
        expect(checkbox.checked).toBe(true);
    });
});
