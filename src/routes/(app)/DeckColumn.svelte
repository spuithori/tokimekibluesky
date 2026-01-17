<script lang="ts">
    import NotificationTimeline from "./NotificationTimeline.svelte";
    import DeckSettingsModal from "$lib/components/deck/DeckSettingsModal.svelte";
    import ThreadTimeline from "./ThreadTimeline.svelte";
    import {settings} from "$lib/stores";
    import ColumnAgentMissing from "$lib/components/column/ColumnAgentMissing.svelte";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";
    import ColumnRefreshButton from "$lib/components/column/ColumnRefreshButton.svelte";
    import ColumnIconPicker from "$lib/components/column/ColumnIconPicker.svelte";
    import {iconMap} from "$lib/columnIcons";
    import ChatTimeline from "./ChatTimeline.svelte";
    import ChatListTimeline from "./ChatListTimeline.svelte";
    import Timeline from "./Timeline.svelte";
    import BookmarkTimeline from "./BookmarkTimeline.svelte";
    import ListTimeline from "./ListTimeline.svelte";
    import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
    import {scrollDirection} from "$lib/scrollDirection";
    import {Settings2, CheckCheck, GripVertical} from "lucide-svelte";
    import { createLongPress } from "$lib/longpress";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    interface Props {
        column: any;
        _agent: any;
        index: number;
        isJunk?: boolean;
        isSplit?: boolean;
        unique?: symbol;
        isTopScrolling?: boolean;
        isScrollPaused?: boolean;
        onRefresh?: () => void;
        onForceRefresh?: () => void;
        onSettingsChange?: (clear: boolean) => void;
        onScrollDirectionChange?: (direction: string) => void;
        showDragHandle?: boolean;
    }

    let {
        column,
        _agent,
        index,
        isJunk = false,
        isSplit = false,
        unique = $bindable(Symbol()),
        isTopScrolling = $bindable(false),
        isScrollPaused = false,
        onRefresh,
        onForceRefresh,
        onSettingsChange,
        onScrollDirectionChange,
        showDragHandle = false,
    }: Props = $props();

    const columnState = getColumnState(isJunk);

    let isSettingsOpen = $state(false);
    let isIconPickerOpen = $state(false);
    let refreshEl = $state();
    let isRefreshing = $state(false);

    function handleHeaderClick(el: HTMLElement | null) {
        if (!el?.scroll) return;
        if (column.algorithm?.type === 'chat' || column.algorithm?.type === 'chatList') return;

        isTopScrolling = true;

        if (el.scrollTop === 0) {
            handleRefresh();
        } else {
            el.scroll({
                top: 0,
                left: 0,
                behavior: 'smooth',
            });
        }

        setTimeout(() => {
            isTopScrolling = false;
        }, 1000);
    }

    async function handleRefresh(event?: any) {
        try {
            await refreshEl?.refresh();
            if (event?.complete) {
                event.complete();
            }
            onRefresh?.();
        } catch (e) {
            console.error(e);
        }
    }

    function handleForceRefresh() {
        isRefreshing = true;
        column.data.feed = [];
        column.data.cursor = undefined;

        if (column.algorithm?.type === 'notification') {
            column.data.feedPool = [];
            column.data.notifications = [];
        }

        unique = Symbol();
        onForceRefresh?.();

        setTimeout(() => {
            isRefreshing = false;
        }, 2000);
    }

    function handleSettingsClick(clear = false) {
        isSettingsOpen = !isSettingsOpen;

        if (clear) {
            column.data.feed = [];
            column.data.cursor = undefined;

            if (column.algorithm?.type === 'notification') {
                column.data.feedPool = [];
                column.data.notifications = [];
            }

            unique = Symbol();
            onSettingsChange?.(clear);
        }
    }

    function handleIconChange(icon: string) {
        if (!column.settings) {
            column.settings = {};
        }
        column.settings.icon = icon;
        isIconPickerOpen = false;
    }

    function handleScroll(event: Event) {
        if (!isJunk && !isSplit) {
            scrollDirection(event.currentTarget as HTMLElement, 80, (scrollDir) => {
                scrollDirectionState.direction = scrollDir;
                onScrollDirectionChange?.(scrollDir);
            });
        }
    }

    export function getRefreshEl() {
        return refreshEl;
    }

    export function refresh() {
        return handleRefresh();
    }

    export function forceRefresh() {
        return handleForceRefresh();
    }
</script>

<div class="deck-column-wrapper" class:deck-column-wrapper--split={isSplit}>

