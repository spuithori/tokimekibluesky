<script lang="ts">
    import {_} from 'svelte-i18n';
    import NotificationTimeline from "./NotificationTimeline.svelte";
    import TimelineSelector from "./TimelineSelector.svelte";
    import DeckSettingsModal from "$lib/components/deck/DeckSettingsModal.svelte";
    import ThreadTimeline from "./ThreadTimeline.svelte";
    import {agent, agents, columns, direction, intersectingIndex, isChatColumnFront} from "$lib/stores";
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
    import {toast} from "svelte-sonner";
    import ChatTimeline from "./ChatTimeline.svelte";
    import {backgroundsMap} from "$lib/columnBackgrounds";
    import {draggable, type DragOptions} from "@neodrag/svelte";
    import { createLongPress } from 'svelte-interactions';
    const { longPressAction } = createLongPress();

    export let column;
    export let index = 0;
    export let unique = Symbol();
    export let isJunk = false;
    export let name = undefined;

    const uniqueAgent = $agents.get(getAccountIdByDid($agents, column.did));
    let _agent = uniqueAgent || $agent;
    let isSettingsOpen = false;
    let isTopScrolling;
    let isScrollPaused = false;
    let isIconPickerOpen = false;
    let observer;
    let isFiltered = false;
    let isColumnAlreadyAdded = false;
    let hideReply;
    let hideRepost;
    let refresh;
    let isDragging = false;
    let reorderIndex = index;
    let isRefreshing = false;

    let dragOptions: DragOptions = {
        axis: 'x',
        handle: '.deck-drag-area',
        position: {
            x: 0,
            y: 0,
        },
        recomputeBounds: {
            dragStart: true,
            drag: true,
            dragEnd: true,
        },
        cancel: '.grabber'
    };

    $: if (isFiltered) {
        hideReply = 'me';
        hideRepost = 'none';
    } else {
        hideReply = 'all';
        hideRepost = 'all';
    }

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

        if (column.algorithm?.type === 'chat') {
            return false;
        }

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
        const scroll = scrollDirection(event.currentTarget, 80, (scrollDir) => {
            direction.set(scrollDir);
        });
    }

    function intersect(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                intersectingIndex.set(index);
                isChatColumnFront.set($columns[index].algorithm?.type === 'chat');
                direction.set('up');
            }
        })
    }

    function columnAddFromJunk() {
        const _column = {
            ...column,
            id: self.crypto.randomUUID(),
        }

        _column.algorithm.name = name || column.algorithm.name;

        try {
            $columns = [...$columns, _column];

            toast.success($_('column_added'));
            isColumnAlreadyAdded = true;
        } catch (e) {
            console.error(e);
            toast.error('Error: ' + e);
        }
    }

    async function handleRefresh() {
        await refresh();
    }

    function handleChangePopup() {
        if (column.settings.isPopup) {
            $columns[index].settings = {...$columns[index].settings, isPopup: false};
        } else {
            $columns[index].settings = {...$columns[index].settings, isPopup: true};
        }
    }

    onMount(() => {
        if (!isJunk) {
            const options = {
                threshold: 0.5,
            }
            observer = new IntersectionObserver(intersect, options);
            if (column.scrollElement) {
                observer.observe(column.scrollElement);
            }

            $columns[index].lastRefresh = new Date().toISOString();
        }
    })

    onDestroy(() => {
        try {
            observer.unobserve(column.scrollElement);
        } catch (e) {

        }
    })

    function handleDragStart(e) {
        isDragging = true;
    }

    function handleDragEnd(e) {
        console.log(e.detail)

        dragOptions.position = {
            x: 0,
            y: 0,
        }

        $columns.forEach(_column => {
            if (_column.scrollElement) {
                _column.scrollElement.style.transform = 'translate3d(0, 0, 0)';
            }
        })

        $columns = moveElement($columns, index, reorderIndex);

        setTimeout(() => {
            isDragging = false;
        }, 350)
    }

    async function handleDragging(e) {
        const x = e.detail.rootNode.getBoundingClientRect().left;

        if (Math.sign(e.detail.offsetX) === 1) {
            const prevColumn = $columns[reorderIndex]?.scrollElement;
            const nextColumn = $columns[reorderIndex + 1]?.scrollElement;

            if (reorderIndex < index) {
                reorderIndex = index;
            }

            if (Math.abs(x) > nextColumn?.getBoundingClientRect().left) {
                nextColumn.style.transform = `translate3d(${column.scrollElement.offsetWidth * -1}px, 0, 0)`;
                reorderIndex = reorderIndex + 1;
            }

            if (Math.abs(x) < prevColumn.getBoundingClientRect().left) {
                prevColumn.style.transform = 'translate3d(0, 0, 0)';
                reorderIndex = reorderIndex - 1;
            }
        } else if (Math.sign(e.detail.offsetX) === -1) {
            const prevColumn = $columns[reorderIndex - 1]?.scrollElement;
            const nextColumn = $columns[reorderIndex]?.scrollElement;

            if (reorderIndex > index) {
                reorderIndex = index;
            }

            if (Math.abs(x) < prevColumn?.getBoundingClientRect().left) {
                prevColumn.style.transform = `translate3d(${column.scrollElement.offsetWidth}px, 0, 0)`;
                reorderIndex = reorderIndex - 1;
            }

            if (Math.abs(x) > nextColumn.getBoundingClientRect().left) {
                nextColumn.style.transform = 'translate3d(0, 0, 0)';
                reorderIndex = reorderIndex + 1;
            }
        } else {
            reorderIndex = index;
        }
    }

    function moveElement(arr, fromIndex, toIndex) {
        const result = [...arr];
        const element = result.splice(fromIndex, 1)[0];
        result.splice(toIndex, 0, element);
        return result;
    }

    function forceRefresh() {
        isRefreshing = true;
        column.data.feed = [];
        column.data.cursor = undefined;

        if (column.algorithm.type === 'notification') {
            column.data.feedPool = [];
            column.data.notificationGroup = [];
        }

        unique = Symbol();

        setTimeout(() => {
            isRefreshing = false;
        }, 2000);
    }
