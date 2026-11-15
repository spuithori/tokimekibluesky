<script lang="ts">
  import Ban from '@lucide/svelte/icons/ban';
  import X from '@lucide/svelte/icons/x';
  import { _ } from 'tokimeki-i18n';
  import { CUSTOM_FEED_DEFS, VIEWER_DID, imageClassLabel, DEFAULT_IMAGE_CONFIDENCE } from '$lib/feedbuilder/types';
  import type { CustomFeedPredicate, ProfileViewDetailed } from '$lib/feedbuilder/types';
  import FbAvatar from '$lib/components/feedbuilder/FbAvatar.svelte';
  import { getCachedProfile, resolveProfile } from '$lib/feedbuilder/profileResolver.svelte';
  import ValuePopover from './ValuePopover.svelte';
  import { listName } from '$lib/feedbuilder/lists';
  import { timeOfDayLabel } from '$lib/feedbuilder/timeOfDay';
  import { feedName, feedKey } from '$lib/feedbuilder/feeds';

  interface Props {
    predicate: CustomFeedPredicate;
    onChange: (next: CustomFeedPredicate) => void;
    onRemove: () => void;
    openOnMount?: boolean;
    negated?: boolean;
    onToggleNegate?: () => void;
  }
  let { predicate, onChange, onRemove, openOnMount = false, negated = false, onToggleNegate }: Props = $props();

  let autoOpened = false;
  function autoOpen(toggle: () => void) {
    return () => {
      if (openOnMount && !autoOpened) {
        autoOpened = true;
        setTimeout(toggle, 0);
      }
    };
  }

  const summary = $derived(describe(predicate));
  const accent = $derived(accentFor(predicate));

  const referencedDid = $derived.by<string | undefined>(() => {
    if (
      predicate.$type === CUSTOM_FEED_DEFS.predicateAuthor ||
      predicate.$type === CUSTOM_FEED_DEFS.predicateMentions ||
      predicate.$type === CUSTOM_FEED_DEFS.predicateReplyTo ||
      predicate.$type === CUSTOM_FEED_DEFS.predicateQuotes
    ) {
      return predicate.did === VIEWER_DID ? undefined : predicate.did;
    }
    return undefined;
  });

  let profile = $state<ProfileViewDetailed | null>(null);

  $effect(() => {
    if (!referencedDid) {
      profile = null;
      return;
    }
    const cached = getCachedProfile(referencedDid);
    if (cached !== undefined) {
      profile = cached;
      return;
    }
    let alive = true;
    profile = null;
    resolveProfile(referencedDid).then((p) => {
      if (alive) profile = p;
    });
    return () => {
      alive = false;
    };
  });

  let resolvedFeedName = $state<string | null>(null);
  $effect(() => {
    const uri = predicate.$type === CUSTOM_FEED_DEFS.predicateInFeed ? predicate.feed : '';
    resolvedFeedName = null;
    if (!uri) return;
    let alive = true;
    feedName(uri).then((n) => {
      if (alive) resolvedFeedName = n ?? feedKey(uri)?.rkey ?? uri;
    });
    return () => {
      alive = false;
    };
  });

  let resolvedListName = $state<string | null>(null);
  $effect(() => {
    const uri = predicate.$type === CUSTOM_FEED_DEFS.predicateInList ? predicate.list : '';
    resolvedListName = null;
    if (!uri) return;
    let alive = true;
    listName(uri).then((n) => {
      if (alive) resolvedListName = n ?? uri.split('/').pop() ?? uri;
    });
    return () => {
      alive = false;
    };
  });

  const displayName = $derived(profile?.displayName?.trim() || undefined);
  const handle = $derived(profile?.handle);

  function accentFor(p: CustomFeedPredicate): 'pink' | 'peri' | 'mint' | 'sky' | 'cream' {
    switch (p.$type) {
      case CUSTOM_FEED_DEFS.predicateHasImage:
      case CUSTOM_FEED_DEFS.predicateImageClass:
      case CUSTOM_FEED_DEFS.predicateHasReply:
      case CUSTOM_FEED_DEFS.predicateHasQuote:
      case CUSTOM_FEED_DEFS.predicateHasVideo:
      case CUSTOM_FEED_DEFS.predicateHasLink:
      case CUSTOM_FEED_DEFS.predicateFirstPost:
      case CUSTOM_FEED_DEFS.predicateHasLabel:
      case CUSTOM_FEED_DEFS.predicateMentions:
      case CUSTOM_FEED_DEFS.predicateReplyTo:
      case CUSTOM_FEED_DEFS.predicateReplyToFollowing:
      case CUSTOM_FEED_DEFS.predicateQuotes:
        return 'pink';
      case CUSTOM_FEED_DEFS.predicateMinLikes:
      case CUSTOM_FEED_DEFS.predicateMinReposts:
      case CUSTOM_FEED_DEFS.predicateMinReplies:
      case CUSTOM_FEED_DEFS.predicateMinQuotes:
      case CUSTOM_FEED_DEFS.predicateAuthorMaxPosts:
      case CUSTOM_FEED_DEFS.predicateIsDuplicate:
        return 'mint';
      case CUSTOM_FEED_DEFS.predicateSince:
      case CUSTOM_FEED_DEFS.predicateUntil:
      case CUSTOM_FEED_DEFS.predicateTimeOfDay:
        return 'sky';
      case CUSTOM_FEED_DEFS.predicateAuthor:
      case CUSTOM_FEED_DEFS.predicateIsFromFollowing:
      case CUSTOM_FEED_DEFS.predicateIsMutual:
      case CUSTOM_FEED_DEFS.predicateInList:
      case CUSTOM_FEED_DEFS.predicateInFeed:
        return 'peri';
      case CUSTOM_FEED_DEFS.predicateKeyword:
      case CUSTOM_FEED_DEFS.predicateTag:
      case CUSTOM_FEED_DEFS.predicateDomain:
      case CUSTOM_FEED_DEFS.predicateLanguage:
      case CUSTOM_FEED_DEFS.predicateVia:
      case CUSTOM_FEED_DEFS.predicateRegex:
        return 'cream';
    }
  }

  function who(did: string): string {
    if (did === VIEWER_DID) return $_('tfeeds_easy_author_me');
    return did ? did.slice(0, 18) + '…' : $_('tfeeds_unset');
  }

  function around(key: string, value: string, params?: Record<string, unknown>) {
    const [lead, trailing = ''] = $_(key, params).split('{value}');
    return { lead: lead.trim(), value, trailing: trailing.trim() };
  }

  function only(value: string) {
    return { lead: '', value, trailing: '' };
  }

  function targetSuffix(target: string | undefined): string {
    return target === 'alt' ? 'alt' : target === 'both' ? 'both' : 'text';
  }

  function describe(p: CustomFeedPredicate): {
    lead: string;
    value: string;
    trailing: string;
  } {
    switch (p.$type) {
      case CUSTOM_FEED_DEFS.predicateKeyword:
        return around(
          `tfeeds_filter_d_keyword_${targetSuffix(p.target)}${p.exact ? '_exact' : ''}`,
          p.value || '…'
        );
      case CUSTOM_FEED_DEFS.predicateAuthor:
        return around('tfeeds_filter_d_author', who(p.did));
      case CUSTOM_FEED_DEFS.predicateReplyTo:
        return around('tfeeds_filter_d_reply_to', who(p.did));
      case CUSTOM_FEED_DEFS.predicateReplyToFollowing:
        return around(
          'tfeeds_filter_d_reply_to',
          p.value ? $_('tfeeds_easy_src_following') : $_('tfeeds_p_not_following')
        );
      case CUSTOM_FEED_DEFS.predicateQuotes:
        return around('tfeeds_filter_d_quotes', who(p.did));
      case CUSTOM_FEED_DEFS.predicateTimeOfDay:
        return around('tfeeds_filter_d_time_of_day', timeOfDayLabel(p));
      case CUSTOM_FEED_DEFS.predicateAuthorMaxPosts:
        return around('tfeeds_filter_d_author_max_posts', String(p.max), { hours: p.withinHours ?? 24 });
      case CUSTOM_FEED_DEFS.predicateInFeed:
        return around(
          p.value ? 'tfeeds_filter_d_in_feed' : 'tfeeds_filter_d_not_in_feed',
          p.feed ? (resolvedFeedName ?? '…') : $_('tfeeds_unset')
        );
      case CUSTOM_FEED_DEFS.predicateIsDuplicate:
        return only(p.value ? $_('tfeeds_p_dup') : $_('tfeeds_filter_dup_first_only'));
      case CUSTOM_FEED_DEFS.predicateHasImage:
        return only(p.value ? $_('tfeeds_filter_has_image') : $_('tfeeds_easy_c_image_neg'));
      case CUSTOM_FEED_DEFS.predicateImageClass:
        return around('tfeeds_filter_d_image_class', imageClassLabel(p.class), {
          n: p.minConfidence ?? DEFAULT_IMAGE_CONFIDENCE
        });
      case CUSTOM_FEED_DEFS.predicateHasReply:
        return only(p.value ? $_('tfeeds_p_reply') : $_('tfeeds_p_reply_neg'));
      case CUSTOM_FEED_DEFS.predicateHasQuote:
        return only(p.value ? $_('tfeeds_p_quote') : $_('tfeeds_p_quote_neg'));
      case CUSTOM_FEED_DEFS.predicateHasVideo:
        return only(p.value ? $_('tfeeds_p_video') : $_('tfeeds_easy_c_video_neg'));
      case CUSTOM_FEED_DEFS.predicateInList:
        return around(
          p.value ? 'tfeeds_filter_d_in_list' : 'tfeeds_filter_d_not_in_list',
          p.list ? (resolvedListName ?? '…') : $_('tfeeds_unset')
        );
      case CUSTOM_FEED_DEFS.predicateHasLink:
        return only(p.value ? $_('tfeeds_p_link') : $_('tfeeds_easy_c_link_neg'));
      case CUSTOM_FEED_DEFS.predicateFirstPost:
        return only(p.value ? $_('tfeeds_p_first_post') : $_('tfeeds_filter_first_post_exclude'));
      case CUSTOM_FEED_DEFS.predicateHasLabel:
        return only(p.value ? $_('tfeeds_p_label') : $_('tfeeds_easy_c_no_adult_menu'));
      case CUSTOM_FEED_DEFS.predicateMinLikes:
        return around('tfeeds_filter_d_min_likes', String(p.threshold));
      case CUSTOM_FEED_DEFS.predicateMinReposts:
        return around('tfeeds_filter_d_min_reposts', String(p.threshold));
      case CUSTOM_FEED_DEFS.predicateMinReplies:
        return around('tfeeds_filter_d_min_replies', String(p.threshold));
      case CUSTOM_FEED_DEFS.predicateMinQuotes:
        return around('tfeeds_filter_d_min_quotes', String(p.threshold));
      case CUSTOM_FEED_DEFS.predicateSince:
        return around('tfeeds_filter_d_since', p.at || $_('tfeeds_unset'));
      case CUSTOM_FEED_DEFS.predicateUntil:
        return around('tfeeds_filter_d_until', p.at || $_('tfeeds_unset'));
      case CUSTOM_FEED_DEFS.predicateLanguage:
        return around('tfeeds_filter_d_language', p.codes.join(', ') || $_('tfeeds_unset'));
      case CUSTOM_FEED_DEFS.predicateMentions:
        return around('tfeeds_filter_d_mentions', who(p.did));
      case CUSTOM_FEED_DEFS.predicateDomain:
        return around('tfeeds_filter_d_domain', p.host || $_('tfeeds_unset'));
      case CUSTOM_FEED_DEFS.predicateTag:
        return { lead: '#', value: p.tag || $_('tfeeds_unset'), trailing: '' };
      case CUSTOM_FEED_DEFS.predicateVia:
        return { lead: 'via', value: p.value?.trim() || $_('tfeeds_filter_via_any'), trailing: '' };
      case CUSTOM_FEED_DEFS.predicateRegex:
        return around(
          `tfeeds_filter_d_regex_${targetSuffix(p.target)}`,
          p.pattern ? `/${p.pattern}/${p.caseSensitive ? '' : 'i'}` : $_('tfeeds_filter_not_entered')
        );
      case CUSTOM_FEED_DEFS.predicateIsFromFollowing:
        return only(p.value ? $_('tfeeds_easy_src_following') : $_('tfeeds_p_not_following'));
      case CUSTOM_FEED_DEFS.predicateIsMutual:
        return only(p.value ? $_('tfeeds_p_mutual') : $_('tfeeds_p_not_mutual'));
    }
  }
