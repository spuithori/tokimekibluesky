<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';
  import CircleHelp from '@lucide/svelte/icons/circle-question-mark';
  import SearchCheck from '@lucide/svelte/icons/search-check';
  import Pin from '@lucide/svelte/icons/pin';
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import { _, getLocale } from 'tokimeki-i18n';
  import { feedBuilder, predicateLabel } from '$lib/feedbuilder/feedBuilder.svelte';
  import { toPostAtUri } from '$lib/feedbuilder/postUri';
  import type { ExplainNode } from '$lib/feedbuilder/api';
  import { sourceMeta } from './sourceMeta';
  import type { CustomFeedPredicate, CustomFeedSource } from '$lib/feedbuilder/types';

  let input = $state('');
  let inputError = $state<string | null>(null);

  const ex = $derived(feedBuilder.explain);
  const res = $derived(ex?.result ?? null);

  async function run() {
    if (!input.trim()) return;
    inputError = null;
    try {
      await feedBuilder.explainPost(await toPostAtUri(input));
    } catch (e) {
      inputError = e instanceof Error ? e.message : $_('tfeeds_main_explain_failed');
    }
  }

  let lastUri: string | null = null;
  let section = $state<HTMLElement | undefined>(undefined);
  $effect(() => {
    const uri = ex?.uri ?? null;
    if (uri && uri !== lastUri) {
      lastUri = uri;
      input = uri;
      section?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });

  function at(path: string): unknown {
    let cur: unknown = ex?.payload;
    for (const part of path.split('.')) {
      const m = part.match(/^([A-Za-z]+)(?:\[(\d+)\])?$/);
      if (!m || cur === null || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[m[1]];
      if (m[2] !== undefined) cur = Array.isArray(cur) ? cur[Number(m[2])] : undefined;
    }
    return cur;
  }

  function label(n: ExplainNode): string {
    switch (n.kind) {
      case 'and':
        return $_('tfeeds_main_ex_and');
      case 'or':
        return $_('tfeeds_main_ex_or');
      case 'not':
        return $_('tfeeds_main_ex_not');
      case 'window':
        return $_('tfeeds_main_ex_window');
      case 'guard':
        return $_('tfeeds_main_ex_guard');
      case 'source': {
        const s = at(n.path) as CustomFeedSource | undefined;
        return $_('tfeeds_main_source_aria', { label: s ? sourceMeta(s).label : '?' });
      }
      case 'pred': {
        const p = at(n.path) as CustomFeedPredicate | undefined;
        try {
          return p ? predicateLabel(p) : n.path;
        } catch {
          return n.path;
        }
      }
    }
  }

  function firstFailure(n: ExplainNode | undefined): ExplainNode | null {
    if (!n || n.matched !== false) return null;
    if (n.kind === 'and' || (n.kind === 'source' && n.children?.length)) {
      for (const c of n.children ?? []) {
        const f = firstFailure(c);
        if (f) return f;
      }
    }
    return n;
  }

  const verdict = $derived.by(() => {
    if (!res) return null;
    if (!res.post.found && !res.pinned) {
      return { tone: 'no', text: $_('tfeeds_main_v_not_stored'), reason: $_('tfeeds_main_v_not_stored_reason') };
    }
    if (res.viewerHidden?.post || res.viewerHidden?.author || res.viewerHidden?.seen) {
      return {
        tone: 'no',
        text: $_('tfeeds_main_v_hidden'),
        reason: res.viewerHidden.post
          ? $_('tfeeds_main_v_hidden_post')
          : res.viewerHidden.author
            ? $_('tfeeds_main_v_hidden_author')
            : $_('tfeeds_main_v_hidden_seen')
      };
    }
    if (res.included === true) {
      const reason = res.pinned
        ? $_('tfeeds_main_v_pinned')
        : res.viewerHidden?.boosted
          ? $_('tfeeds_main_v_boosted')
          : '';
      return { tone: 'yes', text: $_('tfeeds_main_v_included'), reason };
    }
    if (res.included === false) {
      if (res.guard?.matched === false) {
        return { tone: 'no', text: $_('tfeeds_main_v_excluded'), reason: res.guard.detail ?? '' };
      }
      const f = firstFailure(res.source) ?? firstFailure(res.filter) ?? firstFailure(res.window);
      return { tone: 'no', text: $_('tfeeds_main_v_excluded'), reason: f ? $_('tfeeds_main_v_fails', { label: label(f) }) : '' };
    }
    return { tone: 'unknown', text: $_('tfeeds_main_v_unknown'), reason: $_('tfeeds_main_v_unknown_reason') };
  });

  const ATTR: Record<string, string> = {
    get image() { return $_('tfeeds_main_attr_image'); },
    get video() { return $_('tfeeds_tpl_videos_name'); },
    get external() { return $_('tfeeds_main_attr_external'); },
    get link() { return $_('tfeeds_main_attr_link'); },
    get quote() { return $_('tfeeds_main_attr_quote'); },
    get reply() { return $_('tfeeds_p_reply'); },
    get selfLabel() { return $_('tfeeds_main_attr_self_label'); },
    get unknown() { return $_('tfeeds_main_attr_unknown'); },
    gif: 'GIF'
  };
  const nf = new Intl.NumberFormat(getLocale() ?? 'en');
</script>

{#snippet row(n: ExplainNode, depth: number)}
  <li class="explain__row" style:--depth={depth}>
    <span
      class="explain__mark"
      class:is-yes={n.matched === true}
      class:is-no={n.matched === false}
      aria-label={n.matched === true ? $_('tfeeds_main_mark_yes') : n.matched === false ? $_('tfeeds_main_mark_no') : $_('tfeeds_main_mark_unknown')}
    >
      {#if n.matched === true}<Check size={13} strokeWidth={2.6} />{:else if n.matched === false}<X
          size={13}
          strokeWidth={2.6}
        />{:else}<CircleHelp size={13} strokeWidth={2.2} />{/if}
    </span>
    <span class="explain__text">
      <span class="explain__label">{label(n)}</span>
      {#if n.detail}<span class="explain__detail">{n.detail}</span>{/if}
    </span>
  </li>
  {#each n.children ?? [] as c (c.path)}
    {@render row(c, depth + 1)}
  {/each}
{/snippet}

<section class="explain" aria-label={$_('tfeeds_main_explain_title')} bind:this={section}>
  <h3 class="explain__title">
    <SearchCheck size={15} strokeWidth={2} />
    {$_('tfeeds_main_explain_title')}
  </h3>
  <p class="explain__hint">{$_('tfeeds_main_explain_hint')}</p>
  <form
    class="explain__form"
    onsubmit={(e) => {
      e.preventDefault();
      run();
    }}
  >
    <input
      class="explain__input"
      type="text"
      placeholder="https://bsky.app/profile/…/post/…"
      bind:value={input}
      aria-label={$_('tfeeds_main_explain_input')}
    />
    <button type="submit" class="explain__run" disabled={!input.trim() || ex?.loading}>
      {ex?.loading ? $_('tfeeds_main_explain_running') : $_('tfeeds_main_explain_run')}
    </button>
  </form>
  {#if inputError}<p class="explain__error">{inputError}</p>{/if}
  {#if ex?.error}<p class="explain__error">{ex.error}</p>{/if}

  {#if res && verdict}
    <div class="explain__verdict" data-tone={verdict.tone}>
      {#if res.viewerHidden?.post || res.viewerHidden?.author || res.viewerHidden?.seen}<EyeOff size={15} />{:else if res.pinned && res.included}<Pin
          size={15}
        />{/if}
      <span>
        <strong>{verdict.text}</strong>
        {#if verdict.reason}<span class="explain__reason">{verdict.reason}</span>{/if}
      </span>
    </div>

    {#if res.post.found}
      <p class="explain__facts">
        {#if res.post.createdAt}{new Date(res.post.createdAt).toLocaleString()}{$_('tfeeds_sep')}{/if}
        {$_('tfeeds_main_facts_counts', {
          likes: nf.format(res.post.counts?.likes ?? 0),
          reposts: nf.format(res.post.counts?.reposts ?? 0),
          replies: nf.format(res.post.counts?.replies ?? 0)
        })}
        {#if res.post.attrs.length > 0}{$_('tfeeds_sep')}{res.post.attrs.map((a) => ATTR[a] ?? a).join($_('tfeeds_main_attrs_sep'))}{/if}
        {#if res.post.modLabels.length > 0}{$_('tfeeds_sep')}{$_('tfeeds_main_facts_mod_labels', { labels: res.post.modLabels.join(', ') })}{/if}
      </p>
    {/if}

    <ul class="explain__tree">
      {@render row(res.source, 0)}
      {#if res.filter}{@render row(res.filter, 0)}{/if}
      {#if res.window}{@render row(res.window, 0)}{/if}
      {#if res.guard}{@render row(res.guard, 0)}{/if}
    </ul>
  {/if}
</section>

<style lang="postcss">
  .explain {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-4);
    border: 1px solid var(--border-color-2);
    border-radius: var(--radius-4);
    background: var(--bg-color-2);

    &__title {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: var(--text-color-1);
    }

    &__hint {
      margin: 0;
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-color-3);
    }

    &__form {
      display: flex;
      gap: 6px;
    }

    &__input {
      flex: 1;
      min-width: 0;
      padding: 8px var(--space-3);
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-3);
      background: var(--bg-color-1);
      font: inherit;
      font-size: 13px;
      color: var(--text-color-1);

      &:focus {
        outline: 2px solid var(--primary-color);
        outline-offset: -1px;
      }
    }

    &__run {
      all: unset;
      padding: 0 var(--space-3);
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-3);
      background: var(--bg-color-1);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-color-2);
      cursor: pointer;
      white-space: nowrap;

      &:hover:not(:disabled) {
        background: var(--surface-hover);
        color: var(--primary-color);
      }

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
    }

    &__error {
      margin: 0;
      font-size: 12px;
      color: var(--danger-color);
    }

    &__verdict {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: var(--space-3);
      border-radius: var(--radius-3);
      border: 1px solid var(--border-color-2);
      background: var(--bg-color-1);
      font-size: 13px;
      color: var(--text-color-1);

      > :global(svg) {
        flex-shrink: 0;
        margin-top: 2px;
      }

      &[data-tone='yes'] {
        border-color: var(--success-color);
        background: var(--success-color);
      }

      &[data-tone='no'] {
        border-color: color-mix(in srgb, var(--danger-color) 40%, var(--border-color-2));
        background: color-mix(in srgb, var(--danger-color) 7%, var(--bg-color-1));
      }
    }

    &__reason {
      display: block;
      margin-top: 2px;
      color: var(--text-color-2);
    }

    &__facts {
      margin: 0;
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-color-3);
    }

    &__tree {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    &__row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 4px 0 4px calc(var(--depth) * 18px);
      font-size: 13px;
    }

    &__mark {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      margin-top: 1px;
      border-radius: 50%;
      background: var(--bg-color-3);
      color: var(--text-color-3);

      &.is-yes {
        background: var(--success-color);
        color: var(--success-color);
      }

      &.is-no {
        background: color-mix(in srgb, var(--danger-color) 16%, var(--bg-color-1));
        color: var(--danger-color);
      }
    }

    &__text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    &__label {
      color: var(--text-color-1);
      overflow-wrap: anywhere;
    }

    &__detail {
      font-size: 12px;
      color: var(--text-color-3);
      overflow-wrap: anywhere;
    }
  }
</style>
