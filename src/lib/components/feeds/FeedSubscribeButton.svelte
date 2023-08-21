<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {agent, preferences} from "$lib/stores";

    export let _agent = $agent;
    export let feed;
    export let subscribed = false;

    let isProcessing = false;

    async function refreshSubscribe() {
        const res = await _agent.agent.api.app.bsky.actor.getPreferences();
        const getPreferences = res.data.preferences;
        const savedFeeds = getPreferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')[0]?.saved;
        subscribed = savedFeeds.includes(feed.uri);

        preferences.set(getPreferences);
    }

    async function subscribe() {
        isProcessing = true;
        const res = await _agent.agent.api.app.bsky.actor.getPreferences();
        const preferences = res.data.preferences;
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

        console.log(newPreferences)

        try {
            await _agent.agent.api.app.bsky.actor.putPreferences({preferences: newPreferences})
            await refreshSubscribe();
            isProcessing = false;
        } catch (e) {
            console.error(e)
            isProcessing = false;
        }
    }

    async function unsubscribe() {
        isProcessing = true;
        const res = await _agent.agent.api.app.bsky.actor.getPreferences();
        const preferences = res.data.preferences;
        const newPreferences = preferences.map(preference => {
            if (preference.$type === 'app.bsky.actor.defs#savedFeedsPref' && preference.saved) {
                preference.saved = preference.saved.filter(save => save !== feed.uri);
            }
            return preference;
        });

        try {
            await _agent.agent.api.app.bsky.actor.putPreferences({preferences: newPreferences})
            await refreshSubscribe();
            isProcessing = false;
        } catch (e) {
            console.error(e)
            isProcessing = false;
        }
    }
</script>

<div>
  {#if subscribed}
    <button class="button button--ss button--following" disabled={isProcessing} on:click={unsubscribe} data-unfollow-name="{$_('unsubscribe_button')}">
      {$_('subscribed_button')}
    </button>
  {:else}
    <button class="button button--ss" disabled={isProcessing} on:click={subscribe}>
      {$_('subscribe_button')}
    </button>
  {/if}
</div>