<div class="deck-column-header" class:deck-column-header--split={isSplit}>
    {#if showDragHandle}
        <div class="deck-drag-area">
            <GripVertical size="20" color="var(--border-color-1)"></GripVertical>
        </div>
    {/if}

    <div class="deck-column-header__icon">
        <button class="deck-column-header__icon-picker-button" aria-label="Change icon" onclick={() => {isIconPickerOpen = !isIconPickerOpen}}>
            {#if column.settings?.icon}
                {@const SvelteComponent = iconMap.get(column.settings.icon)}
                <SvelteComponent color="var(--deck-heading-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></SvelteComponent>
            {:else}
                <ColumnIcon type={column.algorithm?.type}></ColumnIcon>
            {/if}
        </button>
    </div>

    <div
        role="button"
        class="deck-column-header__scroll-area"
        onclick={() => {handleHeaderClick(column.scrollElement)}}
        use:createLongPress={{callback: handleForceRefresh, duration: 500}}
        aria-label="Back to top."
    >
        <div class="deck-column-header__title">
            {column.algorithm?.name} <span class="deck-column-header__subhead">{column.handle}</span>
        </div>
    </div>

    <div class="deck-column-header__buttons">
        {#if column.algorithm?.type === 'notification' && !isJunk}
            <button class="deck-column-header__action-button only-pc" onclick={handleRefresh}>
                <CheckCheck color="var(--deck-row-settings-button-color, var(--text-color-3))" strokeWidth="var(--icon-stroke-width, 2px)"></CheckCheck>
            </button>
        {/if}

        <ColumnRefreshButton
            {index}
            {_agent}
            bind:unique={unique}
            bind:this={refreshEl}
            {isJunk}
            bind:isRefreshing={isRefreshing}
            {isSplit}
            {column}
        ></ColumnRefreshButton>

        {#if !isJunk}
            <button class="deck-column-header__settings-button" class:deck-column-header__settings-button--open={isSettingsOpen} aria-label="Settings" onclick={() => {isSettingsOpen = !isSettingsOpen}}>
                <Settings2 color="var(--deck-row-settings-button-color, var(--text-color-3))" strokeWidth="var(--icon-stroke-width, 2px)"></Settings2>
            </button>
        {/if}
    </div>

    {#if isIconPickerOpen}
        <ColumnIconPicker onchange={handleIconChange} onclose={() => {isIconPickerOpen = false}} current={column.settings?.icon}></ColumnIconPicker>
    {/if}
</div>

{#if isSettingsOpen}
    <DeckSettingsModal {index} {_agent} layout={$settings.design?.layout} onclose={handleSettingsClick} {isSplit} {column}></DeckSettingsModal>
{/if}

<div
    class="deck-column-content"
    class:deck-column-content--split={isSplit}
    bind:this={column.scrollElement}
    onscroll={handleScroll}
>
    {#if _agent}
        {#if column.algorithm?.type === 'notification'}
            <NotificationTimeline {index} {isJunk} {_agent} {unique} {isSplit} {column}></NotificationTimeline>
        {:else if column.algorithm?.type === 'thread'}
            {#key unique}
                <ThreadTimeline {index} {_agent} {isJunk}></ThreadTimeline>
            {/key}
        {:else if column.algorithm?.type === 'chat'}
            <ChatTimeline {index} {_agent} {unique} {isJunk} onrefresh={handleRefresh} {isSplit} {column}></ChatTimeline>
        {:else if column.algorithm?.type === 'chatList'}
            <ChatListTimeline {index} {_agent} {unique} {isJunk} onrefresh={handleRefresh} {isSplit} {column}></ChatListTimeline>
        {:else if column.algorithm?.type === 'list'}
            {#key unique}
                <ListTimeline {index} {_agent} {isJunk} {unique} {isSplit} {column}></ListTimeline>
            {/key}
        {:else if column.algorithm?.type === 'bookmark'}
            <BookmarkTimeline {index} {_agent} {isJunk} {unique} {isSplit} {column}></BookmarkTimeline>
        {:else}
            <Timeline {index} {_agent} {isJunk} {unique} {isSplit} {column}></Timeline>
        {/if}
    {:else}
        <ColumnAgentMissing {column}></ColumnAgentMissing>
    {/if}
</div>

</div>

<style lang="postcss">
    .deck-column-wrapper {
        &--split {
            display: flex;
            flex-direction: column;
            height: 100%;
            min-height: 0;
        }
    }

    .deck-drag-area {
        width: 24px;
        height: 52px;
        display: grid;
        place-content: center;
        position: absolute;
        left: 0;
        top: 0;
        z-index: 100;
        cursor: grab;

        @media (max-width: 767px) {
            display: none;
        }
    }

    .deck-column-header {
        padding: 0 8px;
        margin: 0 1px;
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
        z-index: 10;
        border-bottom: 1px solid var(--deck-border-color);
        border-radius: var(--deck-border-radius) var(--deck-border-radius) 0 0;
        min-width: 0;
        backdrop-filter: var(--deck-heading-backdrop-filter);
        flex-shrink: 0;

        &--split {
            z-index: 5;
            border-radius: 0;
            position: relative;
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
            font-weight: bold;
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
            user-select: none;
        }

        &__subhead {
            font-size: 12px;
            color: var(--deck-heading-subhead-color);
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

        &__settings-button {
            width: 40px;
            height: 40px;
            display: grid;
            place-content: center;
            z-index: 21;
            border-radius: var(--border-radius-2);

            &:hover {
                background-color: var(--bg-color-2);
            }

            &--open {
                background-color: var(--primary-color);
                --deck-row-settings-button-color: var(--bg-color-1);

                &:hover {
                    background-color: var(--primary-color);
                }
            }
        }

        &__action-button {
            width: 40px;
            height: 40px;
            display: grid;
            place-content: center;
        }
    }

    .deck-column-content {
        position: relative;
        min-height: calc(100% - var(--deck-heading-height));

        &--split {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;

            @supports (-moz-appearance: none) {
                scrollbar-color: var(--scroll-bar-color) var(--scroll-bar-bg-color);
                scrollbar-width: thin;
            }

            &::-webkit-scrollbar {
                width: 6px;
            }

            &::-webkit-scrollbar-thumb {
                background: var(--scroll-bar-color);
                border-radius: var(--scroll-bar-border-radius, 0);
            }

            &::-webkit-scrollbar-track {
                background: var(--scroll-bar-bg-color);
            }
        }
    }
</style>
