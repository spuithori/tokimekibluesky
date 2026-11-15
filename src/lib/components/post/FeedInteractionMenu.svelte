<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import { toast } from 'svelte-sonner';
  import Smile from '@lucide/svelte/icons/smile';
  import Frown from '@lucide/svelte/icons/frown';
  import { interactionFeedUri, queueFeedInteraction, resolveInteractionTarget, type FeedInteractionEvent } from '$lib/feedInteractions';

  let { _agent, column, item, onsend } = $props();

  const feedUri = $derived(interactionFeedUri(column, item));
  const target = $derived(feedUri ? resolveInteractionTarget(_agent, feedUri) : null);

  function send(serviceDid: string, event: FeedInteractionEvent) {
    if (feedUri) {
      queueFeedInteraction(_agent, feedUri, serviceDid, item, event, true);
      toast.success($_('feed_feedback_sent'));
    }
    onsend?.();
  }
</script>

{#if target}
  {#await target then serviceDid}
    {#if serviceDid}
      <li class="timeline-menu-list__item timeline-menu-list__item--feed-more">
        <button class="timeline-menu-list__button" onclick={() => send(serviceDid, 'requestMore')}>
          <Smile size="18" color="var(--text-color-1)"></Smile>
          {$_('feed_show_more')}
        </button>
      </li>

      <li class="timeline-menu-list__item timeline-menu-list__item--feed-less">
        <button class="timeline-menu-list__button" onclick={() => send(serviceDid, 'requestLess')}>
          <Frown size="18" color="var(--text-color-1)"></Frown>
          {$_('feed_show_less')}
        </button>
      </li>
    {/if}
  {/await}
{/if}
