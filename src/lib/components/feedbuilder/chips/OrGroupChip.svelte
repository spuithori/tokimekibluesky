<script lang="ts">
  import { tick } from 'svelte';
  import Plus from '@lucide/svelte/icons/plus';
  import X from '@lucide/svelte/icons/x';
  import { _ } from 'tokimeki-i18n';
  import type { Attachment } from 'svelte/attachments';
  import type { CustomFeedPredicate } from '$lib/feedbuilder/types';
  import { isAndGroup, isNegated, leafPred, makeLeaf, type FilterLeaf, type OrItem } from '$lib/feedbuilder/feedBuilder.svelte';
  import PopoverMenu from '$lib/components/feedbuilder/PopoverMenu.svelte';
  import PredicateChip from './PredicateChip.svelte';

  interface Props {
    items: OrItem[];
    presetCategories: {
      id: string;
      label: string;
      presets: { id: string; label: string; description: string; make: () => CustomFeedPredicate }[];
    }[];
    onLeafChange: (childIndex: number, subIndex: number | undefined, next: FilterLeaf) => void;
    onLeafRemove: (childIndex: number, subIndex: number | undefined) => void;
    onAdd: (p: CustomFeedPredicate) => void;
    onAddAnd: (childIndex: number, p: CustomFeedPredicate) => void;
    onRemoveGroup: () => void;
    groupIndex?: number;
    childDraggable?: Attachment<HTMLElement>;
  }

  let {
    items,
    presetCategories,
    onLeafChange,
    onLeafRemove,
    onAdd,
    onAddAnd,
    onRemoveGroup,
    groupIndex,
    childDraggable
  }: Props = $props();

  const noop: Attachment<HTMLElement> = () => {};

  let justAdded = $state<{ child: number; sub?: number } | null>(null);
  function markAdded(child: number, sub?: number) {
    justAdded = { child, sub };
    void tick().then(() => (justAdded = null));
  }
</script>

