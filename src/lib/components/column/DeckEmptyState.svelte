<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import Home from '@lucide/svelte/icons/home';
    import Bell from '@lucide/svelte/icons/bell';
    import Plus from '@lucide/svelte/icons/plus';
    import LayoutGrid from '@lucide/svelte/icons/layout-grid';
    import { agent, isColumnModalOpen } from '$lib/stores';
    import { getColumnState } from '$lib/classes/columnState.svelte';
    import { CatalogSourcesState } from '$lib/components/column/catalog/catalogSources.svelte';
    import { makeColumn, type CatalogFeed } from '$lib/components/column/catalog/columnCatalog';
    import type { Column } from '$lib/types/column';

    const columnState = getColumnState();
    const sources = new CatalogSourcesState($agent);
    sources.load();

    const pinned = $derived(sources.pinnedFeeds.slice(0, 4));

    function add(algorithm: Column['algorithm']) {
        columnState.add(makeColumn($agent.did(), $agent.handle() ?? '', algorithm));
    }

    function addFeed(feed: CatalogFeed) {
        add({ type: 'custom', algorithm: feed.uri, name: feed.name });
    }
</script>

<div class="deck-empty-state">
    <div class="deck-empty-state__glyph" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
    </div>

    <h2 class="deck-empty-state__title">{$_('deck_empty_title')}</h2>
    <p class="deck-empty-state__text">{$_('deck_empty_text')}</p>

    <div class="deck-empty-state__chips">
        <button class="deck-chip" type="button" onclick={() => add({ type: 'default', name: 'HOME' })}>
            <span class="deck-chip__icon"><Home size={16} color="currentColor" strokeWidth={2.25} /></span>
            HOME
        </button>
        <button class="deck-chip" type="button" onclick={() => add({ type: 'notification', name: $_('notifications') })}>
            <span class="deck-chip__icon"><Bell size={16} color="currentColor" strokeWidth={2.25} /></span>
            {$_('notifications')}
        </button>
        {#each pinned as feed (feed.uri)}
            <button class="deck-chip deck-chip--feed" type="button" onclick={() => addFeed(feed)}>
                <span class="deck-chip__icon deck-chip__icon--avatar">
                    {#if feed.avatar}
                        <img src={feed.avatar} alt="" width="20" height="20" loading="lazy" decoding="async">
                    {:else}
                        <LayoutGrid size={14} color="currentColor" />
                    {/if}
                </span>
                {feed.name}
            </button>
        {/each}
    </div>

    <button class="deck-empty-state__all" type="button" onclick={() => { $isColumnModalOpen = true; }}>
        <Plus size={16} color="currentColor" strokeWidth={2.5} />
        {$_('deck_empty_all')}
    </button>
</div>

<style lang="postcss">
    .deck-empty-state {
        --glyph-ease: cubic-bezier(.22, 1, .36, 1);

        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        max-width: 520px;
        padding: 24px;
        color: var(--text-color-1);
    }

    .deck-empty-state__glyph {
        display: flex;
        gap: 6px;
        height: 64px;
        margin-bottom: 28px;

        span {
            width: 30px;
            border-radius: 7px;
            background-color: var(--primary-color);
            opacity: .18;
            animation: deck-glyph-rise .7s var(--glyph-ease) both;

            &:nth-child(1) {
                height: 100%;
            }

            &:nth-child(2) {
                height: 78%;
                opacity: .4;
                animation-delay: .08s;
            }

            &:nth-child(3) {
                height: 90%;
                opacity: .8;
                animation-delay: .16s;
            }
        }
    }

    .deck-empty-state__title {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: .01em;
        line-height: 1.35;
        margin: 0 0 8px;
        text-wrap: balance;
    }

    .deck-empty-state__text {
        font-size: 14px;
        line-height: 1.7;
        color: var(--text-color-3);
        margin: 0 0 24px;
        text-wrap: balance;
    }

    .deck-empty-state__chips {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
        margin-bottom: 20px;
    }

    .deck-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        height: 42px;
        padding: 0 16px 0 10px;
        border-radius: 21px;
        border: 1.5px solid var(--border-color-1);
        background-color: var(--bg-color-1);
        color: var(--text-color-1);
        font-size: 14px;
        font-weight: 700;
        max-width: 100%;
        transition: border-color .15s ease, background-color .15s ease, transform .1s ease;
        animation: deck-chip-in .4s var(--glyph-ease) both;

        &:hover {
            border-color: var(--primary-color);
            background-color: color-mix(in srgb, var(--primary-color) 8%, var(--bg-color-1));
        }

        &:active {
            transform: scale(.97);
        }
    }

    .deck-chip__icon {
        display: grid;
        place-items: center;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background-color: color-mix(in srgb, var(--primary-color) 14%, var(--bg-color-1));
        color: var(--primary-color);
        flex-shrink: 0;
        overflow: hidden;

        &--avatar {
            background-color: var(--bg-color-2);
            color: var(--text-color-3);
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    .deck-empty-state__all {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        font-weight: 700;
        color: var(--primary-color);
        padding: 8px 14px;
        border-radius: 999px;
        transition: background-color .15s ease;

        &:hover {
            background-color: color-mix(in srgb, var(--primary-color) 10%, transparent);
        }
    }

    @keyframes deck-glyph-rise {
        from {
            transform: translateY(12px) scaleY(.6);
            transform-origin: bottom;
            opacity: 0;
        }
    }

    @keyframes deck-chip-in {
        from {
            opacity: 0;
            transform: translateY(6px);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .deck-empty-state__glyph span,
        .deck-chip {
            animation: none;
        }
    }
</style>
