import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { settingsStore } from '$lib/settings/settings.svelte';
import { refreshSignal } from '$lib/refreshSignal.svelte';
import { ShortcutManager, isEditableTarget } from './shortcutManager.svelte';

function press(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
}

function article(id: string): string {
    return `<div class="virtual-item" data-virtual-key="${id}"><article class="timeline__item" tabindex="-1" data-id="${id}"><div class="timeline__column"><button class="timeline-reaction__item timeline-reaction__item--like" data-like="${id}"></button></div></article></div>`;
}

let manager: ShortcutManager;

beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    document.body.innerHTML = `<div class="deck"><div class="deck-row">${article('p1')}${article('p2')}</div></div><input id="text"><div contenteditable="true" id="editor"></div>`;
    settingsStore.keyboard.bindings = {};
    manager = new ShortcutManager();
    manager.attach(window);
});

afterEach(() => {
    manager.detach();
    manager.helpOpen = false;
});

describe('dispatch', () => {
    it('installs a single listener and moves focus with the arrow keys', () => {
        const event = press(document.body, { key: 'ArrowDown' });
        expect(event.defaultPrevented).toBe(true);
        expect((document.activeElement as HTMLElement).dataset.id).toBe('p1');
        press(document.activeElement!, { key: 'j' });
        expect((document.activeElement as HTMLElement).dataset.id).toBe('p2');
        const boundary = press(document.activeElement!, { key: 'ArrowDown' });
        expect(boundary.defaultPrevented).toBe(false);
    });

    it('acts on the focused post through its existing buttons', () => {
        const liked: string[] = [];
        document.querySelectorAll<HTMLButtonElement>('[data-like]').forEach((button) => button.addEventListener('click', () => liked.push(button.dataset.like!)));
        press(document.body, { key: 'ArrowDown' });
        press(document.body, { key: 'ArrowDown' });
        press(document.activeElement!, { key: 'l' });
        expect(liked).toEqual(['p2']);
        const idle = press(document.body, { key: 'l' });
        document.activeElement instanceof HTMLElement && document.activeElement.blur();
        expect(idle.defaultPrevented).toBe(true);
    });

    it('ignores key repeat for actions but not for navigation', () => {
        const liked: string[] = [];
        document.querySelectorAll<HTMLButtonElement>('[data-like]').forEach((button) => button.addEventListener('click', () => liked.push(button.dataset.like!)));
        press(document.body, { key: 'ArrowDown' });
        press(document.activeElement!, { key: 'l', repeat: true });
        expect(liked).toEqual([]);
        press(document.activeElement!, { key: 'ArrowDown', repeat: true });
        expect((document.activeElement as HTMLElement).dataset.id).toBe('p2');
    });

    it('stays out of inputs, contenteditable and open dialogs, and never fires while composing', () => {
        const input = document.getElementById('text')!;
        input.focus();
        expect(isEditableTarget(input)).toBe(true);
        expect(press(input, { key: 'j' }).defaultPrevented).toBe(false);
        expect(press(document.getElementById('editor')!, { key: 'j' }).defaultPrevented).toBe(false);
        expect(press(document.body, { key: 'j', isComposing: true }).defaultPrevented).toBe(false);
        document.body.insertAdjacentHTML('beforeend', '<dialog open><button id="in-dialog"></button></dialog>');
        expect(press(document.getElementById('in-dialog')!, { key: 'j' }).defaultPrevented).toBe(false);
        expect(document.activeElement).toBe(input);
    });

    it('lets Escape reach the composer provider even while typing in it', () => {
        const close = vi.fn(() => true);
        const off = manager.provide('publish.close', close);
        const editor = document.getElementById('editor')!;
        expect(press(editor, { key: 'Escape' }).defaultPrevented).toBe(true);
        expect(close).toHaveBeenCalledTimes(1);
        off();
        expect(press(editor, { key: 'Escape' }).defaultPrevented).toBe(false);
    });

    it('falls through the Escape chain: composer, then page, then deselect', () => {
        const page = vi.fn(() => true);
        manager.provide('publish.close', () => false);
        const offPage = manager.provide('page.close', page);
        press(document.body, { key: 'ArrowDown' });
        press(document.activeElement!, { key: 'Escape' });
        expect(page).toHaveBeenCalledTimes(1);
        expect((document.activeElement as HTMLElement).dataset.id).toBe('p1');
        offPage();
        press(document.activeElement!, { key: 'Escape' });
        expect(document.activeElement).toBe(document.body);
    });

    it('leaves Escape to a modal lightbox that is not a dialog element', () => {
        const page = vi.fn(() => true);
        manager.provide('page.close', page);
        document.body.insertAdjacentHTML('beforeend', '<div id="lightbox" role="dialog" aria-modal="true" tabindex="-1"><button id="in-lightbox"></button></div>');
        const root = document.getElementById('lightbox')!;
        root.focus();
        expect(press(root, { key: 'Escape' }).defaultPrevented).toBe(false);
        expect(press(document.getElementById('in-lightbox')!, { key: 'Escape' }).defaultPrevented).toBe(false);
        expect(page).not.toHaveBeenCalled();
        root.remove();
        press(document.body, { key: 'Escape' });
        expect(page).toHaveBeenCalledTimes(1);
    });

    it('suspends every shortcut while a modal dialog is open, even when focus sits on body', () => {
        const page = vi.fn(() => true);
        manager.provide('page.close', page);
        document.body.insertAdjacentHTML('beforeend', '<dialog open id="modal"><button></button></dialog>');
        document.body.focus();
        expect(press(document.body, { key: 'Escape' }).defaultPrevented).toBe(false);
        press(document.body, { key: 'ArrowDown' });
        expect(document.activeElement).toBe(document.body);
        expect(page).not.toHaveBeenCalled();
        document.getElementById('modal')!.remove();
        press(document.body, { key: 'Escape' });
        expect(page).toHaveBeenCalledTimes(1);
    });

    it('routes global commands: refresh bump, help toggle, column jump index', () => {
        const before = refreshSignal.count;
        press(document.body, { key: '.' });
        expect(refreshSignal.count).toBe(before + 1);
        press(document.body, { key: '?', shiftKey: true });
        expect(manager.helpOpen).toBe(true);
        const jump = vi.fn(() => true);
        manager.provide('column.jump', jump);
        press(document.body, { key: '3' });
        expect(jump).toHaveBeenCalledWith(2);
    });

    it('does not fire when a modifier is held', () => {
        const before = refreshSignal.count;
        expect(press(document.body, { key: '.', ctrlKey: true }).defaultPrevented).toBe(false);
        expect(refreshSignal.count).toBe(before);
    });

    it('detaches cleanly', () => {
        manager.detach();
        expect(manager.attached).toBe(false);
        expect(press(document.body, { key: 'ArrowDown' }).defaultPrevented).toBe(false);
        manager.detach();
    });
});

describe('user overrides', () => {
    it('rebinds a command through settings and reports conflicts', () => {
        manager.setKey('post.like', 0, 'f');
        flushSync();
        expect(manager.keysFor('post.like')).toEqual(['f']);
        expect(manager.isOverridden('post.like')).toBe(true);
        expect(manager.conflictFor('r', 'post.like')?.id).toBe('post.repost');
        expect(manager.conflictFor('Escape', 'page.close')).toBeNull();

        const liked: string[] = [];
        document.querySelectorAll<HTMLButtonElement>('[data-like]').forEach((button) => button.addEventListener('click', () => liked.push(button.dataset.like!)));
        press(document.body, { key: 'ArrowDown' });
        expect(press(document.activeElement!, { key: 'l' }).defaultPrevented).toBe(false);
        press(document.activeElement!, { key: 'f' });
        expect(liked).toEqual(['p1']);

        manager.removeKey('post.like', 0);
        flushSync();
        expect(manager.keysFor('post.like')).toEqual([]);
        manager.resetKeys('post.like');
        flushSync();
        expect(manager.keysFor('post.like')).toEqual(['l']);
        expect(manager.isOverridden('post.like')).toBe(false);
    });
});
