<script lang="ts">
  import Pause from '@lucide/svelte/icons/pause';
  import Play from '@lucide/svelte/icons/play';
  import { onDestroy } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import JsonNode from './JsonNode.svelte';
  import { connectJetstream, type JetstreamEvent } from '$lib/explorer/jetstream';
  import { explorerPath } from '$lib/explorer/values';
  import { summarizeRecord } from '$lib/explorer/summary';
  import { formatDate } from '$lib/dateFormat';

  const MAX_EVENTS = 200;

  let { dids = [], collections = [], showDid = true }: { dids?: string[]; collections?: string[]; showDid?: boolean } = $props();

  interface Row {
    id: number;
    event: JetstreamEvent;
  }

  let events = $state.raw<Row[]>([]);
  let connection = $state<'connecting' | 'open' | 'closed' | 'error'>('closed');
  let running = $state(false);
  let total = $state(0);
  let expanded = $state<number>();
  let disconnect: (() => void) | undefined;
  let buffer: Row[] = [];
  let frame = 0;
  let sequence = 0;

  function flush() {
    frame = 0;
    if (!buffer.length) return;
    total += buffer.length;
    events = [...buffer.reverse(), ...events].slice(0, MAX_EVENTS);
    buffer = [];
  }

  function start() {
    stop();
    running = true;
    disconnect = connectJetstream({
      dids,
      collections,
      onEvent: (event) => {
        buffer.push({ id: ++sequence, event });
        frame ||= requestAnimationFrame(flush);
      },
      onState: (state) => {
        connection = state;
        if (state === 'closed' || state === 'error') running = false;
      },
    });
  }

  function stop() {
    disconnect?.();
    disconnect = undefined;
    running = false;
    connection = 'closed';
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    buffer = [];
  }

  onDestroy(stop);
  start();
</script>

<div class="live">
  <div class="live__head">
    <button class="explorer-chip" onclick={() => (running ? stop() : start())}>
      {#if running}<Pause size="14" />{$_('explorer_live_pause')}{:else}<Play size="14" />{$_('explorer_live_resume')}{/if}
    </button>
    <span class="live__state" class:live__state--open={connection === 'open'}>{$_('explorer_live_' + connection)}</span>
    <span class="live__total">{$_('explorer_live_total', { count: total.toLocaleString() })}</span>
  </div>

  {#if !events.length}
    <p class="explorer-empty">{$_('explorer_live_waiting')}</p>
  {/if}

  <ul class="live__list">
    {#each events as { id, event } (id)}
      {@const commit = event.commit}
      <li class="live__item">
        <button class="live__row" aria-expanded={expanded === id} onclick={() => { expanded = expanded === id ? undefined : id; }}>
          <time class="live__time">{formatDate(new Date(event.time_us / 1000), 'HH:mm:ss')}</time>
          <span class="live__op live__op--{commit?.operation ?? event.kind}">{commit?.operation ?? event.kind}</span>
          <span class="live__main">
            {#if commit}
              <span class="live__collection">{commit.collection}</span>
              {#if commit.record}<span class="live__text">{summarizeRecord(commit.record).text}</span>{/if}
            {:else}
              <span class="live__text">{event.identity?.handle ?? event.account?.status ?? ''}</span>
            {/if}
          </span>
          {#if showDid}<span class="live__did">{event.did}</span>{/if}
        </button>
        {#if expanded === id}
          <div class="live__detail">
            {#if commit && commit.operation !== 'delete'}
              <a class="live__open" href={explorerPath({ repo: event.did, collection: commit.collection, rkey: commit.rkey })}>at://{event.did}/{commit.collection}/{commit.rkey}</a>
            {/if}
            <JsonNode value={commit?.record ?? event.identity ?? event.account ?? event} />
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</div>

<style lang="postcss">
  .live {
      &__head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          font-size: 12px;
          color: var(--text-color-3);
      }

      &__state--open {
          color: color-mix(in oklab, var(--success-color) 70%, var(--text-color-1));
      }

      &__total {
          margin-left: auto;
      }

      &__list {
          list-style: none;
      }

      &__item {
          border-bottom: 1px solid var(--border-color-2);
      }

      &__row {
          width: 100%;
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding: 8px 4px;
          text-align: left;
          font-size: 12px;
          color: var(--text-color-1);

          @media (hover: hover) {
              &:hover {
                  background-color: var(--state-hover, var(--bg-color-2));
              }
          }
      }

      &__time {
          flex: none;
          font-family: var(--code-font);
          color: var(--text-color-3);
      }

      &__op {
          flex: none;
          width: 52px;
          font-family: var(--code-font);
          font-size: 11px;
          color: var(--text-color-3);

          &--create {
              color: color-mix(in oklab, var(--success-color) 70%, var(--text-color-1));
          }

          &--delete {
              color: var(--danger-color);
          }
      }

      &__main {
          flex: 1;
          min-width: 0;
          display: flex;
          gap: 10px;
          overflow: hidden;
          white-space: nowrap;
      }

      &__collection {
          flex: none;
          font-family: var(--code-font);
      }

      &__text {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--text-color-3);
      }

      &__did {
          flex: 0 1 160px;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: var(--code-font);
          font-size: 11px;
          color: var(--text-color-3);

          @container (max-width: 560px) {
              display: none;
          }
      }

      &__detail {
          padding: 4px 4px 14px 24px;
      }

      &__open {
          display: block;
          margin-bottom: 6px;
          font-family: var(--code-font);
          font-size: 12px;
          color: var(--link-color, var(--primary-color));
          overflow-wrap: anywhere;
      }
  }
</style>
