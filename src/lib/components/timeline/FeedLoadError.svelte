<script lang="ts">
  import {_} from "tokimeki-i18n";
  import {feedOwnerDid, type FeedLoadError, type FeedLoadErrorKind} from "$lib/components/timeline/feedLoadError";

  let {
    error,
    feedUri = undefined,
    onretry = undefined,
    onremove = undefined,
  }: {
    error: FeedLoadError;
    feedUri?: string;
    onretry?: () => void;
    onremove?: () => void;
  } = $props();

  const MESSAGE_KEYS: Record<FeedLoadErrorKind, string> = {
    feedgenDoesNotExist: 'feed_error_not_found',
    feedgenMisconfigured: 'feed_error_misconfigured',
    feedgenBadResponse: 'feed_error_bad_response',
    feedgenOffline: 'feed_error_offline',
    feedgenUnknown: 'feed_error_unknown',
    feedTooManyRequests: 'feed_error_too_many_requests',
    unknown: 'feed_error_generic',
  };

  const isMissing = $derived(error.kind === 'feedgenDoesNotExist');
  const ownerDid = $derived(error.kind === 'unknown' ? '' : feedOwnerDid(feedUri));
  const canRetry = $derived(!!onretry && !isMissing);
  const canRemove = $derived(!!onremove && isMissing);
</script>

<div class="feed-load-error">
  <p>{$_(MESSAGE_KEYS[error.kind])}</p>

  {#if error.serverMessage}
    <p class="feed-load-error__server">{$_('feed_error_server_message', {message: error.serverMessage})}</p>
  {/if}

  {#if canRetry || canRemove || ownerDid}
    <div class="feed-load-error__buttons">
      {#if canRetry}
        <button class="button button--sm" onclick={onretry}>{$_('retry')}</button>
      {/if}

      {#if canRemove}
        <button class="button button--sm" onclick={onremove}>{$_('delete_column')}</button>
      {/if}

      {#if ownerDid}
        <a class="button button--sm button--border" href="/profile/{ownerDid}">{$_('feed_error_view_profile')}</a>
      {/if}
    </div>
  {/if}
</div>

<style lang="postcss">
  .feed-load-error {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px 0;
      color: var(--text-color-1);
      font-size: 15px;
      line-height: 1.6;
      overflow-wrap: anywhere;

      &__server {
          color: var(--text-color-3);
          font-size: 13px;
      }

      &__buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
      }
  }
</style>
