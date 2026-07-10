import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import HandleTypeahead from './HandleTypeahead.svelte';

beforeAll(() => {
    Element.prototype.animate = function () {
        const animation: any = {
            cancel() {},
            finish() {},
            pause() {},
            play() {},
            finished: Promise.resolve(),
        };
        Object.defineProperty(animation, 'onfinish', {
            set(cb: (() => void) | null) {
                if (cb) queueMicrotask(cb);
            },
        });
        return animation;
    } as any;
});

const actors = [
    { did: 'did:plc:alice', handle: 'alice.bsky.social', displayName: 'Alice', avatar: '' },
    { did: 'did:plc:bob', handle: 'bob.bsky.social', displayName: 'Bob', avatar: '' },
];

afterEach(() => {
    vi.unstubAllGlobals();
});

function stubFetch(impl?: () => Response) {
    const fetchMock = vi.fn(async () => {
        if (impl) return impl();
        return new Response(JSON.stringify({ actors }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

function getInput(): HTMLInputElement {
    return screen.getByRole('combobox') as HTMLInputElement;
}

describe('HandleTypeahead', () => {
    it('debounces input and renders suggestions with avatar rows', async () => {
        const fetchMock = stubFetch();
        render(HandleTypeahead, { props: { value: '' } });
        const input = getInput();

        await fireEvent.input(input, { target: { value: 'al' } });
        expect(fetchMock).not.toHaveBeenCalled();

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        expect(String(fetchMock.mock.calls[0][0])).toContain('searchActorsTypeahead?q=al');

        await screen.findByText('@alice.bsky.social');
        await screen.findByText('Bob');
    });

    it('selects a suggestion with keyboard navigation', async () => {
        stubFetch();
        render(HandleTypeahead, { props: { value: '' } });
        const input = getInput();

        await fireEvent.input(input, { target: { value: 'al' } });
        await screen.findByText('@alice.bsky.social');

        await fireEvent.keyDown(input, { key: 'ArrowDown' });
        await fireEvent.keyDown(input, { key: 'Enter' });

        expect(input.value).toBe('alice.bsky.social');
        expect(screen.queryByText('@bob.bsky.social')).toBeNull();
    });

    it('selects a suggestion on mousedown', async () => {
        stubFetch();
        render(HandleTypeahead, { props: { value: '' } });
        const input = getInput();

        await fireEvent.input(input, { target: { value: 'bo' } });
        const bob = await screen.findByText('@bob.bsky.social');

        await fireEvent.mouseDown(bob.closest('button')!);
        expect(input.value).toBe('bob.bsky.social');
    });

    it('lets Enter through to the form when no suggestion is highlighted', async () => {
        stubFetch();
        render(HandleTypeahead, { props: { value: '' } });
        const input = getInput();

        const notCancelled = await fireEvent.keyDown(input, { key: 'Enter' });
        expect(notCancelled).toBe(true);
    });

    it('does not query for DID input', async () => {
        const fetchMock = stubFetch();
        render(HandleTypeahead, { props: { value: '' } });
        const input = getInput();

        await fireEvent.input(input, { target: { value: 'did:plc:xyz' } });
        await new Promise(resolve => setTimeout(resolve, 350));

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('disables itself quietly after a network failure', async () => {
        const fetchMock = stubFetch(() => {
            throw new Error('network down');
        });
        render(HandleTypeahead, { props: { value: '' } });
        const input = getInput();

        await fireEvent.input(input, { target: { value: 'al' } });
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        await fireEvent.input(input, { target: { value: 'ali' } });
        await new Promise(resolve => setTimeout(resolve, 350));

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(input.disabled).toBe(false);
    });
});
