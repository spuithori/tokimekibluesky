import { render } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).Worker = class {
        onmessage: ((e: any) => void) | null = null;
        postMessage() {}
        terminate() {}
        addEventListener() {}
        removeEventListener() {}
    };
});

vi.mock('$lib/classes/appState.svelte', () => ({
    appState: { profile: { current: 1 }, labelDefs: { current: [] } },
}));
vi.mock('$lib/classes/settingsState.svelte', () => ({
    settingsState: { settings: {} },
}));
vi.mock('$lib/util', async (importOriginal) => ({
    ...(await importOriginal<typeof import('$lib/util')>()),
    getService: vi.fn(() => Promise.resolve('https://pds.example')),
}));

import GifImage from './GifImage.svelte';

const created: string[] = [];
const revoked: string[] = [];
let resolveFetch: (() => void) | undefined;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    created.length = 0;
    revoked.length = 0;
    resolveFetch = undefined;

    let n = 0;
    URL.createObjectURL = vi.fn(() => {
        const u = `blob:vitest-${n++}`;
        created.push(u);
        return u;
    }) as any;
    URL.revokeObjectURL = vi.fn((u: string) => {
        revoked.push(u);
    }) as any;

    fetchMock = vi.fn(() => new Promise((resolve) => {
        resolveFetch = () => resolve({
            arrayBuffer: async () => new ArrayBuffer(4),
        });
    }));
    vi.stubGlobal('fetch', fetchMock);
});

const props = { did: 'did:plc:test', blob: { ref: { $link: 'bafycid' } } };

describe('GifImage object URL lifecycle', () => {
    it('revokes the URL on unmount after load completes', async () => {
        const { unmount } = render(GifImage, { props });

        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
        resolveFetch!();
        await vi.waitFor(() => expect(created.length).toBe(1));

        unmount();

        expect(revoked).toEqual(created);
    });

    it('revokes the URL when unmounted before the fetch resolves', async () => {
        const { unmount } = render(GifImage, { props });

        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
        unmount();
        expect(created.length).toBe(0);

        resolveFetch!();
        await vi.waitFor(() => expect(created.length).toBe(1));

        expect(revoked).toEqual(created);
    });
});
