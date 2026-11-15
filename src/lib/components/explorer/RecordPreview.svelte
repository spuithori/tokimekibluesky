<script lang="ts">
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import { onDestroy, untrack } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import EmbedRecord from '$lib/components/post/EmbedRecord.svelte';
  import { getRepoContext } from '$lib/explorer/explorerState.svelte';
  import { describeRecord, loadPreview, previewTarget, type Preview } from '$lib/explorer/preview';
  import type { RepoRecord } from '$lib/explorer/pds';

  let { collection, record }: { collection: string; record: RepoRecord } = $props();

  const repo = getRepoContext();
  const controller = new AbortController();
  const seed = untrack(() => ({ collection, record }));
  const target = previewTarget(seed.record.uri, seed.collection, seed.record.value);
  const described = describeRecord(seed.record.value);
  const builtin = seed.collection.startsWith('app.bsky.') || seed.collection.startsWith('chat.bsky.');

  let preview = $state.raw<Preview>();
  let loading = $state(!!target && !!repo.xrpc);

  const card = $derived(builtin && (loading || preview) ? undefined : described);

  onDestroy(() => controller.abort());

  if (target && repo.xrpc) {
    loadPreview(repo.xrpc, target, repo.resolver?.get(target.ref), controller.signal).then((result) => {
      preview = result;
      loading = false;
    });
  }
</script>

<div class="record-preview">
  {#if card}
    <div class="record-card">
      {#if card.images.length}
        <div class="record-card__images" class:record-card__images--single={card.images.length === 1}>
          {#each card.images as image (image.cid)}
            <img src={repo.blobUrl(image.cid)} alt="" loading="lazy" decoding="async" />
          {/each}
        </div>
      {/if}
      {#if card.heading}
        <h3 class="record-card__heading">{card.heading}</h3>
      {/if}
      {#if card.text}
        <p class="record-card__text">{card.text}</p>
      {/if}
      {#if card.link}
        <a class="record-card__link" href={card.link} target="_blank" rel="noopener noreferrer nofollow"><ExternalLink size="14" /><span>{card.link}</span></a>
      {/if}
    </div>
  {/if}

  {#if loading}
    <LoadingSpinner padding={24} />
  {:else if preview}
    {#if preview.reference}
      <h3 class="explorer-section-title record-preview__label">{$_('explorer_preview_ref')}</h3>
    {/if}
    {#if preview.kind === 'embed'}
      <div class="record-preview__embed">
        <EmbedRecord record={preview.view} />
      </div>
    {:else}
      <a class="actor-card" href="/profile/{preview.actor.did}">
        {#if preview.actor.avatar}
          <img class="actor-card__avatar" src={preview.actor.avatar} alt="" width="48" height="48" loading="lazy" decoding="async" />
        {:else}
          <span class="actor-card__avatar"></span>
        {/if}
        <span class="actor-card__body">
          <span class="actor-card__name">{preview.actor.displayName || '@' + preview.actor.handle}</span>
          {#if preview.actor.displayName}
            <span class="actor-card__handle">@{preview.actor.handle}</span>
          {/if}
          {#if preview.actor.description}
            <span class="actor-card__description">{preview.actor.description}</span>
          {/if}
        </span>
      </a>
    {/if}
  {:else if !card}
    <p class="explorer-empty">{$_('explorer_preview_unavailable')}</p>
  {/if}
</div>

<style lang="postcss">
  .record-preview {
      display: grid;
      gap: 16px;
      max-width: 560px;

      &__label {
          margin-bottom: -6px;
      }

      &__embed :global {
          .timeline-external {
              margin: 0;
          }

          .timeline-external__icon {
              display: none;
          }
      }
  }

  .record-card {
      display: grid;
      gap: 10px;
      padding: 16px;
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-card, 10px);

      &__images {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 4px;

          &--single {
              grid-template-columns: minmax(0, 1fr);
          }

          img {
              display: block;
              width: 100%;
              max-height: 320px;
              object-fit: cover;
              border-radius: var(--radius-media, 8px);
              background-color: var(--bg-color-3);
          }
      }

      &__heading {
          font-size: 16px;
          line-height: 1.5;
          overflow-wrap: anywhere;
      }

      &__text {
          font-size: 14px;
          line-height: 1.7;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
      }

      &__link {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          font-size: 12px;
          color: var(--link-color, var(--primary-color));

          span {
              min-width: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
          }

          :global(svg) {
              flex: none;
          }
      }
  }

  .actor-card {
      display: flex;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-card, 10px);
      color: var(--text-color-1);

      @media (hover: hover) {
          &:hover {
              background-color: var(--state-hover, var(--bg-color-2));
          }
      }

      &__avatar {
          flex: none;
          width: 48px;
          height: 48px;
          border-radius: var(--avatar-border-radius, 50%);
          background-color: var(--bg-color-3);
          object-fit: cover;
      }

      &__body {
          display: grid;
          gap: 2px;
          min-width: 0;
      }

      &__name {
          font-size: 15px;
          font-weight: 700;
          overflow-wrap: anywhere;
      }

      &__handle {
          font-size: 13px;
          color: var(--text-color-3);
          overflow-wrap: anywhere;
      }

      &__description {
          margin-top: 6px;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 4;
          line-clamp: 4;
          overflow: hidden;
      }
  }
</style>
