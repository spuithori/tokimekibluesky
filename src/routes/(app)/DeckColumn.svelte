<script lang="ts">
    import {_} from 'svelte-i18n';
    import DeckSettingsModal from "$lib/components/deck/DeckSettingsModal.svelte";
    import {agent, agents, intersectingIndex, isColumnModalOpen, settings} from "$lib/stores";
    import {getAccountIdByDid, getDisplayNameByDid} from "$lib/util";
    import ColumnAutoScrolling from "$lib/components/column/ColumnAutoScrolling.svelte";
    import {iconMap} from "$lib/columnIcons";
    import {onDestroy, onMount} from "svelte";
    import {toast} from "svelte-sonner";
    import {backgroundsMap} from "$lib/columnBackgrounds";
    import {getColumnState, getScopedColumnState} from "$lib/classes/columnState.svelte";
    import {tilingDrag} from "$lib/classes/tilingDragState.svelte";
    import {animateLayout} from "$lib/animations/flip";
    import {MediaQuery} from "svelte/reactivity";
    import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
    import {scrollDirection} from "$lib/scrollDirection";
    import Filter from '@lucide/svelte/icons/filter';
    import GripVertical from '@lucide/svelte/icons/grip-vertical';
    import PictureInPicture2 from '@lucide/svelte/icons/picture-in-picture-2';
    import Settings2 from '@lucide/svelte/icons/settings-2';
    import SquarePlus from '@lucide/svelte/icons/square-plus';
    import TextQuote from '@lucide/svelte/icons/text-quote';
    import CheckCheck from '@lucide/svelte/icons/check-check';
    import { createLongPress } from "$lib/longpress";
    import Refresher from "$lib/components/utils/Refresher.svelte";
    import {capabilityOf} from "$lib/columnKinds";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";
    import ColumnRefreshButton from "$lib/components/column/ColumnRefreshButton.svelte";
    import ColumnIconPicker from "$lib/components/column/ColumnIconPicker.svelte";
    import ColumnContent from "./ColumnContent.svelte";

    interface Props {
        index: number;
        isSplit?: boolean;
        name?: any;
        _agent?: any;
        unique?: symbol;
        isTopScrolling?: boolean;
        isScrollPaused?: boolean;
        showDragHandle?: boolean;
    }

    let {
        index,
        isSplit = false,
        name = undefined,
        _agent: _agentProp = undefined,
        unique = $bindable(Symbol()),
        isTopScrolling = $bindable(false),
        isScrollPaused = false,
        showDragHandle = false,
    }: Props = $props();

    const columnState = getScopedColumnState();
    const isMobileViewport = new MediaQuery('(max-width: 767px)');
    const isJunk = columnState.isJunk;
    const fixedColumnState = getColumnState(false);
    const column = $derived(columnState.getColumn(index));
    const _agent = $derived(_agentProp ?? ($agents.get(getAccountIdByDid($agents, column?.did) as any) || $agent));
    const slotIndex = $derived(columnState.slotIndexOf(column?.id));

    let isSettingsOpen = $state(false);
    let isIconPickerOpen = $state(false);
    let isFiltered = $state(false);
    let isColumnAlreadyAdded = $state(false);
    let refreshEl = $state<{ refresh: (isAutoRefresh?: boolean) => Promise<any> }>();
    let isRefreshing = $state(false);
    let observer: IntersectionObserver | undefined;

    function handleHeaderClick(el: HTMLElement | null) {
        if (!el?.scroll) return;
        if (!capabilityOf(column.algorithm?.type).scrollToTopOnHeaderClick) return;

        isTopScrolling = true;

        if (el.scrollTop === 0) {
            if (capabilityOf(column.algorithm?.type).refreshable) {
                handleRefresh();
            }
            isTopScrolling = false;
        } else {
            el.dataset.smoothScrolling = '';
            el.scroll({ top: 0, left: 0, behavior: 'smooth' });

            const onScrollEnd = () => {
                if (el.scrollTop <= 5) {
                    isTopScrolling = false;
                    delete el.dataset.smoothScrolling;
                    el.removeEventListener('scroll', onScrollEnd);
                }
            };
            el.addEventListener('scroll', onScrollEnd, { passive: true });

            setTimeout(() => {
                isTopScrolling = false;
                delete el.dataset.smoothScrolling;
                el.removeEventListener('scroll', onScrollEnd);
            }, 3000);
        }
    }

    async function handleRefresh(event?: any) {
        try {
            await refreshEl?.refresh();
            if (event?.complete) {
                event.complete();
            }
        } catch (e) {
            console.error(e);
        }
    }

    function handleForceRefresh() {
        if (!capabilityOf(column.algorithm?.type).refreshable) return;

        isRefreshing = true;
        columnState.clearFeed(column.id);
        column.data.cursor = '';
        column.data.scrollState = undefined;

        if (capabilityOf(column.algorithm?.type).feedStorage === 'notification') {
            column.data.feedPool = [];
            column.data.notifications = [];
        }

        unique = Symbol();

        setTimeout(() => { isRefreshing = false; }, 2000);
    }

    function handleSettingsClick(clear = false) {
        isSettingsOpen = !isSettingsOpen;
        if (clear) {
            handleForceRefresh();
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
        if (!isMobileViewport.current) return;
        if (!isJunk && !isSplit) {
            scrollDirection(event.currentTarget as HTMLElement, 80, (scrollDir: string) => {
                scrollDirectionState.direction = scrollDir as any;
            });
        }
    }

    function handleChangePopup() {
        animateLayout(() => {
            column.settings = {...column.settings, isPopup: !column.settings?.isPopup};
        });
    }

    function changeAuthorFilter(isFilter: boolean) {
        const timeline = (column.settings.timeline ??= { hideRepost: 'all', hideReply: 'all', hideMention: 'all', hideQuote: null, simpleReply: null });
        if (isFilter) {
            timeline.hideReply = 'me';
            timeline.hideRepost = 'none';
            isFiltered = true;
        } else {
            timeline.hideReply = 'all';
            timeline.hideRepost = 'all';
            isFiltered = false;
        }

        columnState.clearFeed(column.id);
        column.data.cursor = '';
        unique = Symbol();
    }

    function intersect(entries: IntersectionObserverEntry[]) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                intersectingIndex.set(slotIndex);
                scrollDirectionState.direction = 'up';
            }
        });
    }

    async function columnAddFromJunk() {
        const _column = {
            ...$state.snapshot(column),
            id: self.crypto.randomUUID(),
            did: _agent.did() as string,
            handle: _agent.handle(),
            scrollElement: undefined,
        };
        _column.algorithm.name = name || column.algorithm.name;

        try {
            if (_column.algorithm.type === 'author' && _column.algorithm.algorithm) {
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

    onMount(() => {
        if (!isJunk) {
            observer = new IntersectionObserver(intersect, { threshold: 0.5 });
            if (column?.scrollElement) {
                observer.observe(column.scrollElement);
            }
            column.lastRefresh = new Date().toISOString();
        }
    });

    onDestroy(() => {
        try {
            if (column?.scrollElement) observer?.unobserve(column.scrollElement);
        } catch (e) {}
        try {
            if (column?.scrollElement) column.scrollElement = null;
        } catch (e) { console.error(e); }
    });

    export function getRefreshEl() { return refreshEl; }
    export function refresh() { return handleRefresh(); }
    export function forceRefresh() { return handleForceRefresh(); }
</script>

<div
    class="deck-row deck-row--{column?.settings?.width || 'medium'}"
    class:deck-row--in-split={isSplit}
    class:deck-row--popup={column?.settings?.isPopup === true}
    class:deck-row--bg={column?.settings?.background}
    class:deck-row--decks={$settings.design?.layout === 'decks'}
    class:deck-row--single={$settings.design?.layout === 'default'}
    class:deck-row--mobileV2={$settings.design?.mobileNewUi && !isJunk}
    class:deck-row--mobileV2-fixed={$settings.design?.fixedFooter}
    class:deck-row--junk={isJunk}
    class:deck-row--settings-open={isSettingsOpen}
    class:deck-row--tile-dragging={tilingDrag.draggingId === column?.id}
    data-tile-id={$settings.design?.layout === 'decks' && !isJunk && !column?.settings?.isPopup ? column?.id : undefined}
    data-flip-id={column?.id}
    tabindex="-1"
    onscroll={handleScroll}
    bind:this={column.scrollElement}
    style:background-image={column?.settings?.background ? `url(${backgroundsMap.get(column.settings.background)?.url})` : 'none'}
>
    {#snippet settingsModal()}
        <DeckSettingsModal {index} {_agent} layout={$settings.design?.layout} onclose={handleSettingsClick} {isSplit}></DeckSettingsModal>
    {/snippet}

    <div class="deck-heading" class:deck-heading--sticky={isJunk && column?.algorithm?.type === 'thread'} class:deck-heading--scroll-down={scrollDirectionState.direction === 'down' && !isJunk}>
        {#if (!isJunk)}
            {#if showDragHandle}
                <div class="deck-drag-area">
                    <GripVertical size="20" color="var(--border-color-1)"></GripVertical>
                </div>
            {/if}

            <div class="deck-heading__icon">
                <button class="deck-heading__icon-picker-button" aria-label="Change icon" onclick={() => {isIconPickerOpen = !isIconPickerOpen}}>
                    {#if column?.settings?.icon}
                        {@const SvelteComponent = iconMap.get(column.settings.icon)}
                        <SvelteComponent color="var(--deck-heading-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></SvelteComponent>
                    {:else}
                        <ColumnIcon type={column?.algorithm?.type}></ColumnIcon>
                    {/if}
                </button>
            </div>

            <div
                    role="button"
                    tabindex="0"
                    class="deck-heading__scroll-area"
                    onclick={() => {handleHeaderClick($settings.design?.layout === 'decks' ? (column.scrollElement ?? null) : (document.querySelector(':root') as HTMLElement | null))}}
                    use:createLongPress={{callback: handleForceRefresh, duration: 500}}
                    aria-label="Back to top."
            >
                <div class="deck-heading__title">
                    {column?.algorithm?.name} <span class="deck-heading__subhead">{column?.handle}</span>
                </div>
            </div>
        {:else}
            {#if (column?.algorithm?.type === 'author')}
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
            {#if isJunk && column?.algorithm?.type === 'thread'}
                <button aria-label="Threaded Mode" class="deck-row-column-add-button" class:deck-row-column-add-button--active={$settings?.design?.threaded} onclick={() => {$settings.design.threaded = !$settings.design.threaded}}>
                    <TextQuote color="var(--deck-row-settings-button-color, var(--primary-color))"></TextQuote>
                </button>
            {/if}

            {#if (isJunk && column?.algorithm?.type !== 'authorLike')}
                <button class="deck-row-column-add-button" disabled={isColumnAlreadyAdded} onclick={columnAddFromJunk} aria-label="Add column">
                    <SquarePlus color={isColumnAlreadyAdded ? 'var(--border-color-1)' : 'var(--primary-color)'}></SquarePlus>
                </button>
            {/if}

            {#if column?.algorithm?.type === 'chat' && $settings.design?.layout === 'decks' && !isJunk}
                <button class="deck-popup-button only-pc" aria-label="Popup" onclick={handleChangePopup}>
                    <PictureInPicture2 color="var(--text-color-1)"></PictureInPicture2>
                </button>
            {/if}

            {#if column?.algorithm?.type === 'notification' && !isJunk}
                <button class="deck-popup-button only-pc" onclick={handleRefresh}>
                    <CheckCheck color="var(--deck-row-settings-button-color, var(--text-color-3))" strokeWidth="var(--icon-stroke-width, 2px)"></CheckCheck>
                </button>
            {/if}

            <ColumnRefreshButton
                    {index}
                    {_agent}
                    bind:unique={unique}
                    bind:this={refreshEl}
                    bind:isRefreshing={isRefreshing}
                    {isSplit}
            ></ColumnRefreshButton>

            {#if (!isJunk)}
                <button class="deck-row-settings-button" class:deck-row-settings-button--open={isSettingsOpen} aria-label="Settings" onclick={() => {isSettingsOpen = !isSettingsOpen}}>
                    <Settings2 color="var(--deck-row-settings-button-color, var(--text-color-3))" strokeWidth="var(--icon-stroke-width, 2px)"></Settings2>
                </button>
            {/if}
        </div>

        {#if ($settings.design?.mobileNewUi && !isJunk)}
            <button class="deck-heading-side-button" onclick={() => {$isColumnModalOpen = true}}>
                <SquarePlus color="var(--bar-primary-icon-color)" size="22"></SquarePlus>
            </button>
        {/if}

        {#if isIconPickerOpen}
            <ColumnIconPicker onchange={handleIconChange} onclose={() => {isIconPickerOpen = false}} current={column?.settings?.icon}></ColumnIconPicker>
        {/if}

        {#if isSettingsOpen && !isSplit}
            {@render settingsModal()}
        {/if}
    </div>

    {#if isSettingsOpen && isSplit}
        {@render settingsModal()}
    {/if}

    <Refresher
            onrefresh={handleRefresh}
            refresherHeight={80}
            pullMin={80}
            pullMax={160}
            disabled={!capabilityOf(column?.algorithm?.type).splittable || $settings.design?.layout === 'default'}
    >
        <div class="deck-row__content">
            <ColumnContent {index} {_agent} {unique} {isSplit} {isTopScrolling} onrefresh={handleRefresh}></ColumnContent>
        </div>
    </Refresher>
</div>

{#if column?.scrollElement instanceof HTMLElement && column.settings?.autoScroll}
    <ColumnAutoScrolling {column} {index} {isTopScrolling} {isScrollPaused} {unique}></ColumnAutoScrolling>
{/if}

<style lang="postcss">
    .deck-row {
        width: 100%;
        height: 100%;
        flex-shrink: 0;
        position: relative;
        overflow-y: scroll;
        outline: none;

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
            margin-top: calc(var(--deck-heading-space, var(--deck-heading-height)) - 1px);
            border-top: 1px solid var(--deck-border-color);
        }

        @media (max-width: 767px) {
            scrollbar-color: var(--scroll-bar-color) var(--scroll-bar-bg-color);
            scrollbar-width: thin;
            box-shadow: none;
            padding-top: 46px;
        }

        &--in-split {
            flex: 1;
            min-height: 0;
            height: auto;
            border-radius: 0;
        }

        &--single {
            height: auto;
            width: 100%;
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
                top: var(--deck-heading-height);
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

        &--tile-dragging {
            opacity: .4;
            filter: saturate(.65);
            transition: opacity .12s ease, filter .12s ease;

            @media (prefers-reduced-motion: reduce) {
                transition: none;
            }
        }
    }

    .deck-heading {
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
        min-width: 0;
        backdrop-filter: var(--deck-heading-backdrop-filter);

        @media (min-width: 768px) {
            margin-bottom: var(--rice-heading-mb, 0px);
            opacity: var(--rice-heading-opacity, 1);
            pointer-events: var(--rice-heading-pe, auto);
            transition: opacity var(--anim-hover-duration, .15s) var(--anim-hover-easing, ease);
        }

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
            top: var(--deck-heading-height);
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

    @media (min-width: 768px) {
        .deck-row:hover .deck-heading {
            opacity: var(--rice-heading-hover-opacity, var(--rice-heading-opacity, 1));
            pointer-events: var(--rice-heading-hover-pe, var(--rice-heading-pe, auto));
        }

        .deck-row .deck-heading:focus-within {
            opacity: 1;
            pointer-events: auto;
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
        touch-action: none;

        @media (max-width: 767px) {
            display: none;
        }
    }

    .deck-heading-side-button {
        display: none;
    }
</style>
