<script lang="ts">
  import type { Snippet, Component } from 'svelte';
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { _ } from 'tokimeki-i18n';
  import type { CardState } from '$lib/feedbuilder/feedBuilder.svelte';
  import { motionMs } from '$lib/feedbuilder/motion';

  interface Props {
    label: string;
    icon?: Component;
    accent?: 'pink' | 'peri' | 'mint' | 'sky' | 'cream';
    state?: CardState;
    summary?: Snippet;
    body: Snippet;
    error?: { message: string; suggestion?: string };
    open?: boolean;
    onToggle?: () => void;
  }

  let { label, state = 'empty', summary, body, error, open = true, onToggle }: Props = $props();

  const uid = $props.id();
</script>

<section
  class="section-card"
  class:section-card--open={open}
  class:section-card--error={state === 'error'}
  aria-labelledby="{uid}-label"
>
  <button
    type="button"
    class="section-card__header"
    aria-expanded={open}
    aria-controls="{uid}-body"
    onclick={onToggle}
  >
    <span class="section-card__step" aria-hidden="true"></span>
    <span class="section-card__label" id="{uid}-label">{label}</span>
    {#if !open && summary}
      <span class="section-card__summary">{@render summary()}</span>
    {/if}
    {#if state === 'error'}
      <span class="section-card__state">{$_('tfeeds_sortvis_needs_fix')}</span>
    {/if}
    <span class="section-card__chevron" class:is-open={open} aria-hidden="true">
      <ChevronDown size={16} strokeWidth={2} />
    </span>
  </button>
  {#if open}
    <div
      class="section-card__body"
      id="{uid}-body"
      transition:slide={{ duration: motionMs(240), easing: cubicOut }}
    >
      <div class="section-card__inner">
        {@render body()}
        {#if error}
          <p class="section-card__error" role="alert">
            <span class="section-card__error-message">{error.message}</span>
            {#if error.suggestion}
              <span class="section-card__error-suggestion">{error.suggestion}</span>
            {/if}
          </p>
        {/if}
      </div>
    </div>
  {/if}
</section>

<style lang="postcss">
  .section-card {
    position: relative;
    counter-increment: stage;
    border-bottom: 1px solid var(--hairline);
    transition: background-color var(--duration-fast) var(--ease-out);

    &--open {
      background: var(--bg-color-1);
    }

    &--error {
      box-shadow: inset 3px 0 0 var(--danger-color);
    }
  }

  .section-card__header {
    all: unset;
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    min-height: 56px;
    padding: 0 var(--space-3);
    cursor: pointer;
    box-sizing: border-box;
    transition: background-color var(--duration-fast) var(--ease-out);

    &:hover { background-color: var(--surface-hover); }
    &:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: -2px;
    }
  }

  .section-card__step::before {
    content: counter(stage, decimal-leading-zero);
    font-family: var(--code-font);
    font-size: 12px;
    color: var(--text-color-3);

    .section-card--open & { color: var(--primary-color); }
  }

  .section-card__label {
    flex-shrink: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-color-1);
  }

  .section-card__summary {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    color: var(--text-color-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .section-card__state {
    margin-left: auto;
    padding: 2px 6px;
    border: 1px solid var(--danger-color);
    font-size: 12px;
    font-weight: 600;
    color: var(--danger-color);
    flex-shrink: 0;
  }

  .section-card__chevron {
    display: inline-flex;
    margin-left: auto;
    color: var(--text-color-2);
    transition: transform var(--duration-slow) var(--ease-out);

    .section-card__state + & { margin-left: 0; }
    &.is-open { transform: rotate(180deg); }
  }

  .section-card__inner {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: 0 var(--space-4) var(--space-5) calc(var(--space-3) + 2.2em);

    @media (max-width: 600px) {
      padding-left: var(--space-3);
    }
  }

  .section-card__error {
    margin: 0;
    padding: var(--space-3);
    background: var(--bg-color-2);
    border: 1px solid var(--danger-color);
    border-left-width: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .section-card__error-message {
    color: var(--danger-color);
    font-size: 13px;
    font-weight: 600;
  }
  .section-card__error-suggestion {
    color: var(--text-color-2);
    font-size: 13px;
    line-height: 1.5;
  }
</style>
