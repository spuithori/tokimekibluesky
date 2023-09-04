<script lang="ts">
    import NotificationTimeline from "./NotificationTimeline.svelte";
    import TimelineSelector from "./TimelineSelector.svelte";
    import DeckSettingsModal from "$lib/components/deck/DeckSettingsModal.svelte";
    import ThreadTimeline from "./ThreadTimeline.svelte";
    import {agent, agents, columns} from "$lib/stores";
    import {getAccountIdByDid} from "$lib/util";
    import ColumnAgentMissing from "$lib/components/column/ColumnAgentMissing.svelte";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";
    import ColumnButtons from "$lib/components/column/ColumnButtons.svelte";
    import ColumnRefreshButton from "$lib/components/column/ColumnRefreshButton.svelte";
    import {settings} from "$lib/stores.js";
    import ColumnAutoScrolling from "$lib/components/column/ColumnAutoScrolling.svelte";
    import ColumnIconPicker from "$lib/components/column/ColumnIconPicker.svelte";
    import {iconMap} from "$lib/columnIcons";

    export let column;
    export let index;

    const uniqueAgent = $agents.get(getAccountIdByDid($agents, column.did));
    let _agent = uniqueAgent || $agent;
    let isSettingsOpen = false;
    let unique = Symbol();
    let isTopScrolling;
    let isScrollPaused = false;
    let scrollId;
    let isIconPickerOpen = false;

    function handleHeaderClick(el, event) {
        if (!el.scroll) {
            return false;
        }

        isTopScrolling = true;

        el.scroll({
            top: 0,
            left: 0,
            behavior: 'smooth',
        });

        setTimeout(() => {
            isTopScrolling = false;
        }, 1000);
    }

    function handleSettingsClick() {
        isSettingsOpen = !isSettingsOpen;

        if (!isSettingsOpen) {
            unique = Symbol();
        }
    }

    function handleMouseEnter() {
        isScrollPaused = true;
    }

    function handleMouseLeave() {
        isScrollPaused = false;
    }

    function handleIconChange(event) {
        $columns[index].settings.icon = event.detail.icon;
        isIconPickerOpen = false;
    }
</script>

<div
    class="deck-row deck-row--{column.settings?.width || 'medium'}"
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
>
    <div class="deck-heading">
        <div class="deck-heading__icon">
            <button class="deck-heading__icon-picker-button" on:click={() => {isIconPickerOpen = !isIconPickerOpen}}>
                {#if column.settings?.icon}
                    <svelte:component this={iconMap.get(column.settings.icon)} color="var(--text-color-3)"></svelte:component>
                {:else}
                    <ColumnIcon type={column.algorithm.type}></ColumnIcon>
                {/if}
            </button>
        </div>

        <div
            role="button"
            class="deck-heading__scroll-area"
            on:click={(event) => {handleHeaderClick($settings.design?.layout === 'decks' ? column.scrollElement : document.querySelector(':root'), event)}}
            aria-label="Back to top."
        >
            <div class="deck-heading__title">
                {column.algorithm.name} <span class="deck-heading__subhead">{column.handle}</span>
            </div>
        </div>

        <div class="deck-heading__buttons">
            {#if column.scrollElement && column.scrollElement instanceof HTMLElement}
                {#if column.algorithm.type !== 'thread' && column.algorithm.type !== 'realtime'}
                    <ColumnRefreshButton
                        column={column}
                        index={index}
                        {_agent}
                        bind:unique={unique}
                    ></ColumnRefreshButton>
                {/if}
            {/if}

            <ColumnButtons {column} {index} {_agent}></ColumnButtons>

            <button class="deck-row-settings-button" on:click={handleSettingsClick}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-2"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
            </button>
        </div>
    </div>

    {#if isSettingsOpen}
        <DeckSettingsModal {column} {index} on:close={handleSettingsClick}></DeckSettingsModal>
    {:else}
        {#key unique}
            {#if uniqueAgent}
                <div class="deck-row__content" bind:this={column.scrollElement}>
                    {#if (column.algorithm.type === 'notification')}
                        <NotificationTimeline column={column} index={index} {_agent} ></NotificationTimeline>
                    {:else if (column.algorithm.type === 'thread')}
                        <ThreadTimeline column={column} index={index} {_agent}></ThreadTimeline>
                    {:else}
                        <TimelineSelector
                            column={column}
                            index={index}
                            {_agent}
                        ></TimelineSelector>
                    {/if}
                </div>
            {:else}
                <div class="deck-row__content">
                    <ColumnAgentMissing {column}></ColumnAgentMissing>
                </div>
            {/if}
        {/key}
    {/if}

    {#if isIconPickerOpen}
        <ColumnIconPicker on:change={handleIconChange} current={column.settings?.icon}></ColumnIconPicker>
    {/if}
</div>

{#if column.scrollElement && column.scrollElement instanceof HTMLElement}
    <ColumnAutoScrolling
        column={column}
        index={index}
        {_agent}
        {isTopScrolling}
        {isScrollPaused}
        {unique}
    ></ColumnAutoScrolling>
{/if}

<style lang="postcss">
    .deck-row {
        width: 450px;
        flex-shrink: 0;
        height: 100%;
        position: relative;
        border-radius: 10px;
        border: 1px solid var(--border-color-2);
        overflow: hidden;

        @media (max-width: 767px) {
            width: 100vw;
            scroll-snap-align: start;
            box-shadow: none;
        }

        &__content {
            height: calc(100% - 52px);
            overflow-y: scroll;
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

        &--xxs {
            width: 280px;

            @media (max-width: 767px) {
                width: 100vw;
            }
        }

        &--xs {
            width: 320px;

            @media (max-width: 767px) {
                width: 100vw;
            }
        }

        &--small {
            width: 350px;

            @media (max-width: 767px) {
                width: 100vw;
            }
        }

        &--medium {
            width: 400px;

            @media (max-width: 767px) {
                width: 100vw;
            }
        }

        &--large {
            width: 450px;

            @media (max-width: 767px) {
                width: 100vw;
            }
        }

        &--xl {
            width: 500px;

            @media (max-width: 767px) {
                width: 100vw;
            }
        }

        &--xxl {
            width: 550px;

            @media (max-width: 767px) {
                width: 100vw;
            }
        }
    }

    .deck-heading {
        padding: 0 8px;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 4px;
        height: 52px;
        position: sticky;
        top: 0;
        background-color: var(--bg-color-1);
        z-index: 21;
        border-bottom: 1px solid var(--border-color-2);
        border-radius: 10px 10px 0 0;
        min-width: 0;

        @media (max-width: 767px) {
            transition: top .2s ease-in-out;
        }

        &__scroll-area {
            cursor: pointer;
            flex: 1;
            min-width: 0;
        }

        &__icon {
            width: 36px;
            height: 36px;
            border-radius: 5px;
            background-color: var(--bg-color-3);
            display: grid;
            place-content: center;
            flex-shrink: 0;
        }

        &__title {
            font-weight: 900;
            font-size: 14px;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: center;
            letter-spacing: .05em;
            line-height: 1.2;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;

            @media (max-width: 767px) {
                font-size: 14px;
            }
        }

        &__subhead {
            font-size: 12px;
            color: var(--text-color-3);
            font-weight: bold;
            letter-spacing: .025em;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
        }

        &__buttons {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 4px;
        }
    }

    .deck-row-settings-button {
        width: 40px;
        height: 40px;
        display: grid;
        place-content: center;
        z-index: 21;
        border-radius: 2px;

        &:hover {
            background-color: var(--bg-color-2);
        }
    }
</style>