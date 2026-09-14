import { tick } from 'svelte';

const MAIN_COLUMN = ':scope > .timeline__column:not(.timeline__column--reply)';
const MENU_TOGGLE = ':scope > .timeline-menu-toggle';
const MENU_DIALOG = ':scope > dialog.timeline-menu';

export type ReactionKind = 'like' | 'repost' | 'quote' | 'reply' | 'bookmark';

function clickable(el: Element | null): el is HTMLElement {
    return el instanceof HTMLElement && !(el as HTMLButtonElement).disabled;
}

function click(el: Element | null): boolean {
    if (!clickable(el)) {
        return false;
    }
    el.click();
    return true;
}

async function withMenu(post: HTMLElement, pick: (dialog: HTMLElement) => Element | null): Promise<boolean> {
    const toggle = post.querySelector<HTMLElement>(MENU_TOGGLE);
    if (!toggle) {
        return false;
    }
    const wasOpen = post.querySelector<HTMLDialogElement>(MENU_DIALOG) !== null;
    if (!wasOpen) {
        toggle.click();
        await tick();
    }
    const dialog = post.querySelector<HTMLDialogElement>(MENU_DIALOG);
    if (!dialog) {
        return false;
    }
    const target = pick(dialog);
    if (!clickable(target)) {
        if (!wasOpen) {
            dialog.close();
        }
        return false;
    }
    target.click();
    if (dialog.isConnected && dialog.open) {
        dialog.close();
    }
    return true;
}

export async function react(post: HTMLElement, kind: ReactionKind): Promise<boolean> {
    const selector = `.timeline-reaction__item--${kind}`;
    if (click(post.querySelector(`${MAIN_COLUMN} ${selector}`))) {
        return true;
    }
    return withMenu(post, (dialog) => dialog.querySelector(selector));
}

export function openThread(post: HTMLElement): boolean {
    post.click();
    return true;
}

export function openProfile(post: HTMLElement): boolean {
    return click(post.querySelector(`${MAIN_COLUMN} a[href^="/profile/"]`));
}

export function openImages(post: HTMLElement): boolean {
    return click(post.querySelector(`${MAIN_COLUMN} button[aria-label="Open image."]`));
}

export function openMenu(post: HTMLElement): boolean {
    return click(post.querySelector(MENU_TOGGLE));
}

export function translate(post: HTMLElement): Promise<boolean> {
    return withMenu(post, (dialog) => dialog.querySelector('.timeline-menu-list__item--translate button'));
}
