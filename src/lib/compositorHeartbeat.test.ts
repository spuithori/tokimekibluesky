import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { attachCompositorHeartbeat } from './compositorHeartbeat';

type FakeAnimation = { cancelled: boolean; cancel: () => void };

let animations: FakeAnimation[];
let detach: (() => void) | undefined;
let hidden: boolean;
let desktop: EventTarget & { matches: boolean };

function running() {
    return animations.filter((a) => !a.cancelled).length;
}

function setHidden(value: boolean) {
    hidden = value;
    document.dispatchEvent(new Event('visibilitychange'));
}

function setDesktop(value: boolean) {
    desktop.matches = value;
    desktop.dispatchEvent(new Event('change'));
}

beforeEach(() => {
    animations = [];
    hidden = false;
    desktop = Object.assign(new EventTarget(), { matches: true });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    window.matchMedia = (() => desktop) as unknown as typeof window.matchMedia;
    HTMLElement.prototype.animate = function () {
        const animation: FakeAnimation = {
            cancelled: false,
            cancel() {
                this.cancelled = true;
            },
        };
        animations.push(animation);
        return animation as unknown as Animation;
    };
});

afterEach(() => {
    detach?.();
    detach = undefined;
});

describe('compositorHeartbeat', () => {
    it('タブ表示中は回り続け、非表示で止まり、再表示で再開する', () => {
        detach = attachCompositorHeartbeat();
        expect(running()).toBe(1);

        setHidden(true);
        expect(running()).toBe(0);

        setHidden(false);
        expect(running()).toBe(1);
        expect(animations.length).toBe(2);
    });

    it('表示状態が変わらない通知では二重に起動しない', () => {
        detach = attachCompositorHeartbeat();
        setHidden(false);
        setDesktop(true);
        expect(animations.length).toBe(1);
    });

    it('モバイル幅では回さず、幅の変化に追従する', () => {
        desktop.matches = false;
        detach = attachCompositorHeartbeat();
        expect(running()).toBe(0);

        setDesktop(true);
        expect(running()).toBe(1);

        setDesktop(false);
        expect(running()).toBe(0);
    });

    it('解除後は要素・アニメ・リスナーが残らない', () => {
        const before = document.body.childElementCount;
        detach = attachCompositorHeartbeat();
        expect(document.body.childElementCount).toBe(before + 1);
        detach();
        detach = undefined;

        expect(document.body.childElementCount).toBe(before);
        expect(running()).toBe(0);

        setHidden(false);
        setDesktop(true);
        expect(animations.length).toBe(1);
    });
});
