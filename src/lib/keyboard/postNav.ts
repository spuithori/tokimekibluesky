export const POST_SELECTOR = 'article.timeline__item';
export const COLUMN_SELECTOR = '.deck-row';
const HIDDEN_POST_CLASS = 'timeline__item--hide';
const POPUP_COLUMN_CLASS = 'deck-row--popup';
const SCOPE_SELECTOR = '.modal-page';
const VIRTUAL_ITEM_SELECTOR = '.virtual-item';
const HEADING_SELECTOR = ':scope > .deck-heading';
const PAGE_HEADING_SELECTOR = '.column-heading';

const rememberedPosts = new WeakMap<HTMLElement, string>();
let lastColumn: WeakRef<HTMLElement> | null = null;

function root(doc: Document): ParentNode {
    return doc.querySelector(SCOPE_SELECTOR) ?? doc;
}

export function focusedPost(doc: Document = document): HTMLElement | null {
    const active = doc.activeElement;
    if (!(active instanceof Element)) {
        return null;
    }
    return active.closest<HTMLElement>(POST_SELECTOR);
}

export function columnOf(el: Element): HTMLElement | null {
    return el.closest<HTMLElement>(COLUMN_SELECTOR);
}

export function postsIn(column: Element): HTMLElement[] {
    const posts: HTMLElement[] = [];
    column.querySelectorAll<HTMLElement>(POST_SELECTOR).forEach((post) => {
        if (!post.classList.contains(HIDDEN_POST_CLASS)) {
            posts.push(post);
        }
    });
    return posts;
}

export function columnsInScope(doc: Document = document): HTMLElement[] {
    const columns: HTMLElement[] = [];
    root(doc).querySelectorAll<HTMLElement>(COLUMN_SELECTOR).forEach((column) => {
        if (!column.classList.contains(POPUP_COLUMN_CLASS)) {
            columns.push(column);
        }
    });
    return columns;
}

function inScope(column: HTMLElement, doc: Document): boolean {
    return column.isConnected && root(doc).contains(column);
}

export function postKey(post: HTMLElement): string | null {
    const wrapper = post.closest<HTMLElement>(VIRTUAL_ITEM_SELECTOR);
    const key = wrapper?.dataset.virtualKey;
    if (key) {
        return key;
    }
    const column = columnOf(post);
    if (!column) {
        return null;
    }
    const index = postsIn(column).indexOf(post);
    return index === -1 ? null : `#${index}`;
}

