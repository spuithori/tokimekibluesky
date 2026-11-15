<script lang="ts">
  import { _, getLocale } from 'tokimeki-i18n';
  import { api, apiErrorMessage, type FeedMetric, type FeedStats } from '$lib/feedbuilder/api';
  import { generatorUri } from '$lib/feedbuilder/customFeeds.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';

  interface Props {
    did: string;
    rkey: string;
    name: string;
    onclose: () => void;
  }

  let { did, rkey, name, onclose }: Props = $props();

  const PERIODS = [7, 14, 30] as const;
  let days = $state<number>(7);
  let stats = $state<FeedStats | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(false);

  $effect(() => {
    const uri = generatorUri(did, rkey);
    const n = days;
    loading = true;
    error = null;
    let cancelled = false;
    api
      .feedStats(uri, n)
      .then((s) => {
        if (!cancelled) stats = s;
      })
      .catch((e) => {
        if (!cancelled) error = e instanceof Error ? apiErrorMessage(e) : $_('tfeeds_sortvis_stats_load_failed');
      })
      .finally(() => {
        if (!cancelled) loading = false;
      });
    return () => {
      cancelled = true;
    };
  });

  function sum(m: FeedMetric): number {
    return stats?.days.reduce((a, d) => a + (d.counts[m] ?? 0), 0) ?? 0;
  }

  const fmt = new Intl.NumberFormat(getLocale());

  const tiles = $derived([
    { label: $_('tfeeds_sortvis_stats_viewers'), value: stats?.viewers ?? 0, hint: $_('tfeeds_sortvis_stats_viewers_hint') },
    { label: $_('tfeeds_sortvis_stats_req'), value: sum('req'), hint: $_('tfeeds_sortvis_stats_req_hint') },
    { label: $_('tfeeds_sortvis_stats_seen'), value: sum('seen'), hint: $_('tfeeds_sortvis_stats_seen_hint') },
    { label: $_('tfeeds_sortvis_stats_click'), value: sum('click'), hint: $_('tfeeds_sortvis_stats_click_hint') },
    { label: $_('tfeeds_sortvis_stats_like'), value: sum('like'), hint: $_('tfeeds_sortvis_stats_like_hint') },
    { label: $_('tfeeds_sortvis_stats_repost'), value: sum('repost'), hint: $_('tfeeds_sortvis_stats_repost_hint') },
    { label: $_('tfeeds_sortvis_stats_more'), value: sum('more'), hint: $_('tfeeds_sortvis_stats_more_hint') },
    { label: $_('tfeeds_sortvis_stats_less'), value: sum('less'), hint: $_('tfeeds_sortvis_stats_less_hint') }
  ]);

  const rows = $derived(stats ? [...stats.days].reverse() : []);
</script>

<Modal title={$_('tfeeds_sortvis_stats_title', { name })} {onclose}>
  <div class="feed-stats">
    <div class="feed-stats__periods" role="group" aria-label={$_('tfeeds_sortvis_window')}>
      {#each PERIODS as p (p)}
        <button
          type="button"
          class="feed-stats__period"
          class:is-active={days === p}
          aria-pressed={days === p}
          onclick={() => (days = p)}
        >
          {$_('tfeeds_dur_days', { n: p })}
        </button>
      {/each}
    </div>

    {#if error}
      <p class="feed-stats__error">{error}</p>
    {:else if !stats}
      <p class="feed-stats__muted">{$_('tfeeds_sortvis_loading')}</p>
    {:else}
      <div class="feed-stats__tiles" class:is-loading={loading}>
        {#each tiles as t (t.label)}
          <div class="feed-stats__tile" title={t.hint}>
            <span class="feed-stats__tile-label">{t.label}</span>
            <span class="feed-stats__tile-value">{fmt.format(t.value)}</span>
          </div>
        {/each}
      </div>

      {#if stats.hidden_posts > 0 || stats.hidden_authors > 0}
        <p class="feed-stats__note">
          {$_('tfeeds_sortvis_stats_hidden', { posts: fmt.format(stats.hidden_posts), authors: fmt.format(stats.hidden_authors) })}
        </p>
      {/if}

      <div class="feed-stats__table-wrap">
        <table class="feed-stats__table">
          <thead>
            <tr>
              <th scope="col">{$_('tfeeds_sortvis_stats_date_utc')}</th>
              <th scope="col">{$_('tfeeds_sortvis_stats_viewers')}</th>
              <th scope="col">{$_('tfeeds_sortvis_stats_req')}</th>
              <th scope="col">{$_('tfeeds_sortvis_stats_seen')}</th>
              <th scope="col">{$_('tfeeds_sortvis_stats_click')}</th>
              <th scope="col">{$_('tfeeds_sortvis_stats_like')}</th>
              <th scope="col">{$_('tfeeds_sortvis_stats_more')}</th>
              <th scope="col">{$_('tfeeds_sortvis_stats_less_short')}</th>
            </tr>
          </thead>
          <tbody>
            {#each rows as d (d.date)}
              <tr>
                <th scope="row">{d.date.slice(5).replace('-', '/')}</th>
                <td>{fmt.format(d.viewers)}</td>
                <td>{fmt.format(d.counts.req)}</td>
                <td>{fmt.format(d.counts.seen)}</td>
                <td>{fmt.format(d.counts.click)}</td>
                <td>{fmt.format(d.counts.like)}</td>
                <td>{fmt.format(d.counts.more)}</td>
                <td>{fmt.format(d.counts.less)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <p class="feed-stats__muted">
        {$_('tfeeds_sortvis_stats_footnote')}
      </p>
    {/if}
  </div>
</Modal>

<style lang="postcss">
  .feed-stats {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);

    &__periods {
      display: inline-flex;
      gap: 4px;
      align-self: flex-start;
      padding: 3px;
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-pill);
      background: var(--bg-color-2);
    }

    &__period {
      all: unset;
      padding: 4px 12px;
      border-radius: var(--radius-pill);
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-color-3);
      cursor: pointer;

      &.is-active {
        background: var(--bg-color-1);
        color: var(--text-color-1);
        box-shadow: var(--shadow-1);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
    }

    &__tiles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: var(--space-2);
      transition: opacity var(--duration-fast) var(--ease-out);

      &.is-loading {
        opacity: 0.55;
      }
    }

    &__tile {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-3);
      background: var(--bg-color-2);
    }

    &__tile-label {
      font-size: 0.72rem;
      color: var(--text-color-3);
    }

    &__tile-value {
      font-size: 1.15rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-color-1);
    }

    &__table-wrap {
      overflow-x: auto;
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-3);
    }

    &__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
      font-variant-numeric: tabular-nums;

      th,
      td {
        padding: 6px 10px;
        text-align: right;
        white-space: nowrap;
        border-bottom: 1px solid var(--border-color-2);
      }

      thead th {
        font-weight: 600;
        color: var(--text-color-3);
        background: var(--bg-color-2);
      }

      tbody th {
        text-align: left;
        font-weight: 600;
        color: var(--text-color-2);
      }

      td {
        color: var(--text-color-1);
      }

      tbody tr:last-child > * {
        border-bottom: none;
      }
    }

    &__note {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-color-2);
    }

    &__muted {
      margin: 0;
      font-size: 0.75rem;
      line-height: 1.6;
      color: var(--text-color-3);
    }

    &__error {
      margin: 0;
      color: var(--danger-color);
    }
  }
</style>
