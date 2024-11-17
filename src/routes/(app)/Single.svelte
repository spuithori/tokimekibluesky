<script lang="ts">
    import {agent, currentTimeline, settings} from '$lib/stores';
    import {page} from '$app/stores';
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

<div class="single-wrap" class:single-wrap--page={$page.url.pathname !== '/'} class:single-wrap--bottom={$settings.design?.publishPosition === 'bottom'}>
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
</div>

<style lang="postcss">
    .single-wrap {
        border-left: 1px solid var(--border-color-2);
        border-right: 1px solid var(--border-color-2);
        min-height: 100vh;
        background-color: var(--bg-color-1);

        &--page {
            position: fixed;
            overflow: hidden;
            left: 402px;
            top: 0;
            right: 0;
            margin: auto;
            min-height: 100dvh;
            max-width: 528px;

            @media (max-width: 767px) {
                left: 0;
            }
        }

        &--bottom {
            left: 70px;
            max-width: 626px;
        }
    }
</style>