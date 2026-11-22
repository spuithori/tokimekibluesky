<script lang="ts">
  import Heart from '@lucide/svelte/icons/heart';
  import Repeat2 from '@lucide/svelte/icons/repeat-2';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import UserPlus from '@lucide/svelte/icons/user-plus';
  import CornerDownRight from '@lucide/svelte/icons/corner-down-right';
  import Pin from '@lucide/svelte/icons/pin';
  import SearchCheck from '@lucide/svelte/icons/search-check';
  import UserMinus from '@lucide/svelte/icons/user-minus';
  import { _, getLocale } from 'tokimeki-i18n';
  import { toast } from 'svelte-sonner';
  import { feedBuilder, PINNED_MAX } from '$lib/feedbuilder/feedBuilder.svelte';
  import { previewKey, type PreviewFeedItem } from '$lib/feedbuilder/customFeeds.svelte';
  import { relativeTime } from '$lib/feedbuilder/postSummary';
  import { primeProfile } from '$lib/feedbuilder/profileResolver.svelte';
  import type { ProfileViewDetailed } from '$lib/feedbuilder/types';
  import TimelineItem from '../../../routes/(app)/TimelineItem.svelte';
  import ExplainPanel from './ExplainPanel.svelte';

  const preview = $derived(feedBuilder.preview);
  const dataSince = $derived(preview.stats?.dataSince);
  const canRun = $derived(!preview.loading && feedBuilder.canPreview);
  const pinnedSet = $derived(new Set(feedBuilder.draft.pinnedPosts ?? []));
  const nf = new Intl.NumberFormat(getLocale() ?? 'en');

  function run() {
    feedBuilder.runPreview().catch(() => {});
  }

  function more() {
    feedBuilder.loadMorePreview().catch(() => {});
  }

  function formatScore(s: number): string {
    if (Math.abs(s) >= 1000) return nf.format(Math.round(s));
    return s.toPrecision(3);
  }

  function togglePin(uri: string) {
    if (!feedBuilder.togglePin(uri)) toast.error($_('tfeeds_preview_pin_max', { max: PINNED_MAX }));
  }

  function excludeAuthor(f: PreviewFeedItem) {
    const a = f.post.author;
    const name = a.displayName?.trim() || `@${a.handle}`;
    primeProfile(a as ProfileViewDetailed);
    if (!feedBuilder.excludeAuthor(a.did)) {
      toast.message($_('tfeeds_preview_already_excluded', { name }));
      return;
    }
    toast.success($_('tfeeds_preview_excluded', { name }), {
      action: { label: $_('tfeeds_preview_undo'), onClick: () => feedBuilder.unexcludeAuthor(a.did) }
    });
  }

  function reasonText(f: PreviewFeedItem): string {
    const r = f.item.reason;
    if (!r) return '';
    const a = f.reasonActor;
    const name = a ? a.displayName?.trim() || `@${a.handle}` : $_('tfeeds_preview_someone');
    const when = relativeTime(r.at);
    const what = $_(`tfeeds_preview_reason_${r.kind}${r.context ? '' : '_after'}`, { name });
    return when ? $_('tfeeds_preview_reason_when', { what, when }) : what;
  }
</script>

