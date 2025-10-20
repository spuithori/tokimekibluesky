<script lang="ts">
    import {_} from 'svelte-i18n';
    import NotificationTimeline from "./NotificationTimeline.svelte";
    import DeckSettingsModal from "$lib/components/deck/DeckSettingsModal.svelte";
    import ThreadTimeline from "./ThreadTimeline.svelte";
    import {agent, agents, intersectingIndex, isColumnModalOpen, settings} from "$lib/stores";
    import {getAccountIdByDid, getDisplayNameByDid} from "$lib/util";
    import ColumnAgentMissing from "$lib/components/column/ColumnAgentMissing.svelte";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";
    import ColumnRefreshButton from "$lib/components/column/ColumnRefreshButton.svelte";
    import ColumnAutoScrolling from "$lib/components/column/ColumnAutoScrolling.svelte";
    import ColumnIconPicker from "$lib/components/column/ColumnIconPicker.svelte";
    import {iconMap} from "$lib/columnIcons";
    import {scrollDirection} from "$lib/scrollDirection";
    import {onDestroy, onMount} from "svelte";
    import {toast} from "svelte-sonner";
    import ChatTimeline from "./ChatTimeline.svelte";
    import {backgroundsMap} from "$lib/columnBackgrounds";
    import { draggable, axis, ControlFrom, events, controls, Compartment, position, disabled } from '@neodrag/svelte';
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import Timeline from "./Timeline.svelte";
    import BookmarkTimeline from "./BookmarkTimeline.svelte";
    import ListTimeline from "./ListTimeline.svelte";
    import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
    import {publishState} from "$lib/classes/publishState.svelte";
    import {Filter, GripVertical, PictureInPicture2, Settings2, SquarePlus, TextQuote} from "lucide-svelte";
    import { createLongPress } from "$lib/longpress";
    import Refresher from "$lib/components/utils/Refresher.svelte";

    interface Props {
        index?: number;
        isJunk?: boolean;
        name?: any;
    }

    let {
        index = 0,
        isJunk = false,
        name = undefined,
        _agent,
    }: Props = $props();

    const columnState = getColumnState(isJunk);
    const fixedColumnState = getColumnState(false);
    const column = columnState.getColumn(index);
    let unique = $state(Symbol());

    if (!_agent) {
        _agent = $agents.get(getAccountIdByDid($agents, column.did)) || $agent;
    }

    let isSettingsOpen = $state(false);
    let isTopScrolling = $state();
    let isScrollPaused = $state(false);
    let isIconPickerOpen = $state(false);
    let observer;
    let isFiltered = $state(false);
    let isColumnAlreadyAdded = $state(false);
    let refreshEl = $state();
    let isDragging = $state(false);
    let reorderIndex = index;
    let isRefreshing = $state(false);
    let dragPosition = $state({x: 0, y: 0});

    const eventsComp = Compartment.of(() =>
        position({ current: dragPosition }),
    );

    if (!column.data) {
        column.data = {
            feed: [],
            cursor: '',
        }
    }

    function handleHeaderClick(el) {
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

    function handleSettingsClick(clear = false) {
        isSettingsOpen = !isSettingsOpen;

        if (clear) {
            forceRefresh();
        }
    }

    function handleMouseEnter() {
        isScrollPaused = true;
    }

    function handleMouseLeave() {
        isScrollPaused = false;
    }

    function handleIconChange(icon) {
        column.settings.icon = icon;
        isIconPickerOpen = false;
    }

    function handleScroll(event) {
        if (!isJunk) {
            const scroll = scrollDirection(event.currentTarget, 80, (scrollDir) => {
                scrollDirectionState.direction = scrollDir;
            });
        }
    }

    function intersect(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                intersectingIndex.set(index);
                scrollDirectionState.direction = 'up';
            }
        })
    }

    async function columnAddFromJunk() {
        const _column = {
            ...column,
            id: self.crypto.randomUUID(),
            did: _agent.did() as string,
            handle: _agent.handle(),
        }
        _column.algorithm.name = name || column.algorithm.name;

        try {
            if (_column.algorithm.type === 'author') {
                _column.algorithm.name = await getDisplayNameByDid(_column.algorithm.algorithm, _agent);
            }

            fixedColumnState.add(_column);

            toast.success($_('column_added'));
            isColumnAlreadyAdded = true;
        } catch (e) {
            console.error(e);
            toast.error('Error: ' + e);
        }
    }

    async function handleRefresh(event) {
        try {
            await refreshEl.refresh();

            if (event) {
                event.complete();
            }
        } catch (e) {
            console.error(e);
        }
    }

    function handleChangePopup() {
        if (column.settings.isPopup) {
            column.settings = {...column.settings, isPopup: false};
        } else {
            column.settings = {...column.settings, isPopup: true};
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

            column.lastRefresh = new Date().toISOString();
        }
    })

    onDestroy(() => {
        try {
            observer.unobserve(column.scrollElement);
        } catch (e) {

        }

        try {
            if (column.scrollElement) {
                column.scrollElement = null;
            }
        } catch (e) {
            console.error(e);
        }
    })

    function handleDragStart(e) {
        isDragging = true;
    }

    function handleDragEnd(e) {
        dragPosition = {x: 0, y: 0};

        columnState.columns.forEach(_column => {
            if (_column.scrollElement) {
                _column.scrollElement.style.translate = '0 0 0';
            }
        })

        columnState.columns = moveElement(columnState.columns, index, reorderIndex);

        setTimeout(() => {
            isDragging = false;
        }, 350)
    }

    async function handleDragging(data) {
        const x = data.rootNode.getBoundingClientRect().left;

        if (Math.sign(data.offset.x) === 1) {
            const prevColumn = columnState.columns[reorderIndex]?.scrollElement;
            const nextColumn = columnState.columns[reorderIndex + 1]?.scrollElement;

            if (reorderIndex < index) {
                reorderIndex = index;
            }

            if (Math.abs(x) > nextColumn?.getBoundingClientRect().left) {
                nextColumn.style.translate = `${column.scrollElement.offsetWidth * -1}px 0 0`;
                reorderIndex = reorderIndex + 1;
            }

            if (Math.abs(x) < prevColumn.getBoundingClientRect().left) {
                prevColumn.style.translate = '0 0 0';
                reorderIndex = reorderIndex - 1;
            }
        } else if (Math.sign(data.offset.x) === -1) {
            const prevColumn = columnState.columns[reorderIndex - 1]?.scrollElement;
            const nextColumn = columnState.columns[reorderIndex]?.scrollElement;

            if (reorderIndex > index) {
                reorderIndex = index;
            }

            if (Math.abs(x) < prevColumn?.getBoundingClientRect().left) {
                prevColumn.style.translate = `${column.scrollElement.offsetWidth}px 0 0`;
                reorderIndex = reorderIndex - 1;
            }

            if (Math.abs(x) > nextColumn.getBoundingClientRect().left) {
                nextColumn.style.translate = '0 0 0';
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
            column.data.notifications = [];
        }

        unique = Symbol();

        setTimeout(() => {
            isRefreshing = false;
        }, 2000);
    }

    function changeAuthorFilter(isFilter: boolean) {
        if (isFilter) {
            column.settings.timeline.hideReply = 'me';
            column.settings.timeline.hideRepost = 'none';
            isFiltered = true;
        } else {
            column.settings.timeline.hideReply = 'all';
            column.settings.timeline.hideRepost = 'all';
            isFiltered = false;
        }

        column.data.feed = [];
        column.data.cursor = undefined;
        unique = Symbol();
    }
</script>

<div
    class="deck-row deck-row--{column.settings?.width || 'medium'}"
    class:deck-row--popup={column.settings?.isPopup === true}
    class:deck-row--bg={column.settings?.background}
    class:deck-row--decks={$settings.design?.layout === 'decks'}
    class:deck-row--single={$settings.design?.layout === 'default'}
    class:deck-row--compact={publishState.layout === 'bottom'}
    class:deck-row--mobileV2={$settings.design?.mobileNewUi && !isJunk}
    class:deck-row--mobileV2-fixed={$settings.design?.fixedFooter}
    class:deck-row--junk={isJunk}
    class:deck-row--settings-open={isSettingsOpen}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    onscroll={handleScroll}
    bind:this={column.scrollElement}
    style:background-image={column.settings?.background ? `url(${backgroundsMap.get(column.settings.background).url})` : 'none'}
    class:dragging={isDragging}
    {@attach draggable(() => [
        axis('x'),
        controls({ allow: ControlFrom.selector('.deck-drag-area') }),
        events({
            onDragStart: handleDragStart,
            onDrag: handleDragging,
            onDragEnd: handleDragEnd,
        }),
        disabled($settings.design?.layout === 'default' || isJunk),
        eventsComp,
    ])}
>
    <div class="deck-heading" class:deck-heading--sticky={isJunk && column.algorithm?.type === 'thread'} class:deck-heading--scroll-down={scrollDirectionState.direction === 'down' && !isJunk}>
        {#if (!isJunk)}
            {#if !column?.settings?.isPopup && $settings.design?.layout === 'decks'}
                <div class="deck-drag-area">
                    <GripVertical size="20" color="var(--border-color-1)"></GripVertical>
                </div>
            {/if}

            <div class="deck-heading__icon">
                <button class="deck-heading__icon-picker-button" aria-label="Change icon" onclick={() => {isIconPickerOpen = !isIconPickerOpen}}>
                    {#if column.settings?.icon}
                        {@const SvelteComponent = iconMap.get(column.settings.icon)}
                        <SvelteComponent color="var(--deck-heading-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></SvelteComponent>
                    {:else}
                        <ColumnIcon type={column.algorithm.type}></ColumnIcon>
                    {/if}
                </button>
            </div>

            <div
                    role="button"
                    class="deck-heading__scroll-area"
                    onclick={(event) => {handleHeaderClick($settings.design?.layout === 'decks' ? column.scrollElement : document.querySelector(':root'), event)}}
                    use:createLongPress={{callback: forceRefresh, duration: 500}}
                    aria-label="Back to top."
            >
                <div class="deck-heading__title">
                    {column.algorithm.name} <span class="deck-heading__subhead">{column.handle}</span>
                </div>
            </div>
        {:else}
            {#if (column.algorithm.type === 'author')}
                <dl class="profile-posts-nav">
                    <dt class="profile-posts-nav__name">
                        <Filter size="20" color="var(--text-color-3)"></Filter>
                    </dt>
                    <dd class="profile-posts-nav__content">
                        <button class="profile-posts-nav__button" onclick={() => {changeAuthorFilter(false)}} class:profile-posts-nav__button--active={!isFiltered}>{$_('profile_posts_nav_all')}</button>
                        <button class="profile-posts-nav__button" onclick={() => {changeAuthorFilter(true)}} class:profile-posts-nav__button--active={isFiltered}>{$_('profile_posts_nav_filtered')}</button>
                    </dd>
                </dl>
            {/if}
        {/if}

        <div class="deck-heading__buttons">
            {#if isJunk && column.algorithm?.type === 'thread'}
                <button aria-label="Threaded Mode" class="deck-row-column-add-button" class:deck-row-column-add-button--active={$settings?.design?.threaded} onclick={() => {$settings.design.threaded = !$settings.design.threaded}}>
                    <TextQuote color="var(--deck-row-settings-button-color, var(--primary-color))"></TextQuote>
                </button>
            {/if}

            {#if (isJunk && column.algorithm?.type !== 'authorLike')}
                <button class="deck-row-column-add-button" disabled={isColumnAlreadyAdded} onclick={columnAddFromJunk} aria-label="Add column">
                    <SquarePlus color={isColumnAlreadyAdded ? 'var(--border-color-1)' : 'var(--primary-color)'}></SquarePlus>
                </button>
            {/if}

            {#if column.algorithm?.type === 'chat' && $settings.design?.layout === 'decks' && !isJunk}
                <button class="deck-popup-button only-pc" aria-label="Popup" onclick={handleChangePopup}>
                    <PictureInPicture2 color="var(--text-color-1)"></PictureInPicture2>
                </button>
            {/if}

            <ColumnRefreshButton
                {index}
                {_agent}
                bind:unique={unique}
                bind:this={refreshEl}
                {isJunk}
                {isRefreshing}
            ></ColumnRefreshButton>

            {#if (!isJunk)}
                <button class="deck-row-settings-button" class:deck-row-settings-button--open={isSettingsOpen} aria-label="Settings" onclick={() => {isSettingsOpen = !isSettingsOpen}}>
                    <Settings2 color="var(--deck-row-settings-button-color, var(--text-color-3))" strokeWidth="var(--icon-stroke-width, 2px)"></Settings2>
                </button>
            {/if}
        </div>

        {#if ($settings.design?.mobileNewUi && !isJunk)}
            <button
                    class="deck-heading-side-button"
                    onclick={() => {$isColumnModalOpen = true}}
            >
                <SquarePlus color="var(--bar-primary-icon-color)" size="22"></SquarePlus>
            </button>
        {/if}

        {#if isIconPickerOpen}
            <ColumnIconPicker onchange={handleIconChange} onclose={() => {isIconPickerOpen = false}} current={column.settings?.icon}></ColumnIconPicker>
        {/if}

        {#if isSettingsOpen}
            <DeckSettingsModal {index} {_agent} layout={$settings.design?.layout} onclose={handleSettingsClick}></DeckSettingsModal>
        {/if}
    </div>

    <Refresher
        onrefresh={handleRefresh}
        refresherHeight={80}
        pullMin={80}
        pullMax={160}
        disabled={column.algorithm.type === 'chat' || $settings.design?.layout === 'default'}
    >
        {#if _agent}
            <div class="deck-row__content">
                {#if (column.algorithm.type === 'notification')}
                    <NotificationTimeline {index} {isJunk} {_agent} {unique}></NotificationTimeline>
                {:else if (column.algorithm.type === 'thread')}
                    {#key unique}
                        <ThreadTimeline {index} {_agent} {isJunk}></ThreadTimeline>
                    {/key}
                {:else if (column.algorithm.type === 'chat')}
                    <ChatTimeline {index} {_agent} {unique} {isJunk} onrefresh={handleRefresh}></ChatTimeline>
                {:else if (column.algorithm.type === 'list')}
                    {#key unique}
                        <ListTimeline {index} {_agent} {isJunk} {unique}></ListTimeline>
                    {/key}
                {:else if (column.algorithm.type === 'bookmark')}
                    <BookmarkTimeline {index} {_agent} {isJunk} {unique}></BookmarkTimeline>
                {:else}
                    <Timeline {index} {_agent} {isJunk} {unique}></Timeline>
                {/if}
            </div>
        {:else}
            <div class="deck-row__content">
                <ColumnAgentMissing {column}></ColumnAgentMissing>
            </div>
        {/if}
    </Refresher>
</div>

{#if column.scrollElement && column.scrollElement instanceof HTMLElement && column.settings?.autoScroll}
    <ColumnAutoScrolling {column} {index} {isTopScrolling} {isScrollPaused} {unique}></ColumnAutoScrolling>
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
        backdrop-filter: var(--deck-content-backdrop-filter);
        border-right: var(--deck-border-right, var(--deck-border-width) solid var(--deck-border-color));
        touch-action: initial !important;

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
            margin-top: 51px;
            margin-bottom: 1px;
            border-radius: 0 0 var(--deck-border-radius) 0;
            border-top: 1px solid var(--deck-border-color);
        }

        @media (max-width: 767px) {
            scrollbar-color: var(--scroll-bar-color) var(--scroll-bar-bg-color);
            scrollbar-width: thin;
            width: 100vw;
            scroll-snap-align: start;
            scroll-snap-stop: always;
            box-shadow: none;
            padding-top: 46px;
            height: calc(100dvh);
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

        &--single {
            height: auto;
            border-top: 1px solid transparent;
            border-bottom: 1px solid transparent;
            border-left: none;
            border-right: none;
            width: auto;
            border-radius: 0;
            overflow: visible;

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
                top: 52px;
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

        &--mobileV2 {
            .deck-heading-side-button {
                display: none;
            }

            @media (max-width: 767px) {
                --deck-heading-icon-bg-color: transparent;
                --deck-heading-icon-color: var(--text-color-3);
                display: flex;
                flex-direction: column;
                padding-top: 0;

                .deck-row__content {
                    flex: 1;
                }

                .deck-heading {
                    order: 10;
                    top: auto;
                    bottom: 0;
                    flex-shrink: 0;
                    border-bottom: none;
                    border-top: 1px solid var(--deck-border-color);
                    padding: 12px 10px calc(8px + 52px + var(--safe-area-bottom));
                    height: calc(var(--deck-heading-height) + 56px + var(--safe-area-bottom));
                    text-align: center;
                    border-radius: 0;

                    &--scroll-down {
                        transform: translateY(0);
                    }

                    &::before {
                        content: '';
                        display: block;
                        position: absolute;
                        top: 8px;
                        height: 44px;
                        left: 8px;
                        right: 54px;
                        background-color: var(--bg-color-2);
                        border-radius: var(--border-radius-3);
                        z-index: -1;
                    }
                }

                .deck-row-settings-button {
                    width: 36px;
                    height: 36px;

                    &:hover {
                        background-color: transparent;
                    }
                }

                .deck-heading-side-button {
                    display: grid;
                    width: 44px;
                    height: 44px;
                    place-content: center;
                }

                &.deck-row--mobileV2-fixed {
                    .deck-heading {
                        transform: none !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                    }
                }
            }
        }

        &--settings-open {
            padding-right: 6px;

            &::-webkit-scrollbar {
                width: 0;
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
        will-change: transform, opacity;

        @media (max-width: 767px) {
            transition: opacity .2s ease-in-out, visibility .2s ease-in-out, transform .2s ease-in-out;
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

            @media (max-width: 767px) {
                font-size: 14px;
            }
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

        &--sticky {
            position: sticky !important;
            z-index: 100 !important;
            top: 52px;
            border-radius: 0;
        }

        &--scroll-down {
            @media (max-width: 767px) {
                opacity: 0;
                visibility: hidden;
                transform: translateY(-48px);
            }
        }
    }

    .deck-row-settings-button {
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
        border-radius: var(--border-radius-2);

        &--active {
            background-color: var(--primary-color);
            --deck-row-settings-button-color: var(--bg-color-1);
        }
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