function escapeAttributeValue(value: string): string {
    return value.replace(/["\\]/g, '\\$&');
}

export function recallPost(column: HTMLElement): HTMLElement | null {
    const key = rememberedPosts.get(column);
    if (!key) {
        return null;
    }
    if (key.startsWith('#')) {
        const index = Number(key.slice(1));
        return postsIn(column)[index] ?? null;
    }
    const post = column.querySelector<HTMLElement>(`${VIRTUAL_ITEM_SELECTOR}[data-virtual-key="${escapeAttributeValue(key)}"] ${POST_SELECTOR}`);
    return post && !post.classList.contains(HIDDEN_POST_CLASS) ? post : null;
}

export function rememberPost(post: HTMLElement): void {
    const column = columnOf(post);
    if (!column) {
        return;
    }
    const key = postKey(post);
    if (key) {
        rememberedPosts.set(column, key);
    }
    lastColumn = new WeakRef(column);
}

export function visibleTopOf(column: HTMLElement): number {
    const heading = column.querySelector<HTMLElement>(HEADING_SELECTOR);
    let top = heading && heading.getClientRects().length
        ? heading.getBoundingClientRect().bottom
        : column.getBoundingClientRect().top;
    const pageHeading = column.closest(SCOPE_SELECTOR)?.querySelector<HTMLElement>(PAGE_HEADING_SELECTOR);
    if (pageHeading && pageHeading.getClientRects().length) {
        top = Math.max(top, pageHeading.getBoundingClientRect().bottom);
    }
    return Math.max(top, 0);
}

export function firstVisiblePost(column: HTMLElement): HTMLElement | null {
    const posts = postsIn(column);
    if (!posts.length) {
        return null;
    }
    const top = visibleTopOf(column);
    let measured = false;
    for (const post of posts) {
        const rect = post.getBoundingClientRect();
        if (rect.height > 0) {
            measured = true;
        }
        if (rect.bottom > top + 1) {
            return post;
        }
    }
    return measured ? posts[posts.length - 1] : posts[0];
}

export function focusPost(post: HTMLElement): void {
    post.focus({ preventScroll: true });
    post.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    rememberPost(post);
}

export function siblingPost(post: HTMLElement, direction: 1 | -1): HTMLElement | null {
    const column = columnOf(post);
    if (!column) {
        return null;
    }
    const posts = postsIn(column);
    const index = posts.indexOf(post);
    if (index === -1) {
        return null;
    }
    return posts[index + direction] ?? null;
}

function horizontallyVisible(column: HTMLElement, viewportWidth: number): boolean {
    const rect = column.getBoundingClientRect();
    return rect.width > 0 && rect.right > 0 && rect.left < viewportWidth;
}

export function currentColumn(doc: Document = document): HTMLElement | null {
    const post = focusedPost(doc);
    if (post) {
        return columnOf(post);
    }
    const remembered = lastColumn?.deref();
    if (remembered && inScope(remembered, doc)) {
        return remembered;
    }
    const columns = columnsInScope(doc);
    const viewportWidth = doc.defaultView?.innerWidth ?? Number.POSITIVE_INFINITY;
    return columns.find((column) => horizontallyVisible(column, viewportWidth)) ?? columns[0] ?? null;
}

export function enterColumn(column: HTMLElement): HTMLElement | null {
    const target = recallPost(column) ?? firstVisiblePost(column);
    if (!target) {
        return null;
    }
    focusPost(target);
    return target;
}

export function movePost(direction: 1 | -1, doc: Document = document): boolean {
    const post = focusedPost(doc);
    if (post) {
        const next = siblingPost(post, direction);
        if (!next) {
            return false;
        }
        focusPost(next);
        return true;
    }
    const column = currentColumn(doc);
    if (!column) {
        return false;
    }
    return enterColumn(column) !== null;
}

export function moveColumn(direction: 1 | -1, doc: Document = document): boolean {
    const columns = columnsInScope(doc);
    if (!columns.length) {
        return false;
    }
    const from = currentColumn(doc);
    const start = from ? columns.indexOf(from) : -1;
    if (start === -1 && direction === 1) {
        return enterColumn(columns[0]) !== null;
    }
    for (let i = start + direction; i >= 0 && i < columns.length; i += direction) {
        if (enterColumn(columns[i])) {
            return true;
        }
    }
    return false;
}

export function scrollParentOf(el: HTMLElement): HTMLElement | null {
    const view = el.ownerDocument.defaultView;
    if (!view) {
        return null;
    }
    let node: HTMLElement | null = el.parentElement;
    while (node && node !== el.ownerDocument.body) {
        const overflowY = view.getComputedStyle(node).overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
            return node;
        }
        node = node.parentElement;
    }
    return (el.ownerDocument.scrollingElement as HTMLElement | null) ?? null;
}

export function columnTop(doc: Document = document): boolean {
    const column = currentColumn(doc);
    if (!column) {
        return false;
    }
    const posts = postsIn(column);
    const scroller = scrollParentOf(posts[0] ?? column);
    if (scroller) {
        scroller.scrollTop = 0;
    }
    const view = doc.defaultView;
    const focusFirst = () => {
        const first = postsIn(column)[0];
        if (first) {
            focusPost(first);
        }
    };
    if (view) {
        view.requestAnimationFrame(() => view.requestAnimationFrame(focusFirst));
    } else {
        focusFirst();
    }
    return true;
}

export function blurPost(doc: Document = document): boolean {
    const post = focusedPost(doc);
    if (!post) {
        return false;
    }
    post.blur();
    return true;
}
