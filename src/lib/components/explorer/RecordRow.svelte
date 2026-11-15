<script lang="ts">
  import { summarizeRecord, shortRef } from '$lib/explorer/summary';
  import { tidToDate } from '$lib/explorer/tid';
  import { formatDate } from '$lib/dateFormat';
  import type { RepoRecord } from '$lib/explorer/pds';

  let { record, rkey, href, selected = false, checked = undefined, onopen, oncheck = undefined }: {
    record: RepoRecord;
    rkey: string;
    href: string;
    selected?: boolean;
    checked?: boolean;
    onopen: (event: MouseEvent) => void;
    oncheck?: (event: MouseEvent) => void;
  } = $props();

  const summary = $derived(summarizeRecord(record.value));
  const date = $derived(tidToDate(rkey) ?? (summary.createdAt ? new Date(summary.createdAt) : null));
</script>

<a class="record-row" class:record-row--selected={selected} {href} onclick={checked === undefined ? onopen : oncheck} aria-current={selected ? 'true' : undefined} data-rkey={rkey}>
  {#if checked !== undefined}
    <span class="record-row__check" class:record-row__check--on={checked} aria-hidden="true"></span>
  {/if}
  <span class="record-row__body">
    <span class="record-row__text">
      {#if summary.text}
        {summary.text}
      {:else if summary.ref}
        <span class="record-row__ref">→ {shortRef(summary.ref)}</span>
      {:else}
        <span class="record-row__ref">{rkey}</span>
      {/if}
    </span>
    <span class="record-row__meta">
      <span class="record-row__rkey">{rkey}</span>
      {#if summary.text && summary.ref}
        <span class="record-row__ref">→ {shortRef(summary.ref)}</span>
      {/if}
      {#if date}
        <time class="record-row__time" datetime={date.toISOString()}>{formatDate(date, 'yyyy/MM/dd HH:mm')}</time>
      {/if}
    </span>
  </span>
</a>

<style lang="postcss">
  .record-row {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 56px;
      padding: 0 14px;
      border-bottom: 1px solid var(--border-color-2);
      color: var(--text-color-1);
      text-decoration: none;
      contain: strict;

      @media (hover: hover) {
          &:hover {
              background-color: var(--state-hover, var(--bg-color-2));
              text-decoration: none;
          }
      }

      &--selected {
          background-color: var(--state-selected, var(--bg-color-3));
          box-shadow: inset 3px 0 0 var(--primary-color);
      }

      &__body {
          flex: 1;
          min-width: 0;
          display: grid;
          gap: 2px;
      }

      &__text {
          font-size: 13px;
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
      }

      &__meta {
          display: flex;
          gap: 10px;
          font-size: 11px;
          line-height: 1.4;
          color: var(--text-color-3);
          white-space: nowrap;
          overflow: hidden;
      }

      &__rkey {
          font-family: var(--code-font);
          flex: 0 1 auto;
          overflow: hidden;
          text-overflow: ellipsis;
      }

      &__ref {
          font-family: var(--code-font);
          color: var(--text-color-3);
          flex: 0 1 auto;
          overflow: hidden;
          text-overflow: ellipsis;
      }

      &__time {
          margin-left: auto;
          flex: none;
      }

      &__check {
          flex: none;
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 2px solid var(--border-color-1);

          &--on {
              border-color: var(--primary-color);
              background: var(--primary-color) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center / 12px no-repeat;
          }
      }
  }
</style>
