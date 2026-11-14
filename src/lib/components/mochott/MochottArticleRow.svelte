<script lang="ts">
  import Heart from '@lucide/svelte/icons/heart';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import { formatDate } from '$lib/dateFormat';
  import { mochottArticleUrl, mochottImageUrl, type MochottMinisiteRef } from './mochottUrls';

  interface Article {
    uri: string;
    author: { did: string; handle: string };
    title: string;
    description: string | null;
    coverImage: string | null;
    tags: string[] | null;
    slug: string | null;
    publishedAt: string | null;
    likeCount?: number;
    commentCount?: number;
    minisite?: MochottMinisiteRef | null;
  }

  interface Props {
    article: Article;
  }

  let { article }: Props = $props();

  const cover = $derived(mochottImageUrl(article.coverImage, article.author.did));
  const published = $derived(article.publishedAt ? formatDate(new Date(article.publishedAt), 'yyyy/MM/dd') : '');
  const tags = $derived((article.tags ?? []).slice(0, 2));
</script>

<a class="article-row" href={mochottArticleUrl(article)} target="_blank" rel="noopener noreferrer">
  <div class="article-row__body">
    <h3 class="article-row__title">{article.title}</h3>

    {#if article.description}
      <p class="article-row__description">{article.description}</p>
    {/if}

    <p class="article-row__meta">
      {#if published}
        <time datetime={article.publishedAt}>{published}</time>
      {/if}

      <span class="article-row__count"><Heart size="14"></Heart>{article.likeCount ?? 0}</span>
      <span class="article-row__count"><MessageCircle size="14"></MessageCircle>{article.commentCount ?? 0}</span>

      {#each tags as tag (tag)}
        <span class="article-row__tag">#{tag}</span>
      {/each}
    </p>
  </div>

  {#if cover}
    <img class="article-row__cover" src={cover} alt="" loading="lazy" decoding="async" width="160" height="90">
  {/if}
</a>

<style lang="postcss">
  .article-row {
      display: flex;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-color-2);
      color: var(--text-color-1);

      &:hover {
          background-color: var(--state-hover, var(--bg-color-2));
          text-decoration: none;
      }

      &__body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
      }

      &__title {
          font-size: 15px;
          font-weight: bold;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
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

      &__meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 2px 12px;
          margin-top: 2px;
          font-size: 12px;
          color: var(--text-color-3);
          font-variant-numeric: tabular-nums;
      }

      &__count {
          display: inline-flex;
          align-items: center;
          gap: 3px;
      }

      &__tag {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 12em;
      }

      &__cover {
          flex: none;
          width: 96px;
          height: 54px;
          border-radius: var(--border-radius-3);
          object-fit: cover;
          background-color: var(--bg-color-2);
      }
  }
</style>
