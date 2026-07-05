import type { Attachment } from 'svelte/attachments';
import type { Placement } from 'svelte-floating-ui/dom';
import { autoUpdate, computePosition, flip, offset, shift, size } from 'svelte-floating-ui/dom';

export interface FloatingPopupOptions {
    anchor: HTMLElement | null | undefined;
    active?: boolean;
    placement: Placement;
    strategy?: 'fixed' | 'absolute';
    offsetMain?: number;
    offsetAlign?: number;
    shiftPadding?: number;
    sizePadding?: number;
    minHeight?: number;
    flipEnabled?: boolean;
}

const FLOATING_STYLE_PROPS = ['position', 'left', 'top', 'max-height'] as const;

export function floatingPopup(getOptions: () => FloatingPopupOptions): Attachment<HTMLElement> {
    return (node) => {
        const options = getOptions();
        const anchor = options.anchor;
        if (!anchor) {
            if (options.active ?? true) {
                for (const prop of FLOATING_STYLE_PROPS) {
                    node.style.removeProperty(prop);
                }
            }
            return;
        }
        const strategy = options.strategy ?? 'fixed';
        const middleware = [
            offset({ mainAxis: options.offsetMain ?? 12, alignmentAxis: options.offsetAlign }),
            ...(options.flipEnabled === false ? [] : [flip()]),
            shift({ padding: options.shiftPadding ?? 8 }),
            size({
                apply({ availableHeight, elements }) {
                    elements.floating.style.maxHeight = `${Math.max(options.minHeight ?? 0, availableHeight - (options.sizePadding ?? 16))}px`;
                },
            }),
        ];
        const update = () => {
            computePosition(anchor, node, { placement: options.placement, strategy, middleware }).then(({ x, y }) => {
                node.style.position = strategy;
                node.style.left = `${x}px`;
                node.style.top = `${y}px`;
            });
        };
        return autoUpdate(anchor, node, update);
    };
}

export interface PopupDismissOptions {
    onclose: () => void;
    ignore?: () => Element | string | null | undefined;
    escape?: boolean;
}

export function popupDismiss(getOptions: () => PopupDismissOptions): Attachment<HTMLElement> {
    return (node) => {
        const handleClick = (event: MouseEvent) => {
            const options = getOptions();
            const target = event.target;
            if (!(target instanceof Node) || node.contains(target)) return;
            const ignore = options.ignore?.();
            const ignoreEl = typeof ignore === 'string' ? document.querySelector(ignore) : ignore;
            if (ignoreEl?.contains(target)) return;
            options.onclose();
        };
        const handleKeydown = (event: KeyboardEvent) => {
            const options = getOptions();
            if (options.escape === false) return;
            if (event.key !== 'Escape' || event.defaultPrevented) return;
            event.preventDefault();
            options.onclose();
        };
        document.addEventListener('click', handleClick, true);
        document.addEventListener('keydown', handleKeydown, true);
        return () => {
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('keydown', handleKeydown, true);
        };
    };
}
