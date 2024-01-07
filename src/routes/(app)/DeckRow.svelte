<script lang="ts">
    import NotificationTimeline from "./NotificationTimeline.svelte";
    import TimelineSelector from "./TimelineSelector.svelte";
    import DeckSettingsModal from "$lib/components/deck/DeckSettingsModal.svelte";
    import ThreadTimeline from "./ThreadTimeline.svelte";
    import {agent, agents, columns, direction, intersectingIndex} from "$lib/stores";
    import {getAccountIdByDid} from "$lib/util";
    import ColumnAgentMissing from "$lib/components/column/ColumnAgentMissing.svelte";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";
    import ColumnButtons from "$lib/components/column/ColumnButtons.svelte";
    import ColumnRefreshButton from "$lib/components/column/ColumnRefreshButton.svelte";
    import {settings} from "$lib/stores.js";
    import ColumnAutoScrolling from "$lib/components/column/ColumnAutoScrolling.svelte";
    import ColumnIconPicker from "$lib/components/column/ColumnIconPicker.svelte";
    import {iconMap} from "$lib/columnIcons";
    import {scrollDirection} from "$lib/scrollDirection";
    import {onDestroy, onMount} from "svelte";

    export let column;
    export let index;
    export let unique = Symbol();

    const uniqueAgent = $agents.get(getAccountIdByDid($agents, column.did));
    let _agent = uniqueAgent || $agent;
    let isSettingsOpen = false;
    let isTopScrolling;
    let isScrollPaused = false;
    let isIconPickerOpen = false;
    let observer;

    if (!column.data) {
        column.data = {
            feed: [],
            cursor: '',
        }
    }

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
        $columns[index].settings = {...$columns[index].settings, icon: event.detail.icon};
        isIconPickerOpen = false;
    }

    function handleScroll(event) {
        const scroll = scrollDirection(event);

        if (scroll) {
            direction.set(scroll);
        }
    }

    function intersect(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                intersectingIndex.set(index);
                direction.set('up');
            }
        })
    }

    onMount(() => {
        const options = {
            threshold: 0.5,
        }
        observer = new IntersectionObserver(intersect, options);
        if (column.scrollElement) {
            observer.observe(column.scrollElement);
        }

        $columns[index].lastRefresh = new Date().toISOString();
    })

    onDestroy(() => {
        try {
            observer.unobserve(column.scrollElement);
        } catch (e) {

        }
    })
</script>

<div
    class="deck-row deck-row--{column.settings?.width || 'medium'}"
    class:deck-row--decks={$settings.design?.layout === 'decks'}
    class:deck-row--single={$settings.design?.layout === 'default'}
    class:deck-row--compact={$settings.design?.publishPosition === 'bottom'}
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
    bind:this={column.scrollElement}
    on:scroll={handleScroll}
>
    <div class="deck-heading">
        <div class="deck-heading__icon">
            <button class="deck-heading__icon-picker-button" on:click={() => {isIconPickerOpen = !isIconPickerOpen}}>
                {#if column.settings?.icon}
                    <svelte:component this={iconMap.get(column.settings.icon)} color="var(--deck-heading-icon-color)"></svelte:component>
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
            <ColumnRefreshButton
                column={column}
                index={index}
                {_agent}
                bind:unique={unique}
            ></ColumnRefreshButton>

            <ColumnButtons {column} {index} {_agent}></ColumnButtons>

            <button class="deck-row-settings-button" on:click={handleSettingsClick}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-2"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
            </button>
        </div>
    </div>

    {#if isSettingsOpen}
        <DeckSettingsModal {column} {index} {_agent} layout={$settings.design?.layout} on:close={handleSettingsClick}></DeckSettingsModal>
    {:else}
        {#key unique}
            {#if uniqueAgent}
                <div class="deck-row__content">
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
        position: relative;
        border-radius: var(--deck-border-radius);
        border: var(--deck-border-width) solid var(--deck-border-color);
        box-shadow: var(--deck-box-shadow);
        background-color: var(--deck-content-bg-color);
        overflow-y: scroll;
        height: 100%;
        scrollbar-color: var(--scroll-bar-color) var(--scroll-bar-bg-color);
        scrollbar-width: thin;
        backdrop-filter: var(--deck-content-backdrop-filter);
        border-right: var(--deck-border-right, var(--deck-border-width) solid var(--deck-border-color));

        &::-webkit-scrollbar {
            width: 6px;
        }

        &::-webkit-scrollbar-thumb {
            background: var(--scroll-bar-color);
            border-radius: 6px;
        }

        &::-webkit-scrollbar-track {
            background: var(--scroll-bar-bg-color);
            border-radius: 6px;
            margin-top: 52px;

            @media (max-width: 767px) {
                margin-top: 98px;
            }
        }

        @media (max-width: 767px) {
            width: 100vw;
            scroll-snap-align: start;
            scroll-snap-stop: always;
            box-shadow: none;
            padding-top: 46px;
            height: calc(100dvh);
        }

        &__content {

        }

        &--xxs {
            width: var(--deck-xxs-width);

            @media (max-width: 767px) {
                width: 100vw;
            }
        }

        &--xs {
            width: var(--deck-xs-width);

            @media (max-width: 767px) {
                width: 100vw;
            }
        }

        &--small {
            width: var(--deck-s-width);

            @media (max-width: 767px) {
                width: 100vw;
            }
        }

        &--medium {
            width: var(--deck-m-width);

            @media (max-width: 767px) {
                width: 100vw;
            }
        }

        &--large {
            width: var(--deck-l-width);

            @media (max-width: 767px) {
                width: 100vw;
            }
        }

        &--xl {
            width: var(--deck-xl-width);

            @media (max-width: 767px) {
                width: 100vw;
            }
        }

        &--xxl {
            width: var(--deck-xxl-width);

            @media (max-width: 767px) {
                width: 100vw;
            }
        }

        &--decks {
            .deck-row__content {

            }

            .deck-heading {

            }
        }

        &--single {
            overflow-y: visible;
            height: auto;
            border: none;

            .deck-heading__icon {
                margin-left: 0;
            }
        }
    }

    .deck-heading {
        padding: 0 8px;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 4px;
        height: var(--deck-heading-height);
        position: sticky;
        top: 0;
        left: 0;
        right: 0;
        background-color: var(--deck-heading-bg-color);
        z-index: 21;
        border-bottom: 1px solid var(--deck-border-color);
        border-radius: var(--deck-border-radius) var(--deck-border-radius) 0 0;
        min-width: 0;
        backdrop-filter: var(--deck-heading-backdrop-filter);

        @media (max-width: 767px) {
            transition: all .2s ease-in-out;
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
            background-color: var(--deck-heading-icon-bg-color);
            display: grid;
            place-content: center;
            flex-shrink: 0;
            margin-left: 10px;

            @media (max-width: 767px) {
                margin-left: 0;
            }
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
            color: var(--deck-heading-title-color);

            @media (max-width: 767px) {
                font-size: 14px;
            }
        }

        &__subhead {
            font-size: 12px;
            color: var(--deck-heading-subhead-color);
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