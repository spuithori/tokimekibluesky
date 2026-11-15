<script lang="ts">
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { _ } from 'tokimeki-i18n';
  import Self from './JsonNode.svelte';
  import { asBlobRef, classifyString, explorerPath, formatBytes, parseAtUri } from '$lib/explorer/values';
  import { lexiconPath } from '$lib/explorer/input';
  import { formatDate } from '$lib/dateFormat';
  import type { ValidationIssue } from '$lib/explorer/lexicon';

  let { name = undefined, value, depth = 0, path = '', issues = undefined, blobUrl = undefined }: {
    name?: string | number;
    value: unknown;
    depth?: number;
    path?: string;
    issues?: Map<string, ValidationIssue[]>;
    blobUrl?: (cid: string) => string | undefined;
  } = $props();

  const blob = $derived(asBlobRef(value));
  const isContainer = $derived(value !== null && typeof value === 'object' && !blob);
  const entries = $derived<Array<[string | number, unknown]>>(
    !isContainer ? [] : Array.isArray(value) ? value.map((item, index) => [index, item]) : Object.entries(value as object),
  );
  const kind = $derived(typeof value === 'string' ? classifyString(value, typeof name === 'string' ? name : undefined) : 'text');
  const href = $derived.by(() => {
    if (typeof value !== 'string') return undefined;
    if (kind === 'did') return explorerPath({ repo: value });
    if (kind === 'at-uri') {
      const uri = parseAtUri(value);
      return uri ? explorerPath(uri) : undefined;
    }
    if (kind === 'nsid') return lexiconPath(value.split('#')[0]);
    return undefined;
  });
  const nodeIssues = $derived(issues?.get(path || '.'));
  const blobSrc = $derived(blob ? blobUrl?.(blob.cid) : undefined);

  let toggled = $state<boolean>();
  const open = $derived(toggled ?? (depth < 2 || (entries.length <= 12 && depth < 5)));

  function childPath(key: string | number): string {
    return typeof key === 'number' ? `${path}[${key}]` : path ? `${path}.${key}` : key;
  }
</script>

