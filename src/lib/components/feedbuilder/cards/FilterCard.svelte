<script lang="ts">
  import Funnel from '@lucide/svelte/icons/funnel';
  import Plus from '@lucide/svelte/icons/plus';
  import GitBranch from '@lucide/svelte/icons/git-branch';
  import { _ } from 'tokimeki-i18n';
  import { CUSTOM_FEED_DEFS, VIEWER_DID } from '$lib/feedbuilder/types';
  import { localTimeZone } from '$lib/feedbuilder/timeOfDay';
  import type { CustomFeedPredicate } from '$lib/feedbuilder/types';
  import SectionCard from '../SectionCard.svelte';
  import PredicateChip from '../chips/PredicateChip.svelte';
  import OrGroupChip from '../chips/OrGroupChip.svelte';
  import PopoverMenu from '$lib/components/feedbuilder/PopoverMenu.svelte';
  import { feedBuilder, isNegated, isOrGroup, leafPred, makeLeaf } from '$lib/feedbuilder/feedBuilder.svelte';
  import { ChipDrag } from '$lib/feedbuilder/chipDrag.svelte';

  interface Props {
    open: boolean;
    onToggle: () => void;
  }
  let { open, onToggle }: Props = $props();

  const cardState = $derived(feedBuilder.cardStates.filter);
  const diag = $derived(feedBuilder.diagnostics.find((d) => d.cardId === 'filter'));
  const predicates = $derived(feedBuilder.draft.predicates);

  interface PredicatePreset {
    id: string;
    label: string;
    description: string;
    make: () => CustomFeedPredicate;
    orWith?: () => CustomFeedPredicate[];
  }

  interface PresetCategory {
    id: string;
    label: string;
    presets: PredicatePreset[];
  }

  const CATEGORIES: PresetCategory[] = [
    {
      id: 'attribute',
      get label() { return $_('tfeeds_filter_cat_attribute'); },
      presets: [
        {
          id: 'hasImage',
          get label() { return $_('tfeeds_filter_has_image'); },
          get description() { return $_('tfeeds_filter_preset_has_image_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateHasImage, value: true })
        },
        {
          id: 'imageClass',
          get label() { return $_('tfeeds_filter_preset_image_class'); },
          get description() { return $_('tfeeds_filter_preset_image_class_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateImageClass, class: 'illustration' })
        },
        {
          id: 'hasReply',
          get label() { return $_('tfeeds_p_reply_neg'); },
          get description() { return $_('tfeeds_filter_preset_has_reply_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateHasReply, value: false })
        },
        {
          id: 'hasQuote',
          get label() { return $_('tfeeds_p_quote'); },
          get description() { return $_('tfeeds_filter_preset_has_quote_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateHasQuote, value: true })
        },
        {
          id: 'hasVideo',
          get label() { return $_('tfeeds_p_video'); },
          get description() { return $_('tfeeds_filter_preset_has_video_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateHasVideo, value: true })
        },
        {
          id: 'hasLink',
          get label() { return $_('tfeeds_p_link'); },
          get description() { return $_('tfeeds_filter_preset_has_link_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateHasLink, value: true })
        },
        {
          id: 'firstPost',
          get label() { return $_('tfeeds_p_first_post'); },
          get description() { return $_('tfeeds_filter_preset_first_post_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateFirstPost, value: true })
        },
        {
          id: 'hasLabel',
          get label() { return $_('tfeeds_easy_c_no_adult_menu'); },
          get description() { return $_('tfeeds_filter_preset_has_label_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateHasLabel, value: false })
        },
        {
          id: 'author',
          get label() { return $_('tfeeds_filter_preset_author'); },
          get description() { return $_('tfeeds_filter_preset_author_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateAuthor, did: '' })
        },
        {
          id: 'inList',
          get label() { return $_('tfeeds_p_in_list'); },
          get description() { return $_('tfeeds_filter_preset_in_list_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateInList, list: '', value: true })
        },
        {
          id: 'notInList',
          get label() { return $_('tfeeds_filter_preset_not_in_list'); },
          get description() { return $_('tfeeds_filter_preset_not_in_list_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateInList, list: '', value: false })
        },
        {
          id: 'isFromFollowing',
          get label() { return $_('tfeeds_easy_src_following'); },
          get description() { return $_('tfeeds_filter_preset_is_from_following_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateIsFromFollowing, value: true })
        },
        {
          id: 'isMutual',
          get label() { return $_('tfeeds_p_mutual'); },
          get description() { return $_('tfeeds_filter_preset_is_mutual_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateIsMutual, value: true })
        }
      ]
    },
    {
      id: 'reply',
      get label() { return $_('tfeeds_filter_cat_reply'); },
      presets: [
        {
          id: 'repliesToFollowingOnly',
          get label() { return $_('tfeeds_filter_preset_replies_to_following_only'); },
          get description() { return $_('tfeeds_filter_preset_replies_to_following_only_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateHasReply, value: false }),
          orWith: () => [{ $type: CUSTOM_FEED_DEFS.predicateReplyToFollowing, value: true }]
        },
        {
          id: 'replyToFollowing',
          get label() { return $_('tfeeds_p_reply_following'); },
          get description() { return $_('tfeeds_filter_preset_reply_to_following_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateReplyToFollowing, value: true })
        },
        {
          id: 'replyToMe',
          get label() { return $_('tfeeds_p_reply_to_me'); },
          get description() { return $_('tfeeds_filter_preset_reply_to_me_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateReplyTo, did: VIEWER_DID })
        },
        {
          id: 'replyTo',
          get label() { return $_('tfeeds_filter_preset_reply_to'); },
          get description() { return $_('tfeeds_filter_preset_reply_to_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateReplyTo, did: '' })
        },
        {
          id: 'quotesMe',
          get label() { return $_('tfeeds_p_quotes_me'); },
          get description() { return $_('tfeeds_filter_preset_quotes_me_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateQuotes, did: VIEWER_DID })
        },
        {
          id: 'quotes',
          get label() { return $_('tfeeds_filter_preset_quotes'); },
          get description() { return $_('tfeeds_filter_preset_quotes_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateQuotes, did: '' })
        },
        {
          id: 'mentionsMe',
          get label() { return $_('tfeeds_p_mentions_me'); },
          get description() { return $_('tfeeds_filter_preset_mentions_me_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateMentions, did: VIEWER_DID })
        }
      ]
    },
    {
      id: 'content',
      get label() { return $_('tfeeds_filter_cat_content'); },
      presets: [
        {
          id: 'keyword',
          get label() { return $_('tfeeds_filter_preset_keyword'); },
          get description() { return $_('tfeeds_filter_preset_keyword_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateKeyword, value: '' })
        },
        {
          id: 'via',
          get label() { return $_('tfeeds_filter_preset_via'); },
          get description() { return $_('tfeeds_filter_preset_via_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateVia, value: 'TOKIMEKI' })
        },
        {
          id: 'regex',
          get label() { return $_('tfeeds_filter_preset_regex'); },
          get description() { return $_('tfeeds_filter_preset_regex_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateRegex, pattern: '' })
        },
        {
          id: 'tag',
          get label() { return $_('tfeeds_filter_preset_tag'); },
          get description() { return $_('tfeeds_filter_preset_tag_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateTag, tag: '' })
        },
        {
          id: 'language',
          get label() { return $_('tfeeds_easy_c_language'); },
          get description() { return $_('tfeeds_filter_preset_language_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateLanguage, codes: [] })
        },
        {
          id: 'mentions',
          get label() { return $_('tfeeds_filter_preset_mentions'); },
          get description() { return $_('tfeeds_filter_preset_mentions_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateMentions, did: '' })
        },
        {
          id: 'domain',
          get label() { return $_('tfeeds_filter_preset_domain'); },
          get description() { return $_('tfeeds_filter_preset_domain_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateDomain, host: '' })
        }
      ]
    },
    {
      id: 'reaction',
      get label() { return $_('tfeeds_filter_cat_reaction'); },
      presets: [
        {
          id: 'minLikes',
          get label() { return $_('tfeeds_filter_preset_min_likes'); },
          get description() { return $_('tfeeds_filter_preset_min_likes_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateMinLikes, threshold: 10 })
        },
        {
          id: 'minReposts',
          get label() { return $_('tfeeds_filter_preset_min_reposts'); },
          get description() { return $_('tfeeds_filter_preset_min_reposts_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateMinReposts, threshold: 5 })
        },
        {
          id: 'minReplies',
          get label() { return $_('tfeeds_filter_preset_min_replies'); },
          get description() { return $_('tfeeds_filter_preset_min_replies_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateMinReplies, threshold: 5 })
        },
        {
          id: 'minQuotes',
          get label() { return $_('tfeeds_filter_preset_min_quotes'); },
          get description() { return $_('tfeeds_filter_preset_min_quotes_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateMinQuotes, threshold: 5 })
        }
      ]
    },
    {
      id: 'feed',
      get label() { return $_('tfeeds_easy_src_feed'); },
      presets: [
        {
          id: 'notInFeed',
          get label() { return $_('tfeeds_filter_preset_not_in_feed'); },
          get description() { return $_('tfeeds_filter_preset_not_in_feed_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateInFeed, feed: '', value: false })
        },
        {
          id: 'inFeed',
          get label() { return $_('tfeeds_filter_preset_in_feed'); },
          get description() { return $_('tfeeds_filter_preset_in_feed_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateInFeed, feed: '', value: true })
        }
      ]
    },
    {
      id: 'spam',
      get label() { return $_('tfeeds_filter_cat_spam'); },
      presets: [
        {
          id: 'authorMaxPosts',
          get label() { return $_('tfeeds_easy_c_no_flood_menu'); },
          get description() { return $_('tfeeds_filter_preset_author_max_posts_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateAuthorMaxPosts, max: 100, withinHours: 24 })
        },
        {
          id: 'noDuplicate',
          get label() { return $_('tfeeds_filter_dup_first_only'); },
          get description() { return $_('tfeeds_filter_preset_no_duplicate_desc'); },
          make: () => ({ $type: CUSTOM_FEED_DEFS.predicateIsDuplicate, value: false })
        }
      ]
    },
    {
      id: 'time',
      get label() { return $_('tfeeds_filter_cat_time'); },
      presets: [
        {
          id: 'since',
          get label() { return $_('tfeeds_filter_preset_since'); },
          get description() { return $_('tfeeds_filter_preset_since_desc'); },
          make: () => ({
            $type: CUSTOM_FEED_DEFS.predicateSince,
            at: new Date().toISOString()
          })
        },
        {
          id: 'timeOfDay',
          get label() { return $_('tfeeds_easy_c_time_menu'); },
          get description() { return $_('tfeeds_filter_preset_time_of_day_desc'); },
          make: () => ({
            $type: CUSTOM_FEED_DEFS.predicateTimeOfDay,
            timezone: localTimeZone(),
            start: '22:00',
            end: '05:00'
          })
        },
        {
          id: 'until',
          get label() { return $_('tfeeds_filter_preset_until'); },
          get description() { return $_('tfeeds_filter_preset_until_desc'); },
          make: () => ({
            $type: CUSTOM_FEED_DEFS.predicateUntil,
            at: new Date().toISOString()
          })
        }
      ]
    }
  ];

  const OR_CATEGORIES: PresetCategory[] = CATEGORIES.map((c) => ({
    id: c.id,
    get label() { return c.label; },
    presets: c.presets.filter((p) => !p.orWith)
  }));

  const drag = new ChipDrag((from, to) => {
    justAdded = null;
    feedBuilder.moveCondition(from, to);
  });

  let justAdded = $state<number | null>(null);

  function addPreset(p: PredicatePreset, close: () => void) {
    if (p.orWith) {
      feedBuilder.addOrGroup(p.make(), ...p.orWith());
      close();
      return;
    }
    justAdded = feedBuilder.draft.predicates.length;
    feedBuilder.addPredicate(p.make());
    close();
  }

  function addOrGroupWithSeed(p: PredicatePreset, close: () => void) {
    feedBuilder.addOrGroup(p.make());
    close();
  }
</script>

<SectionCard
  label={$_('tfeeds_filter_card_label')}
  icon={Funnel}
  accent="mint"
  state={cardState}
  {open}
  {onToggle}
  error={diag ? { message: diag.message, suggestion: diag.suggestion } : undefined}
>
  {#snippet summary()}
    {@const orCount = predicates.filter(isOrGroup).length}
    {#if predicates.length === 0}
      {$_('tfeeds_filter_summary_none')}
    {:else if orCount === 0}
      {$_('tfeeds_filter_summary_and', { n: predicates.length })}
    {:else}
      {$_('tfeeds_filter_summary_or', { n: predicates.length, or: orCount })}
    {/if}
  {/snippet}
  {#snippet body()}
    {#if predicates.length === 0}
      <p class="filter-card__hint">{$_('tfeeds_filter_empty')}</p>
    {:else}
      <div class="filter-card__chips" class:is-dragging={drag.active} {@attach drag.root}>
        {#each predicates as node, i (i)}
          {#if isOrGroup(node)}
            <div
              class="filter-card__item filter-card__item--or"
              data-dnd-item
              data-dnd-top
              data-dnd-group={i}
              data-dnd-or={i}
              {@attach drag.draggable}
            >
              <OrGroupChip
                items={node.items}
                presetCategories={OR_CATEGORIES}
                onChildChange={(ci, next) => feedBuilder.updateInOrGroup(i, ci, next)}
                onChildRemove={(ci) => feedBuilder.removeFromOrGroup(i, ci)}
                onAdd={(p) => feedBuilder.addToOrGroup(i, p)}
                onRemoveGroup={() => feedBuilder.removePredicate(i)}
                groupIndex={i}
                childDraggable={drag.draggable}
              />
            </div>
          {:else}
            <div class="filter-card__item" data-dnd-item data-dnd-top data-dnd-group={i} {@attach drag.draggable}>
              <PredicateChip
                predicate={leafPred(node)}
                negated={isNegated(node)}
                onChange={(next) => feedBuilder.updatePredicate(i, makeLeaf(next, isNegated(node)))}
                onToggleNegate={() => feedBuilder.updatePredicate(i, makeLeaf(leafPred(node), !isNegated(node)))}
                onRemove={() => feedBuilder.removePredicate(i)}
                openOnMount={i === justAdded}
              />
            </div>
          {/if}
        {/each}
      </div>
      {#if drag.indicator}
        <div
          class="filter-card__drop"
          style:left="{drag.indicator.x}px"
          style:top="{drag.indicator.y}px"
          style:height="{drag.indicator.height}px"
          aria-hidden="true"
        ></div>
      {/if}
      {#if predicates.length > 1}
        <p class="filter-card__drag-hint">{$_('tfeeds_filter_drag_hint')}</p>
      {/if}
    {/if}

    <div class="filter-card__add-row">
      <PopoverMenu placement="bottom-start" gap={4}>
        {#snippet trigger({ ref, toggle, open: popOpen })}
          <button
            type="button"
            {@attach ref}
            class="filter-card__add"
            class:filter-card__add--open={popOpen}
            onclick={toggle}
          >
            <Plus size={14} strokeWidth={2.2} />
            <span>{$_('tfeeds_filter_add')}</span>
          </button>
        {/snippet}
        {#snippet menu({ content, close })}
          <div {@attach content} class="filter-card__menu">
            {#each CATEGORIES as cat, ci (cat.id)}
              {#if ci > 0}
                <div class="filter-card__menu-divider" aria-hidden="true"></div>
              {/if}
              <div class="filter-card__menu-heading">{cat.label}</div>
              {#each cat.presets as p (p.id)}
                <button
                  type="button"
                  class="filter-card__menu-item"
                  onclick={() => addPreset(p, close)}
                >
                  <span class="filter-card__menu-label">{p.label}</span>
                  <span class="filter-card__menu-hint">{p.description}</span>
                </button>
              {/each}
            {/each}
          </div>
        {/snippet}
      </PopoverMenu>

      <PopoverMenu placement="bottom-start" gap={4}>
        {#snippet trigger({ ref, toggle, open: popOpen })}
          <button
            type="button"
            {@attach ref}
            class="filter-card__add filter-card__add--or"
            class:filter-card__add--open={popOpen}
            onclick={toggle}
            aria-label={$_('tfeeds_filter_or_group_add')}
          >
            <GitBranch size={13} strokeWidth={2.2} />
            <span>{$_('tfeeds_filter_or_group')}</span>
          </button>
        {/snippet}
        {#snippet menu({ content, close })}
          <div {@attach content} class="filter-card__menu">
            <div class="filter-card__menu-heading">{$_('tfeeds_filter_or_first')}</div>
            {#each CATEGORIES as cat, ci (cat.id)}
              {#if ci > 0}
                <div class="filter-card__menu-divider" aria-hidden="true"></div>
              {/if}
              <div class="filter-card__menu-heading filter-card__menu-heading--sub">{cat.label}</div>
              {#each cat.presets as p (p.id)}
                <button
                  type="button"
                  class="filter-card__menu-item"
                  onclick={() => addOrGroupWithSeed(p, close)}
                >
                  <span class="filter-card__menu-label">{p.label}</span>
                  <span class="filter-card__menu-hint">{p.description}</span>
                </button>
              {/each}
            {/each}
          </div>
        {/snippet}
      </PopoverMenu>
    </div>
  {/snippet}
</SectionCard>

<style lang="postcss">
  .filter-card {
    &__hint {
      margin: 0;
      color: var(--text-color-2);
      font-size: 0.85rem;
      line-height: 1.55;
    }

    &__chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);

      &.is-dragging {
        user-select: none;
      }
    }

    &__item,
    &__chips :global([data-dnd-item]) {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }

    &__chips :global(dialog) {
      -webkit-touch-callout: default;
      -webkit-user-select: text;
      user-select: text;
    }

    &__item {
      display: inline-flex;
      min-width: 0;
      max-width: 100%;
    }

    &__chips :global([data-dnd-dragging]) {
      opacity: 0.35;
    }

    &__drop {
      position: fixed;
      width: 3px;
      margin-left: -1px;
      border-radius: 2px;
      background: var(--primary-color);
      pointer-events: none;
      z-index: 10001;
    }

    &__drag-hint {
      margin: var(--space-1) 0 0;
      font-size: 11px;
      color: var(--text-color-3);
    }

    &__add-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-self: flex-start;
    }

    &__add {
      all: unset;
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px var(--space-3);
      border: 1px dashed var(--border-color-1);
      border-radius: var(--radius-pill);
      background: transparent;
      color: var(--text-color-2);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition:
        border-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out),
        background var(--duration-fast) var(--ease-out);

      &:hover {
        border-color: color-mix(in srgb, var(--cyan-color) 45%, transparent);
        color: var(--text-color-1);
        background: var(--cyan-color-soft);
      }

      &--open {
        border-style: solid;
        border-color: color-mix(in srgb, var(--cyan-color) 55%, transparent);
        color: var(--text-color-1);
        background: var(--cyan-color-soft);
      }

      &--or {
        font-size: 12px;
        padding: 5px 10px;
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

      &--sub {
        padding-top: 4px;
        font-size: 10px;
        color: var(--text-color-3);
        opacity: 0.75;
      }
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
      transition: background var(--duration-fast) var(--ease-out);

      &:hover:not(:disabled) {
        background: var(--surface-hover);
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -2px;
      }
    }

    &__menu-label {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--text-color-1);
    }

    &__menu-hint {
      font-size: 0.78rem;
      color: var(--text-color-2);
    }
  }
</style>
