<script lang="ts">
    import '../../timeline.css';
    import VirtualList from '$lib/components/virtual/VirtualList.svelte';
    import ShortcutHelp from '$lib/keyboard/ShortcutHelp.svelte';
    import { shortcutManager } from '$lib/keyboard/shortcutManager.svelte';
    import { refreshSignal } from '$lib/refreshSignal.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';

    interface FakePost {
        id: string;
        height: number;
        hasParent: boolean;
    }

    function makePosts(prefix: string, count: number): FakePost[] {
        const posts: FakePost[] = [];
        for (let i = 0; i < count; i++) {
            posts.push({ id: `${prefix}-${i}`, height: 90 + ((i * 37) % 140), hasParent: i % 3 === 2 });
        }
        return posts;
    }

    const columns = [
        { id: 'a', posts: makePosts('a', 80) },
        { id: 'b', posts: [] as FakePost[] },
        { id: 'c', posts: makePosts('c', 80) },
    ];

    const logs: string[] = [];
    let scrollEls = $state<Record<string, HTMLElement | undefined>>({});
    let openMenus = $state<Record<string, boolean>>({});

    function log(entry: string) {
        logs.push(entry);
    }

    function toggleMenu(id: string) {
        openMenus[id] = !openMenus[id];
    }

    function showModal(node: HTMLDialogElement) {
        node.showModal();
    }

    settingsStore.keyboard.bindings = {};

    $effect(() => shortcutManager.attach());
    $effect(() => shortcutManager.provide('publish.open', () => { log('publish.open'); return true; }));
    $effect(() => shortcutManager.provide('column.jump', (index) => { log(`jump:${index}`); return true; }));

    if (typeof window !== 'undefined') {
        (window as Window & { __keyboardTest?: unknown }).__keyboardTest = {
            ready: true,
            logs,
            focused: () => (document.activeElement as HTMLElement | null)?.dataset?.id ?? null,
            focusedRect: () => document.activeElement?.getBoundingClientRect().toJSON() ?? null,
            columnRect: (id: string) => scrollEls[id]?.getBoundingClientRect().toJSON() ?? null,
            columnScrollTop: (id: string) => scrollEls[id]?.scrollTop ?? null,
            scrollColumn: (id: string, top: number) => { const el = scrollEls[id]; if (el) el.scrollTop = top; },
            helpOpen: () => shortcutManager.helpOpen,
            refreshCount: () => refreshSignal.count,
            openDialogs: () => document.querySelectorAll('dialog[open]').length,
            focusedComposeKeydown: (key: string) => {
                const target = document.activeElement ?? document.body;
                const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, isComposing: true });
                target.dispatchEvent(event);
                return event.defaultPrevented;
            },
        };
    }
</script>