{#snippet presetMenu(content: Attachment<HTMLElement>, onPick: (p: CustomFeedPredicate) => void)}
  <div {@attach content} class="or-group__menu">
    {#each presetCategories as cat, ci (cat.id)}
      {#if ci > 0}
        <div class="or-group__menu-divider" aria-hidden="true"></div>
      {/if}
      <div class="or-group__menu-heading">{cat.label}</div>
      {#each cat.presets as p (p.id)}
        <button type="button" class="or-group__menu-item" onclick={() => onPick(p.make())}>
          <span class="or-group__menu-label">{p.label}</span>
          <span class="or-group__menu-hint">{p.description}</span>
        </button>
      {/each}
    {/each}
  </div>
{/snippet}

{#snippet leafChip(leaf: FilterLeaf, child: number, sub: number | undefined)}
  <PredicateChip
    predicate={leafPred(leaf)}
    negated={isNegated(leaf)}
    onChange={(next) => onLeafChange(child, sub, makeLeaf(next, isNegated(leaf)))}
    onToggleNegate={() => onLeafChange(child, sub, makeLeaf(leafPred(leaf), !isNegated(leaf)))}
    onRemove={() => onLeafRemove(child, sub)}
    openOnMount={justAdded?.child === child && justAdded?.sub === sub}
  />
{/snippet}

{#snippet andAdder(child: number, nextSub: number)}
  <PopoverMenu placement="bottom-start" gap={4}>
    {#snippet trigger({ ref, toggle, open: popOpen })}
      <button
        type="button"
        {@attach ref}
        class="or-group__and-add"
        class:is-open={popOpen}
        onclick={toggle}
        aria-label={$_('tfeeds_filter_and_add_condition')}
        title={$_('tfeeds_filter_and_add_condition')}
      >
        <Plus size={11} strokeWidth={2.2} />
        <span>{$_('tfeeds_join_and')}</span>
      </button>
    {/snippet}
    {#snippet menu({ content, close })}
      {@render presetMenu(content, (p) => {
        onAddAnd(child, p);
        markAdded(child, nextSub);
        close();
      })}
    {/snippet}
  </PopoverMenu>
{/snippet}

<div class="or-group">
  <div class="or-group__header">
    <span class="or-group__badge">{$_('tfeeds_filter_or_badge')}</span>
    <button
      type="button"
      class="or-group__remove"
      aria-label={$_('tfeeds_filter_or_remove')}
      onclick={onRemoveGroup}
    >
      <X size={13} strokeWidth={2.2} />
    </button>
  </div>

  <div class="or-group__chips">
    {#each items as item, i (i)}
      {#if isAndGroup(item)}
        <span
          class="or-group__and"
          data-dnd-item={childDraggable ? '' : undefined}
          data-dnd-group={childDraggable ? groupIndex : undefined}
          data-dnd-child={childDraggable ? i : undefined}
          data-dnd-and={childDraggable ? i : undefined}
          {@attach childDraggable ?? noop}
        >
          <span class="or-group__and-badge">{$_('tfeeds_filter_and_badge')}</span>
          {#each item.items as leaf, j (j)}
            <span
              class="or-group__item"
              data-dnd-item={childDraggable ? '' : undefined}
              data-dnd-group={childDraggable ? groupIndex : undefined}
              data-dnd-child={childDraggable ? i : undefined}
              data-dnd-sub={childDraggable ? j : undefined}
              {@attach childDraggable ?? noop}
            >
              {@render leafChip(leaf, i, j)}
            </span>
          {/each}
          {@render andAdder(i, item.items.length)}
        </span>
      {:else}
        <span
          class="or-group__item"
          data-dnd-item={childDraggable ? '' : undefined}
          data-dnd-group={childDraggable ? groupIndex : undefined}
          data-dnd-child={childDraggable ? i : undefined}
          {@attach childDraggable ?? noop}
        >
          {@render leafChip(item, i, undefined)}
          {@render andAdder(i, 1)}
        </span>
      {/if}
    {/each}

    <PopoverMenu placement="bottom-start" gap={4}>
      {#snippet trigger({ ref, toggle, open: popOpen })}
        <button
          type="button"
          {@attach ref}
          class="or-group__add"
          class:is-open={popOpen}
          onclick={toggle}
          aria-label={$_('tfeeds_filter_or_add_condition')}
        >
          <Plus size={12} strokeWidth={2.2} />
          <span>{$_('tfeeds_join_or')}</span>
        </button>
      {/snippet}
      {#snippet menu({ content, close })}
        {@render presetMenu(content, (p) => {
          const at = items.length;
          onAdd(p);
          markAdded(at);
          close();
        })}
      {/snippet}
    </PopoverMenu>
  </div>
</div>

<style lang="postcss">
  .or-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid color-mix(in srgb, var(--cyan-color) 22%, var(--border-color-1));
    background-color: color-mix(in srgb, var(--cyan-color) 4%, var(--bg-color-2));
    border-radius: var(--radius-3);

    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }

    &__badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--cyan-color);
    }

    &__remove {
      all: unset;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: var(--radius-pill);
      color: var(--text-color-3);
      cursor: pointer;
      transition:
        background-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out);

      &:hover {
        background-color: color-mix(in srgb, var(--danger-color) 14%, transparent);
        color: var(--danger-color);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
      }
    }

    &__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }

    &__item {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px;
      min-width: 0;
      max-width: 100%;
    }

    &__and {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 6px;
      min-width: 0;
      max-width: 100%;
      padding: 4px 6px 4px 8px;
      border: 1px solid color-mix(in srgb, var(--primary-color) 28%, var(--border-color-1));
      border-radius: var(--radius-3);
      background-color: color-mix(in srgb, var(--primary-color) 4%, var(--bg-color-1));
    }

    &__and-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--primary-color);
    }

    &__and-add {
      all: unset;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
      padding: 3px 6px;
      border-radius: var(--radius-pill);
      color: var(--text-color-3);
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition:
        background-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out);

      &:hover,
      &.is-open {
        background: color-mix(in srgb, var(--primary-color) 10%, transparent);
        color: var(--text-color-1);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 1px;
      }
    }

    &__add {
      all: unset;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border: 1px dashed color-mix(in srgb, var(--cyan-color) 30%, var(--border-color-1));
      border-radius: var(--radius-pill);
      background: transparent;
      color: var(--text-color-2);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition:
        background-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out);

      &:hover {
        border-style: solid;
        border-color: color-mix(in srgb, var(--cyan-color) 50%, var(--border-color-1));
        background: var(--cyan-color-soft);
        color: var(--text-color-1);
      }

      &.is-open {
        border-style: solid;
        border-color: color-mix(in srgb, var(--cyan-color) 55%, var(--border-color-1));
        background: var(--cyan-color-soft);
        color: var(--text-color-1);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
    }

    &__menu {
      background: var(--bg-color-1);
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-3);
      padding: var(--space-1);
      min-width: 16rem;
      max-width: 22rem;
      max-height: 60vh;
      overflow-y: auto;
      box-shadow: var(--shadow-3);
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    &__menu-heading {
      padding: 6px var(--space-3) 2px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-color-3);
    }

    &__menu-divider {
      height: 1px;
      background: var(--hairline-faint);
      margin: var(--space-1) 0;
    }

    &__menu-item {
      all: unset;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--space-2) var(--space-3);
      cursor: pointer;
      border-radius: var(--radius-2);
      transition: background-color var(--duration-fast) var(--ease-out);

      &:hover {
        background: var(--surface-hover);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -2px;
      }
    }

    &__menu-label {
      font-weight: 600;
      font-size: 13px;
      color: var(--text-color-1);
    }

    &__menu-hint {
      font-size: 11px;
      color: var(--text-color-2);
    }
  }
</style>
