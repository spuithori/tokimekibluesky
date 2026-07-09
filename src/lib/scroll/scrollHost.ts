import type { LayoutStyle } from '$lib/rice/config/model';

export interface ScrollHost {
    readonly kind: 'element' | 'window';
    readonly element: HTMLElement;
    readonly scrollTop: number;
    readonly scrollHeight: number;
    readonly clientHeight: number;
    setScrollTop(value: number): void;
    scrollTo(options: ScrollToOptions): void;
    scrollBy(dx: number, dy: number): void;
    onScroll(fn: () => void): () => void;
}

export function elementScrollHost(el: HTMLElement): ScrollHost {
    return {
        kind: 'element',
        element: el,
        get scrollTop() {
            return el.scrollTop;
        },
        get scrollHeight() {
            return el.scrollHeight;
        },
        get clientHeight() {
            return el.clientHeight;
        },
        setScrollTop(value) {
            el.scrollTop = value;
        },
        scrollTo(options) {
            el.scrollTo(options);
        },
        scrollBy(dx, dy) {
            el.scrollBy(dx, dy);
        },
        onScroll(fn) {
            el.addEventListener('scroll', fn, { passive: true });
            return () => el.removeEventListener('scroll', fn);
        },
    };
}

let windowHost: ScrollHost | undefined;

export function windowScrollHost(): ScrollHost {
    if (windowHost) return windowHost;
    windowHost = {
        kind: 'window',
        get element() {
            return document.documentElement;
        },
        get scrollTop() {
            return window.scrollY;
        },
        get scrollHeight() {
            return document.documentElement.scrollHeight;
        },
        get clientHeight() {
            return document.documentElement.clientHeight;
        },
        setScrollTop(value) {
            window.scrollTo(0, value);
        },
        scrollTo(options) {
            window.scrollTo(options);
        },
        scrollBy(dx, dy) {
            window.scrollBy(dx, dy);
        },
        onScroll(fn) {
            window.addEventListener('scroll', fn, { passive: true });
            return () => window.removeEventListener('scroll', fn);
        },
    };
    return windowHost;
}

export type ScrollHostContext = {
    layoutStyle: LayoutStyle;
    isJunk: boolean;
};

export function resolveColumnScrollHost(
    column: { scrollElement?: HTMLElement | null } | undefined,
    ctx: ScrollHostContext,
): ScrollHost {
    if (ctx.isJunk) {
        const el = (column?.scrollElement?.closest('.modal-page-content') as HTMLElement | null)
            ?? column?.scrollElement
            ?? (document.querySelector('.modal-page-content') as HTMLElement | null);
        return el ? elementScrollHost(el) : windowScrollHost();
    }
    if (ctx.layoutStyle === 'deck') {
        return column?.scrollElement ? elementScrollHost(column.scrollElement) : windowScrollHost();
    }
    return windowScrollHost();
}
