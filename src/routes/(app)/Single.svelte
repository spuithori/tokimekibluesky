<script lang="ts">
    import {agent, agentsByDid, currentTimeline} from '$lib/stores';
    import {page} from '$app/stores';
    import DeckRow from "./DeckRow.svelte";
    import ColumnResumePlaceholder from "$lib/components/column/ColumnResumePlaceholder.svelte";
    import ColumnsLoadError from "$lib/components/column/ColumnsLoadError.svelte";
    import ColumnErrorPanel from "$lib/components/column/ColumnErrorPanel.svelte";
    import {recordError} from "$lib/errorLog";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {publishState} from "$lib/classes/publishState.svelte";
    import {scrollDirection} from "$lib/scrollDirection";
    import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
    import {appState} from "$lib/classes/appState.svelte";

    const columnState = getColumnState();

    $effect(() => {
        if (columnState.isColumnsLoaded && !columnState.loadFailed && !columnState.columns.length) {
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
    });

    if (!columnState.columns[$currentTimeline]) {
        currentTimeline.set(0);
    }

    function handleScroll(event) {
      const scroll = scrollDirection(event.currentTarget, 80, (scrollDir) => {
        scrollDirectionState.direction = scrollDir;
      });
    }

    $effect(() => {
        localStorage.setItem('currentTimeline', JSON.stringify($currentTimeline));
    });

    let previousTimelineIndex: number | null = null;
    let shouldRestoreScroll = false;

    $effect.pre(() => {
        const currentIndex = $currentTimeline;

        if (previousTimelineIndex !== null && previousTimelineIndex !== currentIndex) {
            appState.singleColumnScrollPositions.set(previousTimelineIndex, window.scrollY);
            shouldRestoreScroll = true;
        }

        previousTimelineIndex = currentIndex;
    });

    $effect(() => {
        const currentIndex = $currentTimeline;

        if (shouldRestoreScroll) {
            shouldRestoreScroll = false;

            requestAnimationFrame(() => {
                const savedPosition = appState.singleColumnScrollPositions.get(currentIndex);
                if (savedPosition !== undefined) {
                    window.scrollTo(0, savedPosition);
                }
            });
        }
    });
</script>

<svelte:window onscroll={handleScroll}></svelte:window>

<div class="single-wrap" class:single-wrap--page={$page.url.pathname !== '/'} class:single-wrap--bottom={publishState.isBottom}>
  <div class="single-timeline-wrap">
    {#if columnState.loadFailed}
      <ColumnsLoadError></ColumnsLoadError>
    {/if}

    {#key $currentTimeline}
      {#if (columnState.columns.length && columnState.columns[$currentTimeline])}
        {@const gate = appState.getColumnResumeGate($agentsByDid, columnState.columns[$currentTimeline]?.did)}
        {#if gate !== 'mount'}
          <ColumnResumePlaceholder column={columnState.columns[$currentTimeline]}></ColumnResumePlaceholder>
        {:else}
          <svelte:boundary onerror={(error) => recordError(error, 'column')}>
            <DeckRow index={$currentTimeline}></DeckRow>

            {#snippet failed(error, reset)}
              <ColumnErrorPanel column={columnState.columns[$currentTimeline]} {reset}></ColumnErrorPanel>
            {/snippet}
          </svelte:boundary>
        {/if}
      {/if}
    {/key}
  </div>
</div>

<style lang="postcss">
    .single-wrap {
        border-left: var(--single-border);
        border-right: var(--single-border);
        min-height: 100vh;
        background-color: var(--single-bg-color, var(--bg-color-1));
        width: var(--single-column-width, var(--single-m-width));
        max-width: 100%;

        @media (max-width: 767px) {
            width: 100vw;
        }

        &--page {
            position: fixed;
            overflow: hidden;
            left: 402px;
            top: 0;
            right: 0;
            margin: auto;
            min-height: 100dvh;

            @media (max-width: 767px) {
                left: 0;
            }
        }

        &--bottom {
            left: 64px;

            @media (max-width: 767px) {
                left: 0;
            }
        }
    }
</style>