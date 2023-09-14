<script lang="ts">
    import {agent, currentTimeline, columns, globalUnique} from '$lib/stores';
    import {liveQuery} from "dexie";
    import {db} from "$lib/db";
    import DeckRow from "./DeckRow.svelte";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";

    let isAlgoNavOpen = false;
    let bookmarks = liveQuery(() => db.bookmarks.toArray());
    let unique = Symbol();
    let customFeeds;

    if ($agent) {
        customFeeds = $agent.getSavedFeeds()
    }

    if (!$columns.length) {
        columns.set([{
            id: self.crypto.randomUUID(),
            algorithm: {
                type: 'default',
                name: 'HOME'
            },
            style: 'default',
            did: $agent.did(),
            handle: $agent.handle(),
            unreadCount: 0,
            settings: defaultDeckSettings,
            data: {
                feed: [],
                cursor: '',
            }
        }]);
    }

    if (!$columns[$currentTimeline]) {
        currentTimeline.set(0);
    }

    $: {
        if (isAlgoNavOpen) {
            document.body.classList.add('scroll-lock');
        } else {
            document.body.classList.remove('scroll-lock');
        }
    }
</script>

<div class="single-wrap">
  {#key $globalUnique}
    <div class="single-timeline-wrap">
      {#key $currentTimeline}
        {#if ($columns.length && $columns[$currentTimeline])}
          <DeckRow
              column={$columns[$currentTimeline]}
              index={$currentTimeline}
          ></DeckRow>
        {/if}
      {/key}
    </div>
  {/key}
</div>

<style lang="postcss">
    .single-wrap {
        border-left: 1px solid var(--border-color-2);
        border-right: 1px solid var(--border-color-2);
        min-height: 100vh;
        background-color: var(--bg-color-1);
    }
</style>