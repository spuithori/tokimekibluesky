<script lang="ts">
    import {agent, currentTimeline, globalUnique} from '$lib/stores';
    import DeckRow from "./DeckRow.svelte";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    const columnState = getColumnState();
    let unique = Symbol();

    if (!columnState.columns.length) {
        columnState.add({
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
        })
    }

    if (!columnState.columns[$currentTimeline]) {
        currentTimeline.set(0);
    }
</script>

<div class="single-wrap">
  {#key $globalUnique}
    <div class="single-timeline-wrap">
      {#key $currentTimeline}
        {#if (columnState.columns.length && columnState.columns[$currentTimeline])}
          <DeckRow
              column={columnState.columns[$currentTimeline]}
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