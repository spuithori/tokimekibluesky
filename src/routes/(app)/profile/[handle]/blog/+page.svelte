<script lang="ts">
    import { MOCHOTT_ORIGIN } from "$lib/components/mochott/mochottConst";
    import { untrack } from 'svelte';
    import { _ } from 'tokimeki-i18n';
    import type { LayoutData } from '../$types';
    import SquareArrowOutUpRight from '@lucide/svelte/icons/square-arrow-out-up-right';
    import Infinite from "$lib/components/utils/Infinite.svelte";
    import MochottArticleRow from "$lib/components/mochott/MochottArticleRow.svelte";
    import { mochottImageUrl, mochottMinisiteUrl } from "$lib/components/mochott/mochottUrls";

    interface Props {
        data: LayoutData;
    }

    let { data }: Props = $props();

    let articles = $state.raw<any[]>([]);
    let cursor: string | undefined = '';
    let isEmpty = $state(false);
    let isError = $state(false);
    let publication = $state.raw<any>();
    let minisites = $state.raw<any[]>([]);

    const author = untrack(() => data.params.handle);
    const isDid = author.startsWith('did:');
    const publicationHandle = $derived(publication?.author?.handle ?? author);
    const icon = $derived(publication ? mochottImageUrl(publication.icon, publication.author?.did ?? '') : null);

    async function getJson(path: string) {
        const response = await fetch(`${MOCHOTT_ORIGIN}/xrpc/${path}`);
        if (!response.ok) {
            await response.body?.cancel().catch(() => {});
            return null;
        }
        return response.json();
    }

    getJson(`site.mochott.publication.getPublication?${isDid ? 'did' : 'handle'}=${encodeURIComponent(author)}`)
        .then((result) => { publication = result?.publication; })
        .catch((e) => { console.error(e); });
    getJson(`site.mochott.minisite.getMinisites?author=${encodeURIComponent(author)}`)
        .then((result) => { minisites = Array.isArray(result?.minisites) ? result.minisites : []; })
        .catch((e) => { console.error(e); });

    async function handleLoadMore(loaded: () => void, complete: () => void) {
        try {
            const params = new URLSearchParams({ author, limit: '25' });
            if (cursor) {
                params.set('cursor', cursor);
            }

            const response = await fetch(`${MOCHOTT_ORIGIN}/xrpc/site.mochott.article.getAuthorArticles?${params}`);

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

<div class="blog">
    {#if publication}
        <header class="blog-publication">
            {#if icon}
                <img class="blog-publication__icon" src={icon} alt="" width="48" height="48">
            {/if}

            <div class="blog-publication__body">
                <h2 class="blog-publication__name">{publication.name}</h2>

                {#if publication.description}
                    <p class="blog-publication__description">{publication.description}</p>
                {/if}

                <a class="blog-publication__link" href={publication.url || `${MOCHOTT_ORIGIN}/${publicationHandle}`} target="_blank" rel="noopener noreferrer">
                    {$_('blog_open_in_mochott')}
                    <SquareArrowOutUpRight size="14"></SquareArrowOutUpRight>
                </a>
            </div>
        </header>
    {/if}

    {#if minisites.length}
        <ul class="blog-minisites">
            {#each minisites as minisite (minisite.uri)}
                <li>
                    <a class="blog-minisite" href={mochottMinisiteUrl(publicationHandle, minisite)} target="_blank" rel="noopener noreferrer">
                        <span class="blog-minisite__name">{minisite.name}</span>

                        {#if minisite.description}
                            <span class="blog-minisite__description">{minisite.description}</span>
                        {/if}
                    </a>
                </li>
            {/each}
        </ul>
    {/if}

    {#if isEmpty}
        <div class="blog-message">
            <p>{$_('blog_empty')}</p>
        </div>
    {:else if isError}
        <div class="blog-message">
            <p>{$_('blog_error')}</p>
        </div>
    {:else}
        <div class="blog-list">
            {#each articles as article (article.uri)}
                <MochottArticleRow {article}></MochottArticleRow>
            {/each}
        </div>
    {/if}

    <Infinite oninfinite={handleLoadMore}></Infinite>
</div>

<style lang="postcss">
    .blog-publication {
        display: flex;
        gap: 12px;
        padding: 16px;
        border-bottom: 1px solid var(--border-color-2);

        &__icon {
            flex: none;
            width: 48px;
            height: 48px;
            border-radius: var(--border-radius-4);
            object-fit: cover;
        }

        &__body {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        &__name {
            font-size: 17px;
            font-weight: 900;
            line-height: 1.4;
            overflow-wrap: anywhere;
        }

        &__description {
            font-size: 13px;
            line-height: 1.6;
            color: var(--text-color-2);
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            overflow-wrap: anywhere;
        }

        &__link {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            width: fit-content;
            font-size: 13px;
            color: var(--text-color-3);

            &:hover {
                text-decoration: underline;
            }
        }
    }

    .blog-minisites {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        list-style: none;
        overflow-x: auto;
        border-bottom: 1px solid var(--border-color-2);
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    .blog-minisite {
        display: flex;
        flex-direction: column;
        gap: 2px;
        width: 200px;
        padding: 8px 12px;
        border-radius: var(--radius-card, 10px);
        background-color: var(--bg-color-2);
        color: var(--text-color-1);

        &:hover {
            background-color: var(--state-hover, var(--border-color-1));
            text-decoration: none;
        }

        &__name {
            font-size: 14px;
            font-weight: bold;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        &__description {
            font-size: 12px;
            color: var(--text-color-3);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }

    .blog-message {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-color-3);
    }
</style>
