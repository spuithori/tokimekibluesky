<script lang="ts">
  import type { Snippet } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import { CUSTOM_FEED_DEFS, VIEWER_DID, IMAGE_CLASSES, imageClassLabel, DEFAULT_IMAGE_CONFIDENCE } from '$lib/feedbuilder/types';
  import type { CustomFeedPredicate, CustomFeedTextTarget } from '$lib/feedbuilder/types';
  import PopoverMenu from '$lib/components/feedbuilder/PopoverMenu.svelte';
  import DateTimePicker from '$lib/components/feedbuilder/DateTimePicker.svelte';
  import DidPicker from './DidPicker.svelte';
  import { toListAtUri } from '$lib/feedbuilder/lists';
  import { weekdayName, WEEKDAY_INDEXES, localTimeZone } from '$lib/feedbuilder/timeOfDay';
  import { toFeedAtUri } from '$lib/feedbuilder/feeds';
  import { customFeeds } from '$lib/feedbuilder/customFeeds.svelte';
  import { floodWindowMinutes, switchFloodMode } from '$lib/feedbuilder/floodWindow';
  import type { Attachment } from 'svelte/attachments';

  function isoToLocal(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function localToIso(local: string): string {
    if (!local) return '';
    const d = new Date(local);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }

  interface TriggerCtx {
    ref: Attachment<HTMLElement>;
    toggle: () => void;
    open: boolean;
  }

  interface Props {
    predicate: CustomFeedPredicate;
    onChange: (next: CustomFeedPredicate) => void;
    trigger: Snippet<[TriggerCtx]>;
  }

  let { predicate, onChange, trigger: triggerSnippet }: Props = $props();
  let listError = $state<string | null>(null);

  const TARGETS: { value: CustomFeedTextTarget; labelKey: string }[] = [
    { value: 'text', labelKey: 'tfeeds_filter_target_text' },
    { value: 'alt', labelKey: 'tfeeds_filter_target_alt' },
    { value: 'both', labelKey: 'tfeeds_filter_target_both' }
  ];

  const VIA_SUGGESTIONS = ['TOKIMEKI', 'Witchsky Web App', 'Skyscraper for iOS and Mac', 'ZonePane for iOS', 'ZonePane for Android'];

  const PERSON_LABEL_KEY: Record<string, string> = {
    [CUSTOM_FEED_DEFS.predicateAuthor]: 'tfeeds_easy_c_author_menu',
    [CUSTOM_FEED_DEFS.predicateMentions]: 'tfeeds_filter_person_mentions',
    [CUSTOM_FEED_DEFS.predicateReplyTo]: 'tfeeds_filter_person_reply_to',
    [CUSTOM_FEED_DEFS.predicateQuotes]: 'tfeeds_filter_person_quotes'
  };
</script>

{#snippet targetPicker(target: CustomFeedTextTarget | undefined, set: (t: CustomFeedTextTarget | undefined) => void)}
  <div class="value-popover__field">
    <span>{$_('tfeeds_filter_target')}</span>
    <div class="value-popover__segmented">
      {#each TARGETS as t (t.value)}
        <button
          type="button"
          class:value-popover__segmented-option--active={(target ?? 'text') === t.value}
          onclick={() => set(t.value === 'text' ? undefined : t.value)}
        >
          {$_(t.labelKey)}
        </button>
      {/each}
    </div>
  </div>
{/snippet}

<PopoverMenu placement="bottom-start" gap={4}>
  {#snippet trigger(ctx)}
    {@render triggerSnippet(ctx)}
  {/snippet}
  {#snippet menu({ content, close })}
    <div
      {@attach content}
      class="value-popover__panel"
    >
      {#if predicate.$type === CUSTOM_FEED_DEFS.predicateKeyword}
        <label class="value-popover__field">
          <span>{$_('tfeeds_filter_keyword_label')}</span>
          <input
            type="text"
            value={predicate.value}
            maxlength="100"
            oninput={(e) =>
              onChange({ ...predicate, value: (e.target as HTMLInputElement).value })}
          />
        </label>
        {@render targetPicker(predicate.target, (target) => onChange({ ...predicate, target }))}
        <div class="value-popover__field">
          <span>{$_('tfeeds_filter_match_mode')}</span>
          <div class="value-popover__segmented">
            <button
              type="button"
              class:value-popover__segmented-option--active={!predicate.exact}
              onclick={() => onChange({ ...predicate, exact: false })}
            >
              {$_('tfeeds_filter_match_partial')}
            </button>
            <button
              type="button"
              class:value-popover__segmented-option--active={!!predicate.exact}
              onclick={() => onChange({ ...predicate, exact: true })}
            >
              {$_('tfeeds_filter_match_word')}
            </button>
          </div>
        </div>
      {:else if predicate.$type === CUSTOM_FEED_DEFS.predicateAuthor || predicate.$type === CUSTOM_FEED_DEFS.predicateMentions || predicate.$type === CUSTOM_FEED_DEFS.predicateReplyTo || predicate.$type === CUSTOM_FEED_DEFS.predicateQuotes}
        {@const p = predicate}
        <div class="value-popover__field">
          <span>{$_(PERSON_LABEL_KEY[p.$type])}</span>
          <div class="value-popover__segmented">
            <button
              type="button"
              class:value-popover__segmented-option--active={p.did === VIEWER_DID}
              onclick={() => onChange({ ...p, did: VIEWER_DID })}
            >
              {$_('tfeeds_filter_person_viewer')}
            </button>
            <button
              type="button"
              class:value-popover__segmented-option--active={p.did !== VIEWER_DID}
              onclick={() => onChange({ ...p, did: p.did === VIEWER_DID ? '' : p.did })}
            >
              {$_('tfeeds_filter_person_specified')}
            </button>
          </div>
          {#if p.did !== VIEWER_DID}
            <DidPicker value={p.did} onChange={(did) => onChange({ ...p, did })} />
          {:else}
            <p class="value-popover__hint">{$_('tfeeds_filter_person_viewer_hint')}</p>
          {/if}
        </div>
      {:else if predicate.$type === CUSTOM_FEED_DEFS.predicateHasImage || predicate.$type === CUSTOM_FEED_DEFS.predicateHasReply || predicate.$type === CUSTOM_FEED_DEFS.predicateHasQuote || predicate.$type === CUSTOM_FEED_DEFS.predicateHasVideo || predicate.$type === CUSTOM_FEED_DEFS.predicateHasLink || predicate.$type === CUSTOM_FEED_DEFS.predicateFirstPost || predicate.$type === CUSTOM_FEED_DEFS.predicateHasLabel || predicate.$type === CUSTOM_FEED_DEFS.predicateIsFromFollowing || predicate.$type === CUSTOM_FEED_DEFS.predicateIsMutual || predicate.$type === CUSTOM_FEED_DEFS.predicateReplyToFollowing || predicate.$type === CUSTOM_FEED_DEFS.predicateIsDuplicate}
        <div class="value-popover__segmented">
          <button
            type="button"
            class:value-popover__segmented-option--active={predicate.value === true}
            onclick={() => onChange({ ...predicate, value: true })}
          >
            {$_('tfeeds_filter_bool_true')}
          </button>
          <button
            type="button"
            class:value-popover__segmented-option--active={predicate.value === false}
            onclick={() => onChange({ ...predicate, value: false })}
          >
            {$_('tfeeds_filter_bool_false')}
          </button>
        </div>
      {:else if predicate.$type === CUSTOM_FEED_DEFS.predicateMinLikes || predicate.$type === CUSTOM_FEED_DEFS.predicateMinReposts || predicate.$type === CUSTOM_FEED_DEFS.predicateMinReplies || predicate.$type === CUSTOM_FEED_DEFS.predicateMinQuotes}
        <label class="value-popover__field">
          <span>{$_('tfeeds_filter_min_count')}</span>
          <input
            type="number"
            min="0"
            step="1"
            value={predicate.threshold}
            oninput={(e) => {
              const n = Number((e.target as HTMLInputElement).value);
              if (Number.isFinite(n)) onChange({ ...predicate, threshold: Math.max(0, Math.floor(n)) });
            }}
          />
        </label>
      {:else if predicate.$type === CUSTOM_FEED_DEFS.predicateAuthorMaxPosts}
        {@const p = predicate}
        {@const burst = p.mode === 'burst'}
        {@const inMinutes = p.withinMinutes !== undefined}
        {@const { withinHours: _h, withinMinutes: _m, ...rest } = p}
        <div class="value-popover__field">
          <span>{$_('tfeeds_filter_flood_exclude')}</span>
          <div class="value-popover__segmented">
            <button
              type="button"
              class:value-popover__segmented-option--active={!burst}
              onclick={() => onChange(switchFloodMode(p, 'recent'))}
            >
              {$_('tfeeds_filter_flood_mode_recent')}
            </button>
            <button
              type="button"
              class:value-popover__segmented-option--active={burst}
              onclick={() => onChange(switchFloodMode(p, 'burst'))}
            >
              {$_('tfeeds_filter_flood_mode_burst')}
            </button>
          </div>
        </div>
        <label class="value-popover__field">
          <span>{burst ? $_('tfeeds_filter_flood_max_burst') : $_('tfeeds_filter_flood_max_recent')}</span>
          <input
            type="number"
            min="1"
            max="10000"
            step="1"
            value={p.max}
            oninput={(e) => {
              const n = Number((e.target as HTMLInputElement).value);
              if (Number.isFinite(n)) onChange({ ...p, max: Math.min(10000, Math.max(1, Math.floor(n))) });
            }}
          />
        </label>
        <label class="value-popover__field">
          <span>{burst ? $_('tfeeds_filter_flood_window_burst') : $_('tfeeds_filter_flood_window_recent')}</span>
          <input
            type="number"
            min="1"
            max={inMinutes ? 10080 : 168}
            step="1"
            value={inMinutes ? p.withinMinutes : (p.withinHours ?? 24)}
            oninput={(e) => {
              const n = Math.floor(Number((e.target as HTMLInputElement).value));
              if (!Number.isFinite(n)) return;
              onChange(
                inMinutes
                  ? { ...rest, withinMinutes: Math.min(10080, Math.max(1, n)) }
                  : { ...rest, withinHours: Math.min(168, Math.max(1, n)) }
              );
            }}
          />
        </label>
        <div class="value-popover__field">
          <span>{$_('tfeeds_filter_unit')}</span>
          <div class="value-popover__segmented">
            <button
              type="button"
              class:value-popover__segmented-option--active={!inMinutes}
              onclick={() => onChange({ ...rest, withinHours: Math.min(168, Math.max(1, Math.round(floodWindowMinutes(p) / 60))) })}
            >
              {$_('tfeeds_filter_unit_hours')}
            </button>
            <button
              type="button"
              class:value-popover__segmented-option--active={inMinutes}
              onclick={() => onChange({ ...rest, withinMinutes: floodWindowMinutes(p) })}
            >
              {$_('tfeeds_filter_unit_minutes')}
            </button>
          </div>
        </div>
      {:else if predicate.$type === CUSTOM_FEED_DEFS.predicateSince || predicate.$type === CUSTOM_FEED_DEFS.predicateUntil}
        <div class="value-popover__field">
          <span>{$_('tfeeds_filter_datetime')}</span>
          <DateTimePicker
            value={isoToLocal(predicate.at)}
            onchange={(v) => onChange({ ...predicate, at: localToIso(v) })}
          />
        </div>
      {:else if predicate.$type === CUSTOM_FEED_DEFS.predicateTimeOfDay}
        {@const p = predicate}
        {@const allDay = (p.start ?? '00:00') === '00:00' && (p.end ?? '24:00') === '24:00'}
        <div class="value-popover__field">
          <span>{$_('tfeeds_filter_time_range')}</span>
          <div class="value-popover__segmented">
            <button
              type="button"
              class:value-popover__segmented-option--active={!allDay}
              onclick={() => onChange({ ...p, start: '22:00', end: '05:00' })}
            >
              {$_('tfeeds_filter_time_range_specify')}
            </button>
            <button
              type="button"
              class:value-popover__segmented-option--active={allDay}
              onclick={() => onChange({ ...p, start: undefined, end: undefined })}
            >
              {$_('tfeeds_easy_time_all')}
            </button>
          </div>
          {#if !allDay}
            <div class="value-popover__row">
              <input
                type="time"
                value={p.start ?? '00:00'}
                onchange={(e) => onChange({ ...p, start: (e.target as HTMLInputElement).value || '00:00' })}
              />
              <span>{$_('tfeeds_filter_range_sep')}</span>
              <input
                type="time"
                value={p.end === '24:00' ? '00:00' : (p.end ?? '00:00')}
                onchange={(e) => onChange({ ...p, end: (e.target as HTMLInputElement).value || '00:00' })}
              />
            </div>
            <p class="value-popover__hint">{$_('tfeeds_filter_time_range_hint')}</p>
          {/if}
        </div>
        <div class="value-popover__field">
          <span>{$_('tfeeds_filter_weekdays')}</span>
          <div class="value-popover__weekdays">
            {#each WEEKDAY_INDEXES as i (i)}
              {@const on = p.weekdays?.includes(i) ?? false}
              <button
                type="button"
                class:value-popover__segmented-option--active={on}
                aria-pressed={on}
                onclick={() => {
                  const cur = p.weekdays ?? [];
                  const next = on ? cur.filter((d) => d !== i) : [...cur, i].sort((a, b) => a - b);
                  onChange({ ...p, weekdays: next.length ? next : undefined });
                }}
              >
                {weekdayName(i)}
              </button>
            {/each}
          </div>
        </div>
        <label class="value-popover__field">
          <span>{$_('tfeeds_filter_timezone')}</span>
          <input
            type="text"
            value={p.timezone ?? 'UTC'}
            placeholder={localTimeZone()}
            onchange={(e) => onChange({ ...p, timezone: (e.target as HTMLInputElement).value.trim() || 'UTC' })}
          />
        </label>
      {:else if predicate.$type === CUSTOM_FEED_DEFS.predicateLanguage}
        <label class="value-popover__field">
          <span>{$_('tfeeds_filter_language_codes')}</span>
          <input
            type="text"
            value={predicate.codes.join(', ')}
            placeholder="ja, en"
            oninput={(e) => {
              const codes = (e.target as HTMLInputElement).value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              onChange({ ...predicate, codes });
            }}
          />
        </label>
      {:else if predicate.$type === CUSTOM_FEED_DEFS.predicateInList}
        {@const p = predicate}
        <label class="value-popover__field">
          <span>{$_('tfeeds_filter_list_url')}</span>
          <input
            type="text"
            value={p.list}
            placeholder="https://bsky.app/profile/…/lists/…"
            onchange={async (e) => {
              const raw = (e.target as HTMLInputElement).value;
              listError = null;
              if (!raw.trim()) {
                onChange({ ...p, list: '' });
                return;
              }
              try {
                onChange({ ...p, list: await toListAtUri(raw) });
              } catch (err) {
                listError = err instanceof Error ? err.message : $_('tfeeds_filter_list_error');
              }
            }}
          />
        </label>
        {#if listError}<p class="value-popover__error">{listError}</p>{/if}
        <div class="value-popover__segmented">
          <button
            type="button"
            class:value-popover__segmented-option--active={p.value === true}
            onclick={() => onChange({ ...p, value: true })}
          >
            {$_('tfeeds_filter_list_only')}
          </button>
          <button
            type="button"
            class:value-popover__segmented-option--active={p.value === false}
            onclick={() => onChange({ ...p, value: false })}
          >
            {$_('tfeeds_filter_list_exclude')}
          </button>
        </div>
      {:else if predicate.$type === CUSTOM_FEED_DEFS.predicateInFeed}
        {@const p = predicate}
        <label class="value-popover__field">
          <span>{$_('tfeeds_filter_feed_url')}</span>
          <input
            type="text"
            value={p.feed}
            placeholder="https://bsky.app/profile/…/feed/…"
            onchange={async (e) => {
              const raw = (e.target as HTMLInputElement).value;
              listError = null;
              if (!raw.trim()) {
                onChange({ ...p, feed: '' });
                return;
              }
              try {
                onChange({ ...p, feed: await toFeedAtUri(raw) });
              } catch (err) {
                listError = err instanceof Error ? err.message : $_('tfeeds_filter_feed_error');
              }
            }}
          />
        </label>
        {#if listError}<p class="value-popover__error">{listError}</p>{/if}
        {#if customFeeds.items.length > 0}
          <label class="value-popover__field">
            <span>{$_('tfeeds_filter_feed_pick_own')}</span>
            <select
              value={p.feed}
              onchange={(e) => onChange({ ...p, feed: (e.target as HTMLSelectElement).value })}
            >
              <option value="">{$_('tfeeds_filter_feed_pick_placeholder')}</option>
              {#each customFeeds.items as f (f.uri)}
                <option value={f.uri}>{f.record.name || f.rkey}</option>
              {/each}
            </select>
          </label>
        {/if}
        <div class="value-popover__segmented">
          <button
            type="button"
            class:value-popover__segmented-option--active={p.value === true}
            onclick={() => onChange({ ...p, value: true })}
          >
            {$_('tfeeds_filter_feed_only')}
          </button>
          <button
            type="button"
            class:value-popover__segmented-option--active={p.value === false}
            onclick={() => onChange({ ...p, value: false })}
          >
            {$_('tfeeds_filter_feed_exclude')}
          </button>
        </div>
      {:else if predicate.$type === CUSTOM_FEED_DEFS.predicateDomain}
        <label class="value-popover__field">
          <span>{$_('tfeeds_filter_domain')}</span>
          <input
            type="text"
            value={predicate.host}
            placeholder="example.com"
            oninput={(e) =>
              onChange({ ...predicate, host: (e.target as HTMLInputElement).value })}
          />
        </label>
      {:else if predicate.$type === CUSTOM_FEED_DEFS.predicateRegex}
        {@const p = predicate}
        <label class="value-popover__field">
          <span>{$_('tfeeds_filter_regex_label')}</span>
          <input
            type="text"
            class="value-popover__mono"
            value={p.pattern}
            maxlength="300"
            placeholder={$_('tfeeds_filter_regex_placeholder')}
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            oninput={(e) => onChange({ ...p, pattern: (e.target as HTMLInputElement).value })}
          />
        </label>
        {@render targetPicker(p.target, (target) => onChange({ ...p, target }))}
        <div class="value-popover__field">
          <span>{$_('tfeeds_filter_case')}</span>
          <div class="value-popover__segmented">
            <button
              type="button"
              class:value-popover__segmented-option--active={!p.caseSensitive}
              onclick={() => onChange({ ...p, caseSensitive: undefined })}
            >
              {$_('tfeeds_filter_case_insensitive')}
            </button>
            <button
              type="button"
              class:value-popover__segmented-option--active={!!p.caseSensitive}
              onclick={() => onChange({ ...p, caseSensitive: true })}
            >
              {$_('tfeeds_filter_case_sensitive')}
            </button>
          </div>
        </div>
      {:else if predicate.$type === CUSTOM_FEED_DEFS.predicateImageClass}
        {@const p = predicate}
        <div class="value-popover__field">
          <span>{$_('tfeeds_filter_image_class_label')}</span>
          <div class="value-popover__segmented">
            {#each IMAGE_CLASSES as c (c)}
              <button
                type="button"
                class:value-popover__segmented-option--active={p.class === c}
                onclick={() => onChange({ ...p, class: c })}
              >
                {imageClassLabel(c)}
              </button>
            {/each}
          </div>
        </div>
        <label class="value-popover__field">
          <span>{$_('tfeeds_filter_image_confidence')}</span>
          <input
            type="number"
            min="1"
            max="99"
            step="5"
            value={p.minConfidence ?? DEFAULT_IMAGE_CONFIDENCE}
            oninput={(e) => {
              const n = Number((e.target as HTMLInputElement).value);
              if (Number.isFinite(n)) {
                const v = Math.min(99, Math.max(1, Math.round(n)));
                onChange({ ...p, minConfidence: v === DEFAULT_IMAGE_CONFIDENCE ? undefined : v });
              }
            }}
          />
        </label>
      {:else if predicate.$type === CUSTOM_FEED_DEFS.predicateVia}
        <label class="value-popover__field">
          <span>{$_('tfeeds_filter_via_label')}</span>
          <input
            type="text"
            value={predicate.value ?? ''}
            maxlength="100"
            list="via-suggestions"
            placeholder="TOKIMEKI"
            oninput={(e) => onChange({ ...predicate, value: (e.target as HTMLInputElement).value })}
          />
          <datalist id="via-suggestions">
            {#each VIA_SUGGESTIONS as v (v)}
              <option value={v}></option>
            {/each}
          </datalist>
        </label>
      {:else if predicate.$type === CUSTOM_FEED_DEFS.predicateTag}
        <label class="value-popover__field">
          <span>{$_('tfeeds_filter_tag_label')}</span>
          <input
            type="text"
            value={predicate.tag}
            oninput={(e) =>
              onChange({ ...predicate, tag: (e.target as HTMLInputElement).value })}
          />
        </label>
      {/if}

      <div class="value-popover__actions">
        <button
          type="button"
          class="value-popover__action-done"
          onclick={close}
        >
          {$_('tfeeds_filter_done')}
        </button>
      </div>
    </div>
  {/snippet}
</PopoverMenu>

<style lang="postcss">
  .value-popover {
    &__panel {
      background: var(--bg-color-1);
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-3);
      padding: var(--space-3);
      min-width: 18rem;
      max-width: 24rem;
      box-shadow: var(--shadow-3);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    &__row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    &__weekdays {
      display: flex;
      gap: 2px;

      & > button {
        all: unset;
        flex: 1;
        min-width: 0;
        text-align: center;
        padding: var(--space-1) 0;
        border: 1px solid var(--border-color-1);
        border-radius: var(--radius-2);
        background: var(--bg-color-1);
        color: var(--text-color-1);
        cursor: pointer;
        font-size: 0.85rem;

        &:hover {
          background: var(--surface-hover);
        }
      }
    }

    &__hint {
      margin: 0;
      font-size: 0.75rem;
      opacity: 0.7;
    }

    &__error {
      margin: 0;
      font-size: 0.75rem;
      color: var(--danger-color);
    }

    &__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      font-size: 0.8rem;
      color: var(--text-color-1);

      & > span {
        color: var(--text-color-3);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-size: 0.72rem;
      }

      & > input {
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--border-color-1);
        border-radius: var(--radius-2);
        background: var(--bg-color-2);
        color: var(--text-color-1);
        font: inherit;
        font-size: 0.9rem;
        transition:
          border-color var(--duration-fast) var(--ease-out),
          box-shadow var(--duration-fast) var(--ease-out);

        &:focus {
          outline: none;
          border-color: var(--primary-color);
          background: var(--bg-color-1);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 18%, transparent);
        }
      }
    }

    &__mono {
      font-family: var(--code-font) !important;
    }

    &__segmented {
      display: flex;

      & > button {
        all: unset;
        flex: 1;
        text-align: center;
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--border-color-1);
        background: var(--bg-color-1);
        color: var(--text-color-1);
        cursor: pointer;
        font: inherit;
        font-size: 0.85rem;
        transition:
          background var(--duration-fast) var(--ease-out),
          color var(--duration-fast) var(--ease-out);

        &:first-child {
          border-radius: var(--radius-2) 0 0 var(--radius-2);
          border-right: 0;
        }
        &:not(:first-child):not(:last-child) {
          border-right: 0;
        }
        &:last-child {
          border-radius: 0 var(--radius-2) var(--radius-2) 0;
        }

        &:hover {
          background: var(--surface-hover);
        }
      }

      &-option--active {
        background: var(--primary-color) !important;
        color: var(--text-color-inverse) !important;
        border-color: var(--primary-color) !important;
      }
    }

    &__actions {
      display: flex;
      justify-content: flex-end;
    }

    &__action-done {
      all: unset;
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-2);
      background: var(--primary-color);
      color: var(--text-color-inverse);
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: background var(--duration-fast) var(--ease-out);

      &:hover {
        background: var(--primary-color-hover);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
    }
  }
</style>
