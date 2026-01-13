<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import Infinite from "$lib/components/utils/Infinite.svelte";

    interface Props {
        data: LayoutData;
    }

    let { data }: Props = $props();

    interface KakuPost {
        uri: string;
        cid: string;
        author: {
            did: string;
            handle: string;
            displayName?: string;
            avatar?: string;
        };
        image: string;
        text?: string;
        tags?: string[];
        aspectRatio: {
            width: number;
            height: number;
        };
        createdAt: string;
        reactionCounts?: {
            suki: number;
            tasukaru: number;
            sugoi: number;
            kawaii: number;
            kami: number;
        };
    }

    let posts = $state<KakuPost[]>([]);
    let cursor = $state<string | undefined>('');
    let isEmpty = $state(false);
    let isError = $state(false);

    const KAKU_API_BASE = 'https://kaku.tokimeki.tech';

    async function handleLoadMore(loaded: () => void, complete: () => void) {
        try {
            const params = new URLSearchParams({
                actor: data.params.handle,
                limit: '25'
            });
            if (cursor) {
                params.set('cursor', cursor);
            }

            const response = await fetch(`${KAKU_API_BASE}/xrpc/tech.tokimeki.kaku.getPostsByAuthor?${params}`);

            if (!response.ok) {
                if (response.status === 404) {
                    isEmpty = true;
                    complete();
                    return;
                }
                throw new Error(`HTTP error: ${response.status}`);
            }

            const result = await response.json();

            if (result.posts.length === 0 && posts.length === 0) {
                isEmpty = true;
            }

            cursor = result.cursor;
            posts = [...posts, ...result.posts];

            if (cursor) {
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            console.error('Failed to fetch drawings:', e);
            isError = true;
            complete();
        }
    }

    function getPostId(uri: string): string {
        const parts = uri.split('/');
        return parts[parts.length - 1];
    }

    function getAuthorDid(uri: string): string {
        const match = uri.match(/at:\/\/(did:[^/]+)/);
        return match ? match[1] : '';
    }
</script>

<svelte:head>
    <title>{data.params.handle} {$_('drawings')} - TOKIMEKI</title>
</svelte:head>

<div class="drawings-wrap">
    {#if isEmpty}
        <div class="drawings-empty">
            <p>{$_('drawings_empty')}</p>
        </div>
    {:else if isError}
        <div class="drawings-error">
            <p>{$_('drawings_error')}</p>
        </div>
    {:else}
        <div class="drawings-grid">
            {#each posts as post (post.uri)}
                <a
                    href="https://kaku.tokimeki.tech/post/{getAuthorDid(post.uri)}/{getPostId(post.uri)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="drawings-item"
                    style="aspect-ratio: {post.aspectRatio.width} / {post.aspectRatio.height}"
                >
                    <img
                        src={post.image}
                        alt={post.text || ''}
                        loading="lazy"
                    />
                </a>
            {/each}
        </div>
    {/if}

    <Infinite oninfinite={handleLoadMore}></Infinite>
</div>

<style lang="postcss">
    .drawings-wrap {
        padding: 16px;
    }

    .drawings-empty,
    .drawings-error {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-color-3);
    }

    .drawings-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 4px;
    }

    .drawings-item {
        position: relative;
        display: block;
        overflow: hidden;
        border-radius: 4px;
        background-color: var(--bg-color-2);

        &:hover {
            opacity: 0.9;
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    @media (max-width: 600px) {
        .drawings-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
</style>
