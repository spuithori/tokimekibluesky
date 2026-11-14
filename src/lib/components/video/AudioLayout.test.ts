import { render } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AudioLayout from './AudioLayout.svelte';

function makePlayer(overrides: Record<string, any> = {}) {
    return {
        paused: true,
        ended: false,
        currentTime: 0,
        duration: 100,
        volume: 1,
        muted: false,
        title: 'Song',
        artist: 'Artist',
        togglePlay: vi.fn(),
        seek: vi.fn(),
        setVolume: vi.fn(),
        toggleMute: vi.fn(),
        ...overrides,
    };
}

function fixedRect(el: Element, left: number, width: number) {
    el.getBoundingClientRect = () =>
        ({ left, width, top: 0, right: left + width, bottom: 4, height: 4, x: left, y: 0, toJSON() {} }) as DOMRect;
}

function pointerAt(type: string, el: Element, clientX: number) {
    const ev = new MouseEvent(type, { clientX, bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'pointerId', { value: 1 });
    el.dispatchEvent(ev);
}

function pointerDownAt(el: Element, clientX: number) {
    pointerAt('pointerdown', el, clientX);
}

describe('AudioLayout', () => {
    beforeEach(() => {
        (Element.prototype as any).setPointerCapture = vi.fn();
        (Element.prototype as any).releasePointerCapture = vi.fn();
    });

    it('adjusts volume via the slider (calls setVolume with the click fraction)', () => {
        const player = makePlayer();
        const { container } = render(AudioLayout, { context: new Map([['player', player]]) });

        const vol = container.querySelector('.audio-player__volume')!;
        expect(vol).not.toBeNull();
        fixedRect(vol, 100, 50);

        pointerDownAt(vol, 125);

        expect(player.setVolume).toHaveBeenCalled();
        const arg = player.setVolume.mock.calls.at(-1)![0];
        expect(arg).toBeCloseTo(0.5, 2);
    });

    it('seeks once on release (preview only while pressed) with the release fraction of duration', () => {
        const player = makePlayer({ duration: 200 });
        const { container } = render(AudioLayout, { context: new Map([['player', player]]) });

        const seek = container.querySelector('.audio-player__seek')!;
        fixedRect(seek, 0, 100);

        pointerDownAt(seek, 75);
        expect(player.seek).not.toHaveBeenCalled();

        pointerAt('pointerup', seek, 75);

        expect(player.seek).toHaveBeenCalledTimes(1);
        expect(player.seek.mock.calls[0][0]).toBeCloseTo(150, 0);
    });

    it('renders no artwork and keeps the volume slider present', () => {
        const player = makePlayer();
        const { container } = render(AudioLayout, { context: new Map([['player', player]]) });

        expect(container.querySelector('.audio-card__badge')).toBeNull();
        expect(container.querySelector('.audio-player__volume')).not.toBeNull();
    });
});
