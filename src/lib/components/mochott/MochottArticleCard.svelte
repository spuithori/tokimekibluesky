<script lang="ts">
    import {formatDate} from "$lib/dateFormat";
    import {settings} from "$lib/stores";
    import {intlRelativeTimeFormatState} from "$lib/classes/intlRelativeTimeFormatState.svelte";

    const MOCHOTT_API_BASE = 'https://mochott.site';

    interface Props {
        article: {
            kind?: string;
            uri: string;
            author: {
                did: string;
                handle: string;
                displayName: string | null;
                avatar: string | null;
            };
            title: string;
            description: string | null;
            coverImage: string | null;
            slug: string | null;
            publishedAt: string | null;
            externalUrl?: string;
            serviceName?: string;
        };
        showAuthor?: boolean;
    }

    let { article, showAuthor = true }: Props = $props();

    const publishedDate = article.publishedAt ? new Date(article.publishedAt) : null;
    const timeDistanceToNow = publishedDate ? intlRelativeTimeFormatState.format({ laterDate: publishedDate }) : '';

    function getAvatarUrl(avatar: string | null): string | null {
        if (!avatar) return null;
        const match = avatar.match(/\/api\/image\/(did:[^/]+)\/(.+)$/);
        if (!match) return null;
        return `https://cdn.bsky.app/img/avatar/plain/${match[1]}/${match[2]}@jpeg`;
    }

    function getCoverImageUrl(coverImage: string | null, did: string): string | null {
        if (!coverImage) return null;
        try {
            const parsed = JSON.parse(coverImage);
            const cid = parsed?.ref?.$link;
            if (!cid) return null;
            return `${MOCHOTT_API_BASE}/api/image/${did}/${cid}`;
        } catch {
            return null;
        }
    }

    function getArticleUrl(): string {
        if (article.externalUrl) {
            return article.externalUrl;
        }
        if (article.slug) {
            return `${MOCHOTT_API_BASE}/${article.author.handle}/${article.slug}`;
        }
        const rkey = article.uri.split('/').pop();
        return `${MOCHOTT_API_BASE}/${article.author.handle}/${rkey}`;
    }
</script>

<a
    href={getArticleUrl()}
    target="_blank"
    rel="noopener noreferrer"
    class="mochott-article-card"
>
    {#if getCoverImageUrl(article.coverImage, article.author.did)}
        <div class="mochott-article-card__cover">
            <img loading="lazy" src={getCoverImageUrl(article.coverImage, article.author.did)} alt="">
        </div>
    {/if}
    <div class="mochott-article-card__body">
        {#if showAuthor}
            <div class="mochott-article-card__author">
                {#if getAvatarUrl(article.author.avatar)}
                    <img class="mochott-article-card__avatar" src={getAvatarUrl(article.author.avatar)} alt="" />
                {/if}
                <span class="mochott-article-card__author-name">{article.author.displayName || article.author.handle}</span>
            </div>
        {/if}
        <h3 class="mochott-article-card__title">{article.title}</h3>
        {#if article.description}
            <p class="mochott-article-card__description">{article.description}</p>
        {/if}
        <div class="mochott-article-card__meta">
            {#if publishedDate}
                {#if $settings?.design.absoluteTime}
                    <time>{formatDate(publishedDate, $settings.design?.datetimeFormat || 'yyyy-MM-dd HH:mm')}</time>
                {:else}
                    <time>{timeDistanceToNow}</time>
                {/if}
            {/if}
            {#if article.serviceName}
                <span class="mochott-article-card__service">{article.serviceName}</span>
            {/if}
        </div>
    </div>
</a>

<style lang="postcss">
    .mochott-article-card {
        display: block;
        border-radius: var(--border-radius-3);
        overflow: hidden;
        background-color: var(--bg-color-2);
        text-decoration: none;
        color: inherit;
        transition: opacity 0.2s;

        &:hover {
            opacity: 0.85;
        }
    }

    .mochott-article-card__cover {
        aspect-ratio: 16 / 9;
        overflow: hidden;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    .mochott-article-card__body {
        padding: 10px 12px;
    }

    .mochott-article-card__author {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
    }

    .mochott-article-card__avatar {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        object-fit: cover;
    }

    .mochott-article-card__author-name {
        font-size: 12px;
        color: var(--text-color-3);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .mochott-article-card__title {
        font-size: 14px;
        font-weight: 600;
        line-height: 1.4;
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        color: var(--text-color-1);
    }

    .mochott-article-card__description {
        font-size: 12px;
        line-height: 1.4;
        margin: 4px 0 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        color: var(--text-color-3);
    }

    .mochott-article-card__meta {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 6px;
        font-size: 12px;
        color: var(--text-color-3);
    }

    .mochott-article-card__service {
        color: var(--text-color-3);
        opacity: 0.8;
    }
</style>
