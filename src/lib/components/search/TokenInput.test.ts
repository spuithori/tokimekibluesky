import { render, fireEvent, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import TokenInput from './TokenInput.svelte';

function getInput(): HTMLInputElement {
    return screen.getByRole('textbox') as HTMLInputElement;
}

function chipTexts(container: HTMLElement): string[] {
    return [...container.querySelectorAll('.token-input__chip span')].map(el => el.textContent ?? '');
}

describe('TokenInput', () => {
    it('commits a token on Enter and clears the input', async () => {
        const { container } = render(TokenInput, { props: { tokens: [] } });
        const input = getInput();

        await fireEvent.input(input, { target: { value: 'bluesky' } });
        await fireEvent.keyDown(input, { key: 'Enter' });

        expect(chipTexts(container)).toEqual(['bluesky']);
        expect(input.value).toBe('');
    });

    it('ignores Enter while composing (IME)', async () => {
        const { container } = render(TokenInput, { props: { tokens: [] } });
        const input = getInput();

        await fireEvent.input(input, { target: { value: 'ぶるーすかい' } });
        await fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

        expect(chipTexts(container)).toEqual([]);
        expect(input.value).toBe('ぶるーすかい');
    });

    it('commits a token on comma', async () => {
        const { container } = render(TokenInput, { props: { tokens: [] } });
        const input = getInput();

        await fireEvent.input(input, { target: { value: 'example.com' } });
        await fireEvent.keyDown(input, { key: ',' });

        expect(chipTexts(container)).toEqual(['example.com']);
    });

    it('removes the last token on Backspace when the input is empty', async () => {
        const { container } = render(TokenInput, { props: { tokens: ['one', 'two'] } });
        const input = getInput();

        await fireEvent.keyDown(input, { key: 'Backspace' });

        expect(chipTexts(container)).toEqual(['one']);
    });

    it('does not add duplicate tokens', async () => {
        const { container } = render(TokenInput, { props: { tokens: ['dup'] } });
        const input = getInput();

        await fireEvent.input(input, { target: { value: 'dup' } });
        await fireEvent.keyDown(input, { key: 'Enter' });

        expect(chipTexts(container)).toEqual(['dup']);
    });

    it('applies transform before committing', async () => {
        const { container } = render(TokenInput, { props: { tokens: [], transform: (v: string) => v.replace(/^#/, '') } });
        const input = getInput();

        await fireEvent.input(input, { target: { value: '#tag' } });
        await fireEvent.keyDown(input, { key: 'Enter' });

        expect(chipTexts(container)).toEqual(['tag']);
    });
});