<section class="preview-panel">
  <header class="preview-panel__header">
    <h2 class="preview-panel__title">{$_('tfeeds_preview_title')}</h2>
    {#if feedBuilder.autoPreviewPending}
      <span class="preview-panel__auto" aria-live="polite">{$_('tfeeds_preview_auto')}</span>
    {/if}
    <button type="button" class="preview-panel__run" onclick={run} disabled={!canRun}>
      {preview.loading ? $_('tfeeds_preview_running') : $_('tfeeds_preview_run')}
    </button>
  </header>

  <ExplainPanel />

  {#if preview.stats && !preview.loading}
    <div class="preview-panel__stats" aria-live="polite">
      <span>{$_('tfeeds_preview_count', { n: nf.format(preview.feed.length) })}</span>
      <span>{$_('tfeeds_preview_scanned', { n: nf.format(preview.stats.scanned) })}</span>
      <span>{nf.format(preview.stats.elapsedMs)} ms</span>
      {#if dataSince}
        <span>{$_('tfeeds_preview_data_since', { date: dataSince })}</span>
      {/if}
    </div>
    {#if preview.stats.truncated || preview.stats.notes.length > 0 || preview.missing > 0}
      <ul class="preview-panel__notes">
        {#if preview.stats.truncated && preview.stats.notes.length === 0}
          <li><TriangleAlert size={14} />{$_('tfeeds_preview_truncated')}</li>
        {/if}
        {#each preview.stats.notes as note (note)}
          <li><TriangleAlert size={14} />{note}</li>
        {/each}
        {#if preview.missing > 0}
          <li><TriangleAlert size={14} />{$_('tfeeds_preview_missing', { n: preview.missing })}</li>
        {/if}
      </ul>
    {/if}
  {/if}

  {#if preview.loading}
    <div class="preview-panel__loading" role="status" aria-label={$_('tfeeds_preview_loading')}>
      {#each [0, 1, 2, 3] as i (i)}
        <div class="preview-panel__skeleton" aria-hidden="true"></div>
      {/each}
    </div>
  {:else if preview.error}
    <p class="preview-panel__error">{preview.error}</p>
  {:else if preview.feed.length === 0}
    <p class="preview-panel__empty">
      {#if !preview.ranAt}
        {$_('tfeeds_preview_not_yet')}
      {:else if dataSince}
        {$_('tfeeds_preview_empty_since', { date: dataSince })}
      {:else}
        {$_('tfeeds_preview_empty')}
      {/if}
    </p>
  {:else}
    <ul class="preview-panel__list">
      {#each preview.feed as f, i (previewKey(f))}
        {@const pinned = pinnedSet.has(f.post.uri)}
        <li class="preview-panel__item" style="--n: {Math.min(i, 10)}">
          <div class="preview-panel__tools">
            <span class="preview-panel__rank" aria-hidden="true"></span>
            {#if f.pinned}
              <p class="preview-panel__reason preview-panel__reason--context">
                <Pin size={12} />
                <span>{$_('tfeeds_preview_pinned')}</span>
              </p>
            {:else if f.item.reason}
              <p class="preview-panel__reason" class:preview-panel__reason--context={f.item.reason.context}>
                {#if f.item.reason.kind === 'repost'}
                  <Repeat2 size={12} />
                {:else if f.item.reason.kind === 'like'}
                  <Heart size={12} />
                {:else if f.item.reason.kind === 'follow'}
                  <UserPlus size={12} />
                {:else}
                  <CornerDownRight size={12} />
                {/if}
                <span>{reasonText(f)}</span>
              </p>
            {/if}
            <span class="preview-panel__metrics" title={$_('tfeeds_preview_metrics_title')}>
              <span><Heart size={13} />{nf.format(f.item.likeCount)}</span>
              <span><Repeat2 size={13} />{nf.format(f.item.repostCount)}</span>
              <span><MessageCircle size={13} />{nf.format(f.item.replyCount)}</span>
              {#if f.item.score !== undefined}
                <span class="preview-panel__score">{$_('tfeeds_preview_score', { score: formatScore(f.item.score) })}</span>
              {/if}
            </span>
            <span class="preview-panel__actions">
              <button
                type="button"
                class="preview-panel__pin"
                aria-label={$_('tfeeds_preview_exclude')}
                title={$_('tfeeds_preview_exclude_title')}
                onclick={() => excludeAuthor(f)}
              >
                <UserMinus size={16} />
              </button>
              <button
                type="button"
                class="preview-panel__pin"
                aria-label={$_('tfeeds_preview_explain')}
                title={$_('tfeeds_preview_explain_title')}
                onclick={() => feedBuilder.explainPost(f.post.uri)}
              >
                <SearchCheck size={16} />
              </button>
              <button
                type="button"
                class="preview-panel__pin"
                class:is-pinned={pinned}
                aria-pressed={pinned}
                aria-label={pinned ? $_('tfeeds_preview_unpin') : $_('tfeeds_preview_pin')}
                title={pinned ? $_('tfeeds_preview_unpin') : $_('tfeeds_preview_pin')}
                onclick={() => togglePin(f.post.uri)}
              >
                <Pin size={16} />
              </button>
            </span>
          </div>
          <div class="preview-panel__post">
            <TimelineItem data={{ post: f.post }}>{#snippet children()}{/snippet}</TimelineItem>
          </div>
        </li>
      {/each}
    </ul>
    {#if preview.cursor}
      <button type="button" class="preview-panel__more" onclick={more} disabled={preview.loadingMore}>
        {preview.loadingMore ? $_('tfeeds_preview_loading_more') : $_('tfeeds_preview_more')}
      </button>
    {/if}
  {/if}
</section>

<style lang="postcss">
  .preview-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);

    &__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    &__auto {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-right: auto;
      padding: 2px 10px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--cyan-color);
      background-color: var(--cyan-color-soft);
      border-radius: var(--radius-pill);

      &::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: var(--radius-pill);
        background-color: var(--cyan-color);
        animation: preview-pulse 1.6s ease-in-out infinite;
      }
    }

    &__title {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-color-1);
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }

    &__run,
    &__more {
      all: unset;
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-2);
      background: var(--primary-color);
      color: var(--on-primary);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: background var(--duration-fast) var(--ease-out);

      &:hover:not(:disabled) {
        background: var(--primary-color-hover);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
    }

    &__more {
      align-self: center;
      background: var(--surface-hover);
      color: var(--text-color-1);

      &:hover:not(:disabled) {
        background: var(--surface-active);
      }
    }

    &__stats {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-3);
      font-size: 0.78rem;
      color: var(--text-color-3);
      font-variant-numeric: tabular-nums;
    }

    &__notes {
      list-style: none;
      margin: 0;
      padding: var(--space-2) var(--space-3);
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      border-radius: var(--radius-2);
      background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-color-1));
      font-size: 0.8rem;
      color: var(--text-color-2);

      li {
        display: flex;
        gap: var(--space-2);
        align-items: flex-start;
        line-height: 1.5;

        :global(svg) {
          flex-shrink: 0;
          margin-top: 3px;
          color: var(--accent-color);
        }
      }
    }

    &__loading {
      display: flex;
      flex-direction: column;
      border-top: var(--line-strong);
    }

    &__skeleton {
      height: 72px;
      border-bottom: 1px solid var(--hairline);
      background: linear-gradient(90deg, var(--bg-color-3) 0px, var(--bg-color-2) 80px, var(--bg-color-3) 160px);
      background-size: 400px 100%;
      animation: sheen 1.6s linear infinite;
    }

    &__error {
      margin: 0;
      padding: var(--space-2) var(--space-3);
      background: color-mix(in srgb, var(--danger-color) 10%, var(--bg-color-1));
      color: var(--danger-color);
      border-radius: var(--radius-2);
      font-size: 0.85rem;
    }

    &__empty {
      margin: 0;
      color: var(--text-color-3);
      font-size: 0.85rem;
      padding: var(--space-4) 0;
      text-align: center;
    }

    &__list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      border-top: var(--line-strong);
      counter-reset: rank;
    }

    &__item {
      border-bottom: 1px solid var(--hairline);
      counter-increment: rank;
      content-visibility: auto;
      contain-intrinsic-size: auto 180px;
      animation: rise-in var(--duration-slow) var(--ease-out) both;
      animation-delay: calc(var(--n, 0) * 40ms);
    }

    &__tools {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-height: 36px;
      padding: var(--space-1) 0 0;
      font-size: 0.75rem;
      color: var(--text-color-3);
    }

    &__rank {
      flex-shrink: 0;
      min-width: 20px;
      font: 400 12px var(--code-font);

      &::before {
        content: counter(rank);
      }
    }

    &__reason {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      min-width: 0;
      margin: 0;

      span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    &__reason--context {
      font-weight: 600;
    }

    &__metrics {
      display: flex;
      flex-shrink: 0;
      gap: var(--space-3);
      font-variant-numeric: tabular-nums;

      span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
    }

    &__score {
      font-family: var(--code-font);
      color: var(--text-color-1);
      font-weight: 600;
    }

    &__actions {
      display: flex;
      flex-shrink: 0;
      gap: var(--space-1);
      margin-left: auto;
    }

    &__pin {
      all: unset;
      display: inline-grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-2);
      color: var(--text-color-3);
      cursor: pointer;

      &:hover,
      &.is-pinned {
        color: var(--primary-color);
        background: var(--surface-hover);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -2px;
      }
    }

    &__post {
      min-width: 0;
    }
  }

  @keyframes preview-pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }

    50% {
      opacity: 0.4;
      transform: scale(0.8);
    }
  }
</style>
