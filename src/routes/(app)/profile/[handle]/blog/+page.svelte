<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import Infinite from "$lib/components/utils/Infinite.svelte";
    import MochottArticleCard from "$lib/components/mochott/MochottArticleCard.svelte";

    interface Props {
        data: LayoutData;
    }

    let { data }: Props = $props();

    let articles = $state<any[]>([]);
    let cursor = $state<string | undefined>('');
    let isEmpty = $state(false);
    let isError = $state(false);

    const MOCHOTT_API_BASE = 'https://mochott.site';

    async function handleLoadMore(loaded: () => void, complete: () => void) {
        try {
            const params = new URLSearchParams({
                author: data.params.handle,
                limit: '25'
            });
            if (cursor) {
                params.set('cursor', cursor);
            }

            const response = await fetch(`${MOCHOTT_API_BASE}/xrpc/site.mochott.article.getAuthorArticles?${params}`);

            if (!response.ok) {
                if (response.status === 404) {
                    isEmpty = true;
                    complete();
                    return;
                }
                throw new Error(`HTTP error: ${response.status}`);
            }

            const result = await response.json();

            if (result.articles.length === 0 && articles.length === 0) {
                isEmpty = true;
            }

            cursor = result.cursor;
            articles = [...articles, ...result.articles];

            if (cursor) {
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            console.error('Failed to fetch blog articles:', e);
            isError = true;
            complete();
        }
    }
</script>

<svelte:head>
    <title>{data.params.handle} {$_('blog')} - TOKIMEKI</title>
</svelte:head>

<div class="blog-wrap">
    {#if isEmpty}
        <div class="blog-empty">
            <p>{$_('blog_empty')}</p>
        </div>
    {:else if isError}
        <div class="blog-error">
            <p>{$_('blog_error')}</p>
        </div>
    {:else}
        <div class="blog-grid">
            {#each articles as article (article.uri)}
                <MochottArticleCard {article} showAuthor={false}></MochottArticleCard>
            {/each}
        </div>
    {/if}

    <Infinite oninfinite={handleLoadMore}></Infinite>
</div>

<style lang="postcss">
    .blog-wrap {
        padding: 16px;
    }

    .blog-empty,
    .blog-error {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-color-3);
    }

    .blog-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
    }

    @media (max-width: 767px) {
        .blog-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
