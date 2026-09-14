import { beforeEach, describe, expect, it, vi } from 'vitest';
import { columnsInScope, currentColumn, firstVisiblePost, focusedPost, moveColumn, movePost, postKey, postsIn, recallPost, siblingPost } from './postNav';

function post(id: string, key?: string, hidden = false): string {
    const article = `<article class="timeline__item${hidden ? ' timeline__item--hide' : ''}" tabindex="-1" data-id="${id}"><div class="timeline__column"><p>${id}</p></div></article>`;
    return key ? `<div class="virtual-item" data-virtual-key="${key}">${article}</div>` : article;
}

function column(id: string, posts: string[], extraClass = ''): string {
    return `<div class="deck-row ${extraClass}" data-column="${id}"><div class="deck-heading"></div><div class="deck-row__content">${posts.join('')}</div></div>`;
}

function byId(id: string): HTMLElement {
    return document.querySelector<HTMLElement>(`[data-id="${id}"]`)!;
}

beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    document.body.innerHTML = '';
});

describe('post traversal within a column', () => {
    it('walks visible posts in DOM order and skips hidden ones', () => {
        document.body.innerHTML = `<div class="deck">${column('a', [post('a1', 'k-a1'), post('a2', 'k-a2', true), post('a3', 'k-a3')])}</div>`;
        const a1 = byId('a1');
        expect(postsIn(a1.closest('.deck-row')!).map((el) => el.dataset.id)).toEqual(['a1', 'a3']);
        expect(siblingPost(a1, 1)?.dataset.id).toBe('a3');
        expect(siblingPost(byId('a3'), 1)).toBeNull();
        expect(siblingPost(a1, -1)).toBeNull();
    });

    it('movePost focuses the next post and reports false at the boundary', () => {
        document.body.innerHTML = `<div class="deck">${column('a', [post('a1', 'k-a1'), post('a2', 'k-a2')])}</div>`;
        expect(movePost(1)).toBe(true);
        expect(focusedPost()?.dataset.id).toBe('a1');
        expect(movePost(1)).toBe(true);
        expect(focusedPost()?.dataset.id).toBe('a2');
        expect(movePost(1)).toBe(false);
        expect(focusedPost()?.dataset.id).toBe('a2');
        expect(movePost(-1)).toBe(true);
        expect(focusedPost()?.dataset.id).toBe('a1');
    });

    it('resolves keys from the virtual list wrapper and falls back to an index', () => {
        document.body.innerHTML = `<div class="deck">${column('a', [post('a1', 'at://x|2024#0'), post('a2')])}</div>`;
        expect(postKey(byId('a1'))).toBe('at://x|2024#0');
        expect(postKey(byId('a2'))).toBe('#1');
    });
});

describe('column traversal', () => {
    it('moves across columns, remembers the post per column, and skips empty columns', () => {
        document.body.innerHTML = `<div class="deck">${column('a', [post('a1', 'k-a1'), post('a2', 'k-a2')])}${column('empty', [])}${column('b', [post('b1', 'k-b1'), post('b2', 'k-b2')])}${column('popup', [post('p1', 'k-p1')], 'deck-row--popup')}</div>`;
        expect(columnsInScope().map((el) => el.dataset.column)).toEqual(['a', 'empty', 'b']);

        expect(movePost(1)).toBe(true);
        expect(movePost(1)).toBe(true);
        expect(focusedPost()?.dataset.id).toBe('a2');

        expect(moveColumn(1)).toBe(true);
        expect(focusedPost()?.dataset.id).toBe('b1');
        expect(movePost(1)).toBe(true);
        expect(focusedPost()?.dataset.id).toBe('b2');

        expect(moveColumn(-1)).toBe(true);
        expect(focusedPost()?.dataset.id).toBe('a2');
        expect(moveColumn(1)).toBe(true);
        expect(focusedPost()?.dataset.id).toBe('b2');
        expect(moveColumn(1)).toBe(false);
    });

    it('recalls the remembered post after the element is re-created with the same key', () => {
        document.body.innerHTML = `<div class="deck">${column('a', [post('a1', 'k-a1'), post('a2', 'k-a2')])}</div>`;
        movePost(1);
        movePost(1);
        const col = document.querySelector<HTMLElement>('.deck-row')!;
        const content = col.querySelector('.deck-row__content')!;
        content.innerHTML = `${post('a1', 'k-a1')}${post('a2-new', 'k-a2')}`;
        expect(recallPost(col)?.dataset.id).toBe('a2-new');
        expect(moveColumn(1)).toBe(false);
        expect(currentColumn()).toBe(col);
    });

    it('confines navigation to the open page modal when one is present', () => {
        document.body.innerHTML = `<div class="deck">${column('a', [post('a1', 'k-a1')])}</div><div class="modal-page">${column('j', [post('j1', 'k-j1'), post('j2', 'k-j2')])}</div>`;
        expect(columnsInScope().map((el) => el.dataset.column)).toEqual(['j']);
        expect(movePost(1)).toBe(true);
        expect(focusedPost()?.dataset.id).toBe('j1');
    });

    it('falls back to the first post when no geometry is available', () => {
        document.body.innerHTML = `<div class="deck">${column('a', [post('a1', 'k-a1'), post('a2', 'k-a2')])}</div>`;
        const col = document.querySelector<HTMLElement>('.deck-row')!;
        expect(firstVisiblePost(col)?.dataset.id).toBe('a1');
    });
});
