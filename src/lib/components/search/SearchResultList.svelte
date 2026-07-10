<script lang="ts" generics="T">
    import { _ } from 'tokimeki-i18n';
    import { onDestroy, type Snippet } from 'svelte';
    import Infinite from '$lib/components/utils/Infinite.svelte';

    let {
        load,
        key,
        item,
        empty = undefined,
    }: {
        load: (cursor: string | undefined, signal: AbortSignal) => Promise<{ items: T[], cursor?: string }>,
        key: (item: T) => string,
        item: Snippet<[T]>,
        empty?: Snippet,
    } = $props();

    let items = $state<T[]>([]);
    let cursor = $state<string | undefined>(undefined);
    let loadedOnce = $state(false);
    let error = $state(false);

    const controller = new AbortController();

    async function loadMore(loaded: () => void, complete: () => void) {
        try {
            const res = await load(cursor, controller.signal);
            cursor = res?.cursor;
            const seen = new Set(items.map(it => key(it)));
            const fresh = (res?.items ?? []).filter(it => !seen.has(key(it)));
            items = [...items, ...fresh];
            loadedOnce = true;

            if (cursor) {
                loaded();
            } else {
                complete();
            }
        } catch (e: any) {
            if (e?.name === 'AbortError' || controller.signal.aborted) {
                complete();
                return;
            }
            console.error(e);
            error = true;
            loadedOnce = true;
            complete();
        }
    }

    onDestroy(() => controller.abort());
</script>

{#if loadedOnce && error && !items.length}
    <p class="search-result-list__message">{$_('search_error')}</p>
{:else if loadedOnce && !items.length}
    {#if empty}
        {@render empty()}
    {:else}
        <p class="search-result-list__message">{$_('search_no_results')}</p>
    {/if}
{:else}
    {#each items as it (key(it))}
        {@render item(it)}
    {/each}

    <Infinite oninfinite={loadMore}></Infinite>
{/if}

<style lang="postcss">
    .search-result-list__message {
        padding: 40px 16px;
        text-align: center;
        color: var(--text-color-3);
        font-size: 14px;
    }
</style>
