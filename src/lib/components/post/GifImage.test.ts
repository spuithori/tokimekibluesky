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

class MockIntersectionObserver {
    static instances: MockIntersectionObserver[] = [];
    callback: IntersectionObserverCallback;
    observed: Element[] = [];

    constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        MockIntersectionObserver.instances.push(this);
    }
    observe(el: Element) {
        this.observed.push(el);
    }
    unobserve(el: Element) {
        this.observed = this.observed.filter((o) => o !== el);
    }
    disconnect() {
        this.observed = [];
    }
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

import GifImage from './GifImage.svelte';
import { getService } from '$lib/util';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.mocked(getService).mockClear();
    URL.createObjectURL = vi.fn() as any;

    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
});

const props = { did: 'did:plc:test', blob: { ref: { $link: 'bafycid' } } };

function fireVisible(target: Element) {
    for (const io of MockIntersectionObserver.instances) {
        if (io.observed.includes(target)) {
            io.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], io as any);
        }
    }
}

describe('GifImage lazy direct-src', () => {
    it('does not resolve anything until the element becomes visible', async () => {
        const { container } = render(GifImage, { props });

        expect(getService).not.toHaveBeenCalled();

        const wrapper = container.querySelector('.gif-image')!;
        fireVisible(wrapper);

        await vi.waitFor(() => {
            const img = container.querySelector('img');
            expect(img?.getAttribute('src')).toBe(
                'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Atest&cid=bafycid',
            );
        });

        expect(fetchMock).not.toHaveBeenCalled();
        expect(URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('does not resolve when unmounted before becoming visible', async () => {
        const { container, unmount } = render(GifImage, { props });
        const wrapper = container.querySelector('.gif-image')!;

        unmount();
        fireVisible(wrapper);

        await Promise.resolve();
        expect(getService).not.toHaveBeenCalled();
    });
});
