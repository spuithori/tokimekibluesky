import { describe, expect, it } from 'vitest';
import { elementScrollHost, resolveColumnScrollHost, windowScrollHost } from './scrollHost';
import { windowScrollRegistry } from './windowScrollRegistry';

describe('elementScrollHost', () => {
    it('要素のスクロールAPIへ委譲する', () => {
        const el = document.createElement('div');
        Object.defineProperty(el, 'scrollHeight', { value: 500 });
        Object.defineProperty(el, 'clientHeight', { value: 100 });
        const host = elementScrollHost(el);
        expect(host.kind).toBe('element');
        expect(host.element).toBe(el);
        host.setScrollTop(40);
        expect(host.scrollTop).toBe(40);
        expect(host.scrollHeight).toBe(500);
        expect(host.clientHeight).toBe(100);
    });

    it('onScrollは購読解除関数を返す', () => {
        const el = document.createElement('div');
        const host = elementScrollHost(el);
        let count = 0;
        const off = host.onScroll(() => { count++; });
        el.dispatchEvent(new Event('scroll'));
        expect(count).toBe(1);
        off();
        el.dispatchEvent(new Event('scroll'));
        expect(count).toBe(1);
    });
});

describe('windowScrollHost', () => {
    it('documentElementを要素として返すシングルトン', () => {
        const host = windowScrollHost();
        expect(host.kind).toBe('window');
        expect(host.element).toBe(document.documentElement);
        expect(windowScrollHost()).toBe(host);
    });
});

describe('resolveColumnScrollHost', () => {
    it('single はwindowホスト', () => {
        const el = document.createElement('div');
        const host = resolveColumnScrollHost({ scrollElement: el }, { layoutStyle: 'single', isJunk: false });
        expect(host.kind).toBe('window');
    });

    it('deck はscrollElementベース・無ければwindowへフォールバック', () => {
        const el = document.createElement('div');
        expect(resolveColumnScrollHost({ scrollElement: el }, { layoutStyle: 'deck', isJunk: false }).element).toBe(el);
        expect(resolveColumnScrollHost({ scrollElement: null }, { layoutStyle: 'deck', isJunk: false }).kind).toBe('window');
        expect(resolveColumnScrollHost(undefined, { layoutStyle: 'deck', isJunk: false }).kind).toBe('window');
    });

    it('junk はmodal-page-content祖先を優先解決する', () => {
        const modal = document.createElement('div');
        modal.className = 'modal-page-content';
        const inner = document.createElement('div');
        modal.appendChild(inner);
        document.body.appendChild(modal);
        expect(resolveColumnScrollHost({ scrollElement: inner }, { layoutStyle: 'deck', isJunk: true }).element).toBe(modal);

        const detached = document.createElement('div');
        expect(resolveColumnScrollHost({ scrollElement: detached }, { layoutStyle: 'deck', isJunk: true }).element).toBe(detached);

        expect(resolveColumnScrollHost({ scrollElement: null }, { layoutStyle: 'deck', isJunk: true }).element).toBe(modal);
        modal.remove();
    });
});

describe('windowScrollRegistry', () => {
    it('save/peek/clearが機能する', () => {
        windowScrollRegistry.clear();
        expect(windowScrollRegistry.peek('a')).toBeUndefined();
        windowScrollRegistry.save('a');
        expect(windowScrollRegistry.peek('a')).toBe(window.scrollY);
        windowScrollRegistry.clear();
        expect(windowScrollRegistry.peek('a')).toBeUndefined();
    });
});