</script>

<div class="chip" class:is-negated={negated} data-accent={accent}>
  {#if negated}
    <span class="chip__not" aria-hidden="true">{$_('tfeeds_filter_not_badge')}</span>
  {/if}
  <ValuePopover {predicate} {onChange}>
    {#snippet trigger({ ref, toggle, open })}
      <button
        type="button"
        {@attach ref}
        {@attach autoOpen(toggle)}
        class="chip__main"
        class:is-open={open}
        onclick={toggle}
      >
        {#if referencedDid !== undefined && handle}
          <FbAvatar src={profile?.avatar} handle={handle} size={18} />
          {#if summary.lead}<span class="chip__lead">{summary.lead}</span>{/if}
          <span class="chip__value">
            {displayName ?? `@${handle}`}
          </span>
          {#if summary.trailing}<span class="chip__lead">{summary.trailing}</span>{/if}
        {:else}
          <span class="chip__dot" aria-hidden="true"></span>
          {#if summary.lead}<span class="chip__lead">{summary.lead}</span>{/if}
          <span class="chip__value">{summary.value}</span>
          {#if summary.trailing}<span class="chip__lead">{summary.trailing}</span>{/if}
        {/if}
      </button>
    {/snippet}
  </ValuePopover>
  {#if onToggleNegate}
    <button
      type="button"
      class="chip__negate"
      aria-pressed={negated}
      aria-label={$_('tfeeds_filter_negate')}
      title={negated ? $_('tfeeds_filter_negate_off') : $_('tfeeds_filter_negate')}
      onclick={onToggleNegate}
    >
      <Ban size={13} strokeWidth={2.2} aria-hidden="true" />
    </button>
  {/if}
  <button
    type="button"
    class="chip__remove"
    aria-label={$_('tfeeds_filter_remove_condition')}
    onclick={onRemove}
  >
    <X size={13} strokeWidth={2.2} />
  </button>
</div>

<style lang="postcss">
  .chip.is-negated {
    border-color: var(--danger-color);
  }

  .chip__not {
    display: inline-flex;
    align-items: center;
    padding: 0 8px;
    background: var(--danger-color);
    color: var(--bg-color-1);
    font-size: 12px;
    font-weight: 700;
  }

  .chip__negate {
    all: unset;
    display: inline-grid;
    place-items: center;
    width: 30px;
    border-left: 1px solid var(--border-color-2);
    color: var(--text-color-2);
    cursor: pointer;

    &:hover { background: var(--surface-hover); color: var(--danger-color); }
    &[aria-pressed='true'] { color: var(--danger-color); }
    &:focus-visible { outline: 2px solid var(--primary-color); outline-offset: -2px; }
  }

  .chip {
    --chip-accent: var(--primary-color);

    display: inline-flex;
    align-items: stretch;
    background: var(--bg-color-1);
    border: 1px solid var(--border-color-2);
    border-radius: var(--radius-pill);
    font-size: 13px;
    font-weight: 500;
    overflow: hidden;
    transition:
      border-color var(--duration-fast) var(--ease-out),
      box-shadow var(--duration-fast) var(--ease-out);

    &:hover {
      border-color: color-mix(in srgb, var(--chip-accent) 40%, var(--border-color-1));
      box-shadow: var(--shadow-1);
    }

    &[data-accent='pink']  { --chip-accent: var(--color-primary-500); }
    &[data-accent='peri']  { --chip-accent: var(--primary-color); }
    &[data-accent='mint']  { --chip-accent: var(--success-color); }
    &[data-accent='sky']   { --chip-accent: var(--cyan-color); }
    &[data-accent='cream'] { --chip-accent: var(--primary-color); }
  }

  .chip__main {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px var(--space-3);
    cursor: pointer;
    font: inherit;
    color: var(--text-color-1);
    letter-spacing: 0.01em;
    transition: background-color var(--duration-fast) var(--ease-out);

    &:hover {
      background-color: color-mix(in srgb, var(--chip-accent) 6%, transparent);
    }

    &.is-open {
      background-color: color-mix(in srgb, var(--chip-accent) 10%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--chip-accent) 40%, transparent);
    }

    &:focus-visible {
      outline: 2px solid var(--chip-accent);
      outline-offset: -1px;
    }
  }

  .chip__dot {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-pill);
    background-color: var(--chip-accent);
    flex-shrink: 0;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--chip-accent) 20%, transparent);
  }

  .chip__lead {
    color: var(--text-color-3);
    font-size: 12px;
  }

  .chip__value {
    color: var(--text-color-1);
    font-weight: 600;
  }

  .chip__remove {
    all: unset;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
    cursor: pointer;
    color: var(--text-color-3);
    border-left: 1px solid var(--border-color-2);
    transition:
      background-color var(--duration-fast) var(--ease-out),
      color var(--duration-fast) var(--ease-out);

    &:hover {
      background-color: color-mix(in srgb, var(--danger-color) 14%, transparent);
      color: var(--danger-color);
    }

    &:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: -1px;
    }
  }
</style>