{#snippet reactions(post: FakePost, owner: string)}
    <div class="timeline-reaction">
        <button class="timeline-reaction__item timeline-reaction__item--reply" onclick={() => log(`reply:${owner}`)} aria-label="reply"></button>
        <button class="timeline-reaction__item timeline-reaction__item--repost" onclick={() => log(`repost:${owner}`)} aria-label="repost"></button>
        <button class="timeline-reaction__item timeline-reaction__item--like" onclick={() => log(`like:${owner}`)} aria-label="like"></button>
        <button class="timeline-reaction__item timeline-reaction__item--quote" onclick={() => log(`quote:${owner}`)} aria-label="quote"></button>
        <button class="timeline-reaction__item timeline-reaction__item--bookmark" onclick={() => log(`bookmark:${owner}`)} aria-label="bookmark"></button>
    </div>
{/snippet}

<div class="deck">
    {#each columns as column (column.id)}
        <div class="deck-row" data-column={column.id} bind:this={scrollEls[column.id]}>
            <div class="deck-heading">column {column.id}</div>
            <div class="deck-row__content">
                {#if scrollEls[column.id] && column.posts.length}
                    <div class="timeline">
                        <VirtualList items={column.posts} getKey={(item: FakePost) => item.id} scrollContainer={scrollEls[column.id]} topMargin={0} bufferPx={600}>
                            {#snippet children(post: FakePost)}
                                <article class="timeline__item" tabindex="-1" data-id={post.id} style:min-height="{post.height}px" onclick={(e) => { if (!(e.target as Element).closest('button, a, dialog')) log(`open:${post.id}`); }}>
                                    {#if post.hasParent}
                                        <div class="timeline__column timeline__column--reply">
                                            <p>parent of {post.id}</p>
                                            <a href="/profile/parent-{post.id}" onclick={(e) => { e.preventDefault(); log(`profile:parent-${post.id}`); }}>parent</a>
                                            {@render reactions(post, `parent-${post.id}`)}
                                        </div>
                                    {/if}
                                    <div class="timeline__column">
                                        <div class="timeline__image">
                                            <a href="/profile/{post.id}" onclick={(e) => { e.preventDefault(); log(`profile:${post.id}`); }}>avatar</a>
                                        </div>
                                        <p data-timeline-text>post {post.id}</p>
                                        <button aria-label="Open image." onclick={() => log(`image:${post.id}`)}>img</button>
                                        {@render reactions(post, post.id)}
                                    </div>
                                    <button class="timeline-menu-toggle" aria-label="Open menu." onclick={() => toggleMenu(post.id)}>…</button>
                                    {#if openMenus[post.id]}
                                        <dialog class="timeline-menu" {@attach showModal} onclose={() => { openMenus[post.id] = false; }}>
                                            <ul class="timeline-menu-list">
                                                <li class="timeline-menu-list__item timeline-menu-list__item--translate">
                                                    <button class="timeline-menu-list__button" onclick={() => { log(`translate:${post.id}`); openMenus[post.id] = false; }}>translate</button>
                                                </li>
                                            </ul>
                                        </dialog>
                                    {/if}
                                </article>
                            {/snippet}
                        </VirtualList>
                    </div>
                {:else if !column.posts.length}
                    <p class="empty">no posts</p>
                {/if}
            </div>
        </div>
    {/each}
</div>

<input data-testid="text-input" placeholder="type here">

{#if shortcutManager.helpOpen}
    <ShortcutHelp onclose={() => (shortcutManager.helpOpen = false)}></ShortcutHelp>
{/if}

<style>
    :global(:root) {
        --deck-heading-height: 52px;
        --primary-color: #1d9bf0;
        --bg-color-1: #fff;
        --bg-color-2: #f3f3f3;
        --text-color-1: #111;
        --text-color-3: #777;
        --border-color-1: #ccc;
        --border-color-2: #e5e5e5;
        --timeline-border-width: 1px;
        --timeline-border-color: #e5e5e5;
        --timeline-padding: 16px;
        --border-radius-3: 6px;
        --border-radius-4: 10px;
    }

    .deck {
        display: flex;
        gap: 8px;
        height: 100vh;
        padding: 0 8px;
        box-sizing: border-box;
    }

    .deck-row {
        width: 340px;
        flex-shrink: 0;
        height: 100%;
        overflow-y: scroll;
        position: relative;
        border: 1px solid #ddd;
    }

    .deck-heading {
        position: sticky;
        top: 0;
        height: var(--deck-heading-height);
        background: #fff;
        border-bottom: 1px solid #ddd;
        z-index: 10;
        display: flex;
        align-items: center;
        padding: 0 8px;
    }

    .timeline__item {
        padding: 8px;
        box-sizing: border-box;
    }

    .timeline-reaction {
        display: flex;
        gap: 6px;
    }

    .timeline-reaction__item {
        width: 20px;
        height: 20px;
        border: 1px solid #aaa;
        background: #fafafa;
    }

    .timeline-menu {
        position: fixed;
        inset: auto 16px 16px auto;
        margin: 0;
    }

    input {
        position: fixed;
        right: 16px;
        top: 8px;
    }
</style>
