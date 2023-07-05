<script lang="ts">
    import NotificationTimeline from "./NotificationTimeline.svelte";
    import TimelineSelector from "./TimelineSelector.svelte";
    import DeckSettingsModal from "$lib/components/deck/DeckSettingsModal.svelte";

    export let column;
    export let index;
    let isSettingsOpen = false;
    let unique = Symbol();

    console.log(index);

    function handleHeaderClick(el) {
        el.scroll({
            top: 0,
            left: 0,
            behavior: 'smooth',
        })
    }

    function handleSettingsClick() {
        isSettingsOpen = !isSettingsOpen;

        if (!isSettingsOpen) {
            unique = Symbol();
        }
    }
</script>

<div class="deck-row">
    <div role="button" aria-label="Back to top." class="deck-row__title" on:click={() => {handleHeaderClick(column.scrollElement)}}>{column.algorithm.name}</div>

    {#if (column.algorithm.type !== 'notification')}
        <button class="deck-row-settings-button" on:click={handleSettingsClick}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
    {/if}

    {#if isSettingsOpen}
        <DeckSettingsModal {column} {index} on:close={handleSettingsClick}></DeckSettingsModal>
    {/if}

    {#key unique}
        <div class="deck-row__content" bind:this={column.scrollElement}>
            {#if (column.algorithm.type === 'notification')}
                <NotificationTimeline column={column} index={index}></NotificationTimeline>
            {:else}
                <TimelineSelector
                        column={column}
                        index={index}
                ></TimelineSelector>
            {/if}
        </div>
    {/key}
</div>

<style lang="postcss">
    .deck-row {
        width: 450px;
        flex-shrink: 0;
        height: 100%;
        position: relative;
        padding-top: 40px;

        @media (max-width: 767px) {
            width: 100vw;
            scroll-snap-align: start;
            box-shadow: none;
        }

        &__content {
            height: calc(100% - 40px);
            overflow-y: scroll;
            box-shadow: 0 0 10px var(--box-shadow-color-1);
            background-color: var(--bg-color-1);
            scrollbar-color: var(--primary-color) var(--bg-color-3);

            &::-webkit-scrollbar {
                width: 6px;
            }

            &::-webkit-scrollbar-thumb {
                background: var(--primary-color);
                border-radius: 6px;
            }

            &::-webkit-scrollbar-track {
                background: var(--bg-color-3);
                border-radius: 6px;
            }
        }

        &__title {
            text-align: center;
            font-weight: 900;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 40px;
            position: sticky;
            top: 36px;
            background-color: var(--bg-color-1);
            z-index: 10;
            border-radius: 10px 10px 0 0;
            letter-spacing: .025em;
            cursor: pointer;

            @media (max-width: 767px) {
                font-size: 15px;
            }
        }
    }

    .deck-row-settings-button {
        position: absolute;
        width: 30px;
        height: 30px;
        display: grid;
        place-content: center;
        left: 15px;
        top: 45px;
        z-index: 21;
        border-radius: 2px;

        &:hover {
            background-color: var(--bg-color-2);
        }
    }
</style>