{#snippet label()}
  {#if name !== undefined}
    <span class="jn__key" class:jn__key--index={typeof name === 'number'} class:jn__key--invalid={nodeIssues}>{name}</span>
  {/if}
{/snippet}

{#snippet problems()}
  {#if nodeIssues}
    {#each nodeIssues as issue (issue.code + (issue.detail ?? ''))}
      <span class="jn__issue">{$_('explorer_issue_' + issue.code.replace(/-/g, '_'), { detail: issue.detail ?? '' })}</span>
    {/each}
  {/if}
{/snippet}

{#if blob}
  <div class="jn jn--blob">
    {@render label()}
    <div class="jn__blob">
      {#if blobSrc && blob.mimeType.startsWith('image/')}
        <a href={blobSrc} target="_blank" rel="noopener noreferrer">
          <img class="jn__media" src={blobSrc} alt="" loading="lazy" decoding="async" />
        </a>
      {:else if blobSrc && blob.mimeType.startsWith('video/')}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video class="jn__media" src={blobSrc} controls preload="none"></video>
      {:else if blobSrc && blob.mimeType.startsWith('audio/')}
        <audio src={blobSrc} controls preload="none"></audio>
      {/if}
      <span class="jn__blob-meta">
        <span class="jn__chip">{blob.mimeType}</span>
        {#if blob.size !== undefined}<span>{formatBytes(blob.size)}</span>{/if}
        {#if blobSrc}
          <a class="jn__value jn__value--link jn__value--mono" href={blobSrc} target="_blank" rel="noopener noreferrer">{blob.cid}</a>
        {:else}
          <span class="jn__value jn__value--mono">{blob.cid}</span>
        {/if}
      </span>
      {@render problems()}
    </div>
  </div>
{:else if isContainer && name === undefined && depth === 0}
  {#each entries as [key, child] (key)}
    <Self name={key} value={child} depth={1} path={childPath(key)} {issues} {blobUrl} />
  {/each}
{:else if isContainer}
  <div class="jn jn--branch">
    <button class="jn__toggle" aria-expanded={open} onclick={() => { toggled = !open; }}>
      <span class="jn__chevron" class:jn__chevron--open={open}><ChevronRight size="14" /></span>
      {@render label()}
      <span class="jn__count">{Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`}</span>
      {#if !open && typeof (value as Record<string, unknown>).$type === 'string'}
        <span class="jn__count">{(value as Record<string, string>).$type}</span>
      {/if}
    </button>
    {@render problems()}
    {#if open}
      <div class="jn__children">
        {#each entries as [key, child] (key)}
          <Self name={key} value={child} depth={depth + 1} path={childPath(key)} {issues} {blobUrl} />
        {/each}
      </div>
    {/if}
  </div>
{:else}
  <div class="jn">
    {@render label()}
    {#if typeof value === 'string'}
      {#if href}
        <a class="jn__value jn__value--link" class:jn__value--mono={kind !== 'nsid'} {href}>{value}</a>
      {:else if kind === 'url'}
        <a class="jn__value jn__value--link" href={value} target="_blank" rel="noopener noreferrer nofollow">{value}</a>
      {:else if kind === 'datetime'}
        <span class="jn__value jn__value--mono"><span class="jn__nowrap">{value}</span><span class="jn__aside">{formatDate(new Date(value), 'yyyy/MM/dd HH:mm:ss')}</span></span>
      {:else if value === ''}
        <span class="jn__value jn__value--null">""</span>
      {:else}
        <span class="jn__value" class:jn__value--mono={kind === 'cid'}>{value}</span>
      {/if}
    {:else if value === null}
      <span class="jn__value jn__value--null">null</span>
    {:else}
      <span class="jn__value jn__value--literal">{String(value)}</span>
    {/if}
    {@render problems()}
  </div>
{/if}

<style lang="postcss">
  .jn {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      column-gap: 10px;
      row-gap: 2px;
      padding: 3px 0;
      font-size: 13px;
      line-height: 1.6;
      min-width: 0;

      &--branch,
      &--blob {
          display: block;
      }

      &__key {
          flex: none;
          font-family: var(--code-font);
          font-size: 12px;
          color: var(--text-color-3);

          &--index {
              opacity: .7;
          }

          &--invalid {
              text-decoration: underline wavy var(--danger-color);
              text-underline-offset: 3px;
          }
      }

      &__value {
          flex: 1 1 10em;
          min-width: 0;
          color: var(--text-color-1);
          white-space: pre-wrap;
          overflow-wrap: anywhere;

          &--mono {
              font-family: var(--code-font);
              font-size: 12px;
          }

          &--link {
              color: var(--link-color, var(--primary-color));

              @media (hover: hover) {
                  &:hover {
                      text-decoration: underline;
                  }
              }
          }

          &--literal {
              font-family: var(--code-font);
              font-size: 12px;
              color: color-mix(in oklab, var(--primary-color) 70%, var(--text-color-1));
          }

          &--null {
              font-family: var(--code-font);
              font-size: 12px;
              color: var(--text-color-3);
          }
      }

      &__nowrap {
          white-space: nowrap;
      }

      &__aside {
          display: inline-block;
          margin-left: 10px;
          color: var(--text-color-3);
          font-family: var(--ui-font);
          white-space: nowrap;
      }

      &__toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-left: -20px;
          padding: 1px 6px 1px 0;
          border-radius: var(--border-radius-2);
          color: var(--text-color-3);
          max-width: 100%;

          @media (hover: hover) {
              &:hover {
                  background-color: var(--state-hover, var(--bg-color-2));
              }
          }
      }

      &__chevron {
          display: grid;
          place-content: center;
          width: 14px;
          transition: transform .12s ease;

          &--open {
              transform: rotate(90deg);
          }
      }

      &__count {
          font-family: var(--code-font);
          font-size: 11px;
          color: var(--text-color-3);
          opacity: .8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
      }

      &__children {
          margin-left: -13px;
          padding-left: 30px;
          border-left: 1px solid var(--border-color-2);
      }

      &__blob {
          display: grid;
          gap: 6px;
          justify-items: start;
          padding: 4px 0 4px 0;
      }

      &__blob-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 4px 10px;
          font-size: 12px;
          color: var(--text-color-3);
          min-width: 0;
      }

      &__chip {
          font-family: var(--code-font);
          font-size: 11px;
          padding: 1px 6px;
          border-radius: var(--radius-round, 999px);
          background-color: var(--bg-color-3);
          color: var(--text-color-1);
      }

      &__media {
          display: block;
          max-width: min(100%, 320px);
          max-height: 240px;
          border-radius: var(--radius-media, 8px);
          background-color: var(--bg-color-3);
      }

      &__issue {
          flex-basis: 100%;
          font-size: 12px;
          color: var(--danger-color);
      }
  }
</style>
