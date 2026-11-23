<script lang="ts">
import { _ } from 'tokimeki-i18n';
import { agent } from "$lib/stores";
import SearchCheck from '@lucide/svelte/icons/search-check';

  interface Props {
    _agent?: any;
    feed: any;
    size?: string;
    subscribed?: boolean;
    withIcon?: boolean;
  }

  let { _agent = $agent, feed, size, subscribed = $bindable(false), withIcon, }: Props = $props();

    let isProcessing = $state(false);

    async function refreshSubscribe() {
        const res = await _agent.xrpc.get('app.bsky.actor.getPreferences');
        const getPreferences = res.preferences;
        const savedFeeds = getPreferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')[0]?.saved;
        subscribed = savedFeeds.includes(feed.uri);
    }

    async function subscribe() {
        isProcessing = true;
        const res = await _agent.xrpc.get('app.bsky.actor.getPreferences');
        const preferences = res.preferences;
        const newPreferences = preferences.map(preference => {
            if (preference.$type === 'app.bsky.actor.defs#savedFeedsPref' && preference.saved) {
                preference.saved = [...preference.saved, feed.uri];
            }
            return preference;
        });

        if (!newPreferences.some(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')) {
            newPreferences.push({
                $type: 'app.bsky.actor.defs#savedFeedsPref',
                pinned: [],
                saved: [feed.uri],
            });
        }

        try {
            await _agent.xrpc.post('app.bsky.actor.putPreferences', {preferences: newPreferences})
            await refreshSubscribe();
            isProcessing = false;
        } catch (e) {
            console.error(e)
            isProcessing = false;
        }
    }

    async function unsubscribe() {
        isProcessing = true;
        const res = await _agent.xrpc.get('app.bsky.actor.getPreferences');
        const preferences = res.preferences;
        const newPreferences = preferences.map(preference => {
            if (preference.$type === 'app.bsky.actor.defs#savedFeedsPref' && preference.saved) {
                preference.saved = preference.saved.filter(save => save !== feed.uri);
            }
            return preference;
        });

        try {
            await _agent.xrpc.post('app.bsky.actor.putPreferences', {preferences: newPreferences})
            await refreshSubscribe();
            isProcessing = false;
        } catch (e) {
            console.error(e)
            isProcessing = false;
        }
    }
</script>

{#if subscribed}
  <button class="button {size && `button--${size}`} button--following button--unsubscribe" disabled={isProcessing} onclick={unsubscribe} data-unfollow-name="{$_('unsubscribe_button')}">
    {#if withIcon}
      <SearchCheck />
    {/if}
    {$_('subscribed_button')}
  </button>
{:else}
  <button class="button {size && `button--${size}`} button--subscribe" disabled={isProcessing} onclick={subscribe}>
    {#if withIcon}
      <SearchCheck />
    {/if}
    {$_('subscribe_button')}
  </button>
{/if}

<style>
  .button--subscribe, .button--unsubscribe {
    display: flex;
    column-gap: 4px;
  }
</style>