</script>

<div
    class="deck-row deck-row--{column.settings?.width || 'medium'}"
    class:deck-row--popup={column.settings?.isPopup === true}
    class:deck-row--bg={column.settings?.background}
    class:deck-row--decks={$settings.design?.layout === 'decks'}
    class:deck-row--single={$settings.design?.layout === 'default'}
    class:deck-row--compact={$settings.design?.publishPosition === 'bottom'}
    class:deck-row--junk={isJunk}
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
    bind:this={column.scrollElement}
    on:scroll|passive={handleScroll}
    style:background-image={column.settings?.background ? `url(${backgroundsMap.get(column.settings.background).url})` : 'none'}
    class:dragging={isDragging}
    use:draggable={dragOptions}
    on:neodrag:start={handleDragStart}
    on:neodrag:end={handleDragEnd}
    on:neodrag={handleDragging}
>
    <div class="deck-heading" class:deck-heading--sticky={isJunk && column.algorithm?.type === 'thread'}>
        {#if (!isJunk)}
            {#if !column?.settings?.isPopup && $settings.design?.layout === 'decks'}
                <div class="deck-drag-area">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--border-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grip-vertical"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                </div>
            {/if}

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
                    use:longPressAction
                    on:longpress={forceRefresh}
                    aria-label="Back to top."
            >
                <div class="deck-heading__title">
                    {column.algorithm.name} <span class="deck-heading__subhead">{column.handle}</span>
                </div>
            </div>
        {:else}
            {#if (column.algorithm.type === 'author')}
                <dl class="profile-posts-nav">
                    <dt class="profile-posts-nav__name"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-filter"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg></dt>
                    <dd class="profile-posts-nav__content">
                        <button class="profile-posts-nav__button" on:click={() => {isFiltered = false}} class:profile-posts-nav__button--active={!isFiltered}>{$_('profile_posts_nav_all')}</button>
                        <button class="profile-posts-nav__button" on:click={() => {isFiltered = true}} class:profile-posts-nav__button--active={isFiltered}>{$_('profile_posts_nav_filtered')}</button>
                    </dd>
                </dl>
            {/if}
        {/if}

        <div class="deck-heading__buttons">
            {#if (isJunk)}
                <button class="deck-row-column-add-button" disabled={isColumnAlreadyAdded} on:click={columnAddFromJunk} aria-label="Add column">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isColumnAlreadyAdded ? 'var(--border-color-1)' : 'var(--primary-color)'} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-plus"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
                </button>
            {/if}

            {#if column.algorithm?.type === 'chat' && $settings.design?.layout === 'decks' && !isJunk}
                <button class="deck-popup-button only-pc" on:click={handleChangePopup}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-picture-in-picture-2"><path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"/><rect width="10" height="7" x="12" y="13" rx="2"/></svg>
                </button>
            {/if}

            <ColumnRefreshButton
                column={column}
                index={index}
                {_agent}
                bind:unique={unique}
                bind:refresh={refresh}
                {isJunk}
                {isRefreshing}
            ></ColumnRefreshButton>

            {#if (!isJunk)}
                <ColumnButtons {column} {index} {_agent}></ColumnButtons>

                <button class="deck-row-settings-button" on:click={handleSettingsClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-2"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
                </button>
            {/if}
        </div>
    </div>

    {#if isSettingsOpen}
        <DeckSettingsModal {column} {index} {_agent} layout={$settings.design?.layout} on:close={handleSettingsClick}></DeckSettingsModal>
    {:else}
        {#key unique}
            {#key isFiltered}
                {#if uniqueAgent}
                    <div class="deck-row__content">
                        {#if (column.algorithm.type === 'notification')}
                            <NotificationTimeline column={column} index={index} {_agent} ></NotificationTimeline>
                        {:else if (column.algorithm.type === 'thread')}
                            <ThreadTimeline column={column} index={index} {_agent} bind:isRefreshing={isRefreshing}></ThreadTimeline>
                        {:else if (column.algorithm.type === 'chat')}
                            <ChatTimeline
                                    column={column}
                                    index={index}
                                    {_agent}
                                    on:refresh={handleRefresh}
                            ></ChatTimeline>
                        {:else}
                            <TimelineSelector
                                    column={column}
                                    index={index}
                                    {_agent}
                                    hideReply={column.algorithm.type === 'author' ? hideReply : undefined}
                                    hideRepost={column.algorithm.type === 'author' ? hideRepost : undefined}
                            ></TimelineSelector>
                        {/if}
                    </div>
                {:else}
                    <div class="deck-row__content">
                        <ColumnAgentMissing {column}></ColumnAgentMissing>
                    </div>
                {/if}
            {/key}
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
        transition: transform .3s cubic-bezier(0, 0, 0, 1);
        touch-action: initial !important;

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

        &:has(.chat) {
            position: static;
        }

        &__content {
            &:has(.chat) {
                min-height: calc(100% -  52px);
                display: flex;
                flex-direction: column;
                flex-shrink: 0;
            }
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

            .deck-heading {
                @media (max-width: 767px) {
                    top: 48px;
                }
            }

            .deck-heading__icon {
                margin-left: 0;
            }
        }

        &--junk {
            overflow-y: visible;
            width: 100%;
            height: auto;
            border: none;

            @media (max-width: 767px) {
                padding-top: 0;
            }

            .deck-heading {
                position: relative;
                z-index: 0;

                @media (max-width: 767px) {
                    top: 0;
                }
            }
        }

        &--popup {
            @media (min-width: 768px) {
                width: 100%;
                height: 100%;
                border: none;
            }
        }

        &--bg {
            background-size: cover;
            background-position: center;

            .deck-heading {
                background-color: var(--bg-vail-bg-color);
                backdrop-filter: blur(12px);
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

        &--sticky {
            position: sticky !important;
            z-index: 100 !important;
            top: 52px;
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

    .profile-posts-nav {
        display: flex;
        align-items: center;
        color: var(--text-color-3);
        font-size: 14px;
        gap: 8px;
        padding-left: 8px;

        &__content {
            display: flex;
            gap: 4px;
        }

        &__button {
            display: flex;
            align-items: center;
            padding: 0 8px;
            border: 1px solid var(--primary-color);
            height: 28px;
            border-radius: 14px;
            font-size: 12px;
            color: var(--primary-color);

            &--active {
                background-color: var(--primary-color);
                color: var(--bg-color-1);
            }
        }
    }

    .deck-row-column-add-button {
        width: 40px;
        height: 40px;
        display: grid;
        place-content: center;
    }

    .deck-popup-button {
        width: 40px;
        height: 40px;
        display: grid;
        place-content: center;
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

    .dragging {
        position: relative;
        z-index: 100000;
        transition: none;
    }
</style>