<script lang="ts">
    import {_} from 'tokimeki-i18n';
    import DeckSettingsModal from "$lib/components/deck/DeckSettingsModal.svelte";
    import {agent, agentsByDid, intersectingIndex, isColumnModalOpen, settings} from "$lib/stores";
    import {getDisplayNameByDid} from "$lib/util";
    import ColumnAutoScrolling from "$lib/components/column/ColumnAutoScrolling.svelte";
    import {scrollDirection} from "$lib/scrollDirection";
    import {isMobileViewport} from "$lib/viewportQuery.svelte";
    import {smoothScrollToTopGuarded} from "$lib/components/virtual/scroll-helpers";
    import {onMount} from "svelte";
    import {toast} from "svelte-sonner";
    import {backgroundsMap} from "$lib/columnBackgrounds";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {tilingDrag} from "$lib/classes/tilingDragState.svelte";
    import {animateLayout} from "$lib/animations/flip";
    import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
    import {publishState} from "$lib/classes/publishState.svelte";
    import GripVertical from '@lucide/svelte/icons/grip-vertical';
    import PictureInPicture2 from '@lucide/svelte/icons/picture-in-picture-2';
    import Settings2 from '@lucide/svelte/icons/settings-2';
    import SquarePlus from '@lucide/svelte/icons/square-plus';
    import TextQuote from '@lucide/svelte/icons/text-quote';
    import CheckCheck from '@lucide/svelte/icons/check-check';
    import { createLongPress } from "$lib/longpress";
    import Refresher from "$lib/components/utils/Refresher.svelte";
    import ColumnDisplayIcon from "$lib/components/column/ColumnDisplayIcon.svelte";
    import type {currentAlgorithm} from "$lib/types/column";
    import ColumnRefreshButton from "$lib/components/column/ColumnRefreshButton.svelte";
    import ColumnIconPicker from "$lib/components/column/ColumnIconPicker.svelte";
    import ColumnContent from "./ColumnContent.svelte";
    import {syncNotificationBadges, markAllNotificationsRead} from "$lib/components/notification/notificationPipeline";
    import {resetColumnForRefresh} from "$lib/components/column/forceRefresh";
    import {getProfileRefreshContext, type AuthorMode, type ProfileColumnControls} from "$lib/classes/profileRefreshContext.svelte";
    import Menu from "$lib/components/ui/Menu.svelte";
    import ChevronDown from '@lucide/svelte/icons/chevron-down';
    import Check from '@lucide/svelte/icons/check';
    import {MERGE_PALETTE} from "$lib/merge/mergePalette";
    import {extractMergeSource} from "$lib/merge/mergeColumnOps";
    import {initialSoloState, soloFeedKey} from "$lib/merge/mergeSolo";
    import {startPointerDrag} from "$lib/pointerDrag";
    import {DECK_SLOT_SELECTOR, deckSlotElements, insertionIndexAt, quadrantZone, type DropPreview, type Quad} from "$lib/attachments/sortable.svelte";
    import {normalizeThreadSort, THREAD_SORTS} from "$lib/components/thread/threadV2";
    import type {ThreadSort} from "$lib/types/atproto";

    interface Props {
        index: number;
        isJunk?: boolean;
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
        isJunk = false,
        isSplit = false,
        name = undefined,
        _agent: _agentProp = undefined,
        unique = $bindable(Symbol()),
        isTopScrolling = $bindable(false),
        isScrollPaused = false,
        showDragHandle = false,
    }: Props = $props();

    const columnState = getColumnState(isJunk);
    const fixedColumnState = getColumnState(false);
    const column = $derived(columnState.getColumn(index));
    const _agent = $derived(_agentProp ?? $agentsByDid.get(column?.did) ?? (isJunk ? $agent : undefined));
    const slotIndex = $derived(isJunk ? index : columnState.slotIndexOf(column?.id));
    const isContentDeferred = $derived(!isJunk && $settings.design?.layout === 'decks' && !!column?.id && columnState.isContentDeferred(column.id));

    let isSettingsOpen = $state(false);
    let isIconPickerOpen = $state(false);
    let isColumnAlreadyAdded = $state(false);
    let refreshEl = $state();
    let isRefreshing = $state(false);
    let scrollEl = $state<HTMLDivElement | null>(null);

    const isAuthorColumn = $derived(column?.algorithm?.type === 'author' || column?.algorithm?.type === 'authorReplies' || column?.algorithm?.type === 'authorReposts');
    let isSortMenuOpen = $state(false);
    const authorMode: AuthorMode = $derived(
        column?.algorithm?.type === 'authorReplies' ? 'replies'
            : column?.algorithm?.type === 'authorReposts' ? 'reposts'
            : column?.settings?.timeline?.hideRepost === 'none' ? 'filtered'
            : 'all');

    const threadSort = $derived(normalizeThreadSort($settings.timeline?.threadSort));

    if (column && !column.data) {
        column.data = {
            feed: [],
            cursor: '',
        }
    }

    $effect(() => {
        const col = column;
        if (!col) return;
        col.scrollElement = scrollEl;
        return () => {
            if (col.scrollElement === scrollEl) {
                col.scrollElement = null;
            }
        };
    });

    $effect(() => {
        if (isJunk || !scrollEl) return;
        const observer = new IntersectionObserver(intersect, { threshold: 0.5 });
        observer.observe(scrollEl);
        return () => observer.disconnect();
    });

    const profileRefreshContext = getProfileRefreshContext();

    $effect(() => {
        if (!profileRefreshContext) return;

        const refresh = () => (refreshEl as any)?.refresh();
        const controls: ProfileColumnControls = {
            get authorMode() { return isAuthorColumn ? authorMode : undefined; },
            get canAdd() { return column?.algorithm?.type !== 'authorLike'; },
            get isAdded() { return isColumnAlreadyAdded; },
            setAuthorMode,
            add: columnAddFromJunk,
            refresh,
        };
        profileRefreshContext.refresh = refresh;
        profileRefreshContext.column = controls;

        return () => {
            if (profileRefreshContext.refresh === refresh) {
                profileRefreshContext.refresh = null;
            }
            if (profileRefreshContext.column === controls) {
                profileRefreshContext.column = null;
            }
        };
    });

    function handleHeaderClick(el: HTMLElement | null) {
        if (!el?.scroll) {
            return false;
        }

        if (column?.algorithm?.type === 'chat' || column?.algorithm?.type === 'chatList') {
            return false;
        }

        isTopScrolling = true;

        if (el.scrollTop === 0) {
            handleRefresh();
            isTopScrolling = false;
        } else {
            smoothScrollToTopGuarded(el, () => {
                isTopScrolling = false;
            });
        }
    }

    async function handleRefresh(event?: any) {
        try {
            await (refreshEl as any)?.refresh();
        } catch (e) {
            console.error(e);
        } finally {
            if (event?.complete) {
                event.complete();
            }
        }
    }

    async function handleMarkAllRead() {
        if (!_agent) {
            return;
        }

        try {
            await markAllNotificationsRead({ column, columnState, _agent });
            syncNotificationBadges(fixedColumnState.columns, column.did);
        } catch (e) {
            console.error(e);
            toast.error('Error: ' + e);
        }
    }

    let suppressChipClick = false;

    function toggleMergeSolo(sourceId: string) {
        if (suppressChipClick) {
            suppressChipClick = false;
            return;
        }
        if (!column?.data) {
            return;
        }

        if (column.data.mergeSolo === sourceId) {
            column.data.mergeSolo = undefined;
            column.data.mergeSoloCursor = undefined;
            column.data.mergeSoloComplete = undefined;
            columnState.deleteFeed(soloFeedKey(column.id));
        } else {
            const soloState = initialSoloState(column.data.cursor, column.algorithm?.sources ?? [], sourceId);
            column.data.mergeSolo = sourceId;
            column.data.mergeSoloCursor = soloState.cursor;
            column.data.mergeSoloComplete = soloState.complete;
            columnState.setFeed(soloFeedKey(column.id), []);
        }

        unique = Symbol();
        if (scrollEl) {
            scrollEl.scrollTop = 0;
        }
    }

    const CHIP_CANCEL_MARGIN = 16;

    function detectChipDrop(x: number, y: number, originRect: DOMRect | null): DropPreview | null {
        if (originRect
            && x >= originRect.left - CHIP_CANCEL_MARGIN && x <= originRect.right + CHIP_CANCEL_MARGIN
            && y >= originRect.top - CHIP_CANCEL_MARGIN && y <= originRect.bottom + CHIP_CANCEL_MARGIN) {
            return null;
        }

        const hit = document.elementFromPoint(x, y);
        const el = hit?.closest('[data-tile-id]') as HTMLElement | null;
        const id = el?.dataset.tileId;

        if (el && id && id !== column?.id) {
            const r = el.getBoundingClientRect();
            const prev = tilingDrag.preview;
            const cur: Quad | null = prev?.kind === 'split' && prev.id === id ? prev.zone : null;
            const zone = quadrantZone(r.width, r.height, x - r.left, y - r.top, cur, 0.06);
            return { kind: 'split', id, zone, rect: { x: r.left, y: r.top, w: r.width, h: r.height } };
        }

        const cols = deckSlotElements();
        if (!cols.length) {
            return null;
        }
        const rects = cols.map(c => c.getBoundingClientRect());
        if (y < Math.min(...rects.map(r => r.top)) || y > Math.max(...rects.map(r => r.bottom))) {
            return null;
        }
        const index = insertionIndexAt(rects, x);
        const lineX =
            index <= 0 ? rects[0].left
            : index >= rects.length ? rects[rects.length - 1].right
            : (rects[index - 1].right + rects[index].left) / 2;
        const ref = cols[index] as HTMLElement | undefined;
        const beforeId = ref ? ((ref.querySelector('[data-tile-id]') as HTMLElement | null)?.dataset.tileId ?? null) : null;
        return { kind: 'extract', beforeId, lineX, top: rects[0].top, height: rects[0].height };
    }

    function handleMergeChipPointerDown(event: PointerEvent, sourceId: string) {
        if (isJunk || $settings.design?.layout !== 'decks' || column?.settings?.isPopup) {
            return;
        }
        const sources = column?.algorithm?.sources ?? [];
        if (column?.algorithm?.type !== 'merge' || sources.length < 2) {
            return;
        }
        const sourceIndex = sources.findIndex(s => s.id === sourceId);
        if (sourceIndex === -1) {
            return;
        }

        const startX = event.clientX;
        const startY = event.clientY;
        const originRect = (event.currentTarget as HTMLElement | null)?.closest(DECK_SLOT_SELECTOR)?.getBoundingClientRect() ?? null;
        let started = false;
        let cancelled = false;

        const handleEscape = (ke: KeyboardEvent) => {
            if (ke.key === 'Escape' && started && !cancelled) {
                cancelled = true;
                tilingDrag.end();
            }
        };
        window.addEventListener('keydown', handleEscape);

        startPointerDrag(event, (e) => {
            if (cancelled) {
                return;
            }
            if (!started) {
                if (Math.hypot(e.clientX - startX, e.clientY - startY) < 6) {
                    return;
                }
                started = true;
                suppressChipClick = true;
                tilingDrag.beginChip(column.id, {
                    name: sources[sourceIndex].name ?? '',
                    color: MERGE_PALETTE[sourceIndex % MERGE_PALETTE.length],
                });
            }
            tilingDrag.setPointer(e.clientX, e.clientY);
            tilingDrag.setPreview(detectChipDrop(e.clientX, e.clientY, originRect));
        }, () => {
            window.removeEventListener('keydown', handleEscape);
            if (cancelled) {
                return;
            }
            const drop = tilingDrag.preview;
            const wasStarted = started;
            tilingDrag.end();
            if (!wasStarted || !drop || drop.kind === 'merge') {
                return;
            }
            animateLayout(() => extractMergeSource(columnState, column.id, sourceId, drop));
        });
    }

    function forceRefresh() {
        isRefreshing = true;
        resetColumnForRefresh(column, columnState);
        unique = Symbol();

        setTimeout(() => {
            isRefreshing = false;
        }, 2000);
    }

    function handleSettingsClick(clear = false) {
        isSettingsOpen = !isSettingsOpen;

        if (clear) {
            forceRefresh();
        }
    }

    function toggleIconPicker() {
        isIconPickerOpen = !isIconPickerOpen;

        if (isIconPickerOpen && column?.algorithm?.type === 'custom' && column.algorithm.algorithm && !column.algorithm.avatar) {
            resolveFeedAvatar(column.algorithm);
        }
    }

    async function resolveFeedAvatar(algorithm: currentAlgorithm) {
        if (!_agent) {
            return;
        }

        try {
            const res = await _agent.xrpc.get('app.bsky.feed.getFeedGenerator', {feed: algorithm.algorithm});
            if (res?.view?.avatar) {
                algorithm.avatar = res.view.avatar;
            }
        } catch (e) {
            console.error(e);
        }
    }

    function handleIconChange(icon) {
        if (!column.settings) {
            column.settings = {};
        }
        column.settings.icon = icon;
        isIconPickerOpen = false;
    }

    function handleScroll(event: Event & { currentTarget: HTMLElement }) {
        if (isMobileViewport.current && !isJunk && !isSplit) {
            scrollDirection(event.currentTarget, 80, (scrollDir) => {
                scrollDirectionState.direction = scrollDir;
            });
        }
    }

    function handleChangePopup() {
        animateLayout(() => {
            column.settings = {...column.settings, isPopup: !column.settings?.isPopup};
        });
    }

    function intersect(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                intersectingIndex.set(slotIndex);
                scrollDirectionState.direction = 'up';
            }
        })
    }

    async function columnAddFromJunk() {
        const _column = {
            ...$state.snapshot(column),
            id: self.crypto.randomUUID(),
            did: _agent.did() as string,
            handle: _agent.handle(),
            scrollElement: undefined,
        }
        _column.algorithm.name = name || column.algorithm.name;

        try {
            if (_column.algorithm.type === 'author' || _column.algorithm.type === 'authorReplies' || _column.algorithm.type === 'authorReposts') {
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

    function setThreadSort(sort: ThreadSort) {
        if (sort === threadSort) {
            return;
        }

        $settings.timeline.threadSort = sort;
        resetColumnForRefresh(column, columnState);
        unique = Symbol();
    }

    function setAuthorMode(mode: AuthorMode) {
        if (mode === authorMode) {
            return;
        }

        if (mode === 'replies' || mode === 'reposts') {
            column.algorithm.type = mode === 'replies' ? 'authorReplies' : 'authorReposts';
            column.settings.timeline.hideReply = 'all';
            column.settings.timeline.hideRepost = 'all';
        } else {
            column.algorithm.type = 'author';
            column.settings.timeline.hideReply = mode === 'filtered' ? 'me' : 'all';
            column.settings.timeline.hideRepost = mode === 'filtered' ? 'none' : 'all';
        }

        columnState.clearFeed(column.id);
        column.data.cursor = undefined;
        unique = Symbol();
    }

    onMount(() => {
        if (!isJunk && column) {
            column.lastRefresh = new Date().toISOString();
        }
    });

    export function getRefreshEl() { return refreshEl; }
    export function refresh() { return handleRefresh(); }
</script>

<div
    class="deck-row"
    class:deck-row--in-split={isSplit}
    class:deck-row--popup={column?.settings?.isPopup === true}
    class:deck-row--bg={column?.settings?.background}
    class:deck-row--decks={$settings.design?.layout === 'decks'}
    class:deck-row--single={$settings.design?.layout === 'default'}
    class:deck-row--compact={publishState.layout === 'bottom'}
    class:deck-row--mobileV2={$settings.design?.mobileNewUi && !isJunk}
    class:deck-row--mobileV2-fixed={$settings.design?.fixedFooter}
    class:deck-row--junk={isJunk}
    class:deck-row--settings-open={isSettingsOpen}
    class:deck-row--tile-dragging={tilingDrag.draggingId === column?.id}
    data-tile-id={$settings.design?.layout === 'decks' && !isJunk && !column?.settings?.isPopup ? column?.id : undefined}
    data-flip-id={column?.id}
    onscroll={handleScroll}
    bind:this={scrollEl}
    style:background-image={column?.settings?.background ? `url(${backgroundsMap.get(column.settings.background)?.url})` : 'none'}
>
    {#snippet settingsModal()}
        <DeckSettingsModal {index} {_agent} layout={$settings.design?.layout} onclose={handleSettingsClick} {isSplit}></DeckSettingsModal>
    {/snippet}

    <div class="deck-heading" data-glass-cover class:deck-heading--sticky={isJunk && column?.algorithm?.type === 'thread'} class:deck-heading--scroll-down={scrollDirectionState.direction === 'down' && !isJunk} data-tour={!isJunk && index === 0 ? 'column-header' : undefined}>
        {#if (!isJunk)}
            {#if showDragHandle}
                <div class="deck-drag-area">
                    <GripVertical size="20" color="var(--border-color-1)"></GripVertical>
                </div>
            {/if}

            <div class="deck-heading__icon">
                <button class="deck-heading__icon-picker-button" aria-label="Change icon" onclick={toggleIconPicker}>
                    <ColumnDisplayIcon {column}></ColumnDisplayIcon>
                </button>
            </div>

            <div
                    role="button"
                    tabindex="0"
                    class="deck-heading__scroll-area"
                    onclick={() => {handleHeaderClick($settings.design?.layout === 'decks' ? scrollEl : (document.querySelector(':root') as HTMLElement | null))}}
                    use:createLongPress={{callback: forceRefresh, duration: 500}}
                    aria-label="Back to top."
            >
                <div class="deck-heading__title">
                    {column?.algorithm?.name}
                    {#if (column?.algorithm?.type === 'merge' && column?.algorithm?.sources?.length)}
                        <span class="merge-chips" role="group" aria-label={$_('merge_sources')}>
                            {#each column.algorithm.sources as source, sourceIndex (source.id)}
                                <button
                                        class="merge-chip"
                                        class:merge-chip--solo={column.data?.mergeSolo === source.id}
                                        class:merge-chip--dimmed={column.data?.mergeSolo && column.data?.mergeSolo !== source.id}
                                        style:--merge-source-color={MERGE_PALETTE[sourceIndex % MERGE_PALETTE.length]}
                                        title="{source.name} — {$_('merge_chip_hint')}"
                                        aria-pressed={column.data?.mergeSolo === source.id}
                                        data-merge-source-id={source.id}
                                        onclick={(e) => {e.stopPropagation(); toggleMergeSolo(source.id)}}
                                        onpointerdown={(e) => {handleMergeChipPointerDown(e, source.id)}}
                                >{source.name}</button>
                            {/each}
                        </span>
                    {:else}
                        <span class="deck-heading__subhead">{column?.handle}</span>
                    {/if}
                </div>
            </div>
        {:else}
            {#if (column?.algorithm?.type === 'thread')}
                <Menu bind:isMenuOpen={isSortMenuOpen} buttonClassName="deck-heading-select" position="bottom-start">
                    {#snippet ref()}
                        <span>{$_(`thread_sort_${threadSort}`)}</span>
                        <ChevronDown size={14}></ChevronDown>
                    {/snippet}

                    {#snippet content()}
                        <ul class="timeline-menu-list">
                            {#each THREAD_SORTS as sort (sort)}
                                <li class="timeline-menu-list__item">
                                    <button class="timeline-menu-list__button" data-thread-sort={sort} aria-pressed={threadSort === sort} onclick={() => { isSortMenuOpen = false; setThreadSort(sort); }}>
                                        <span class="menu-check">
                                            {#if threadSort === sort}
                                                <Check size={16}></Check>
                                            {/if}
                                        </span>
                                        <span>{$_(`thread_sort_${sort}`)}</span>
                                    </button>
                                </li>
                            {/each}
                        </ul>
                    {/snippet}
                </Menu>
            {/if}
        {/if}

        <div class="deck-heading__buttons">
            {#if isJunk && column?.algorithm?.type === 'thread'}
                <button aria-label="Threaded Mode" class="deck-row-column-add-button" class:deck-row-column-add-button--active={$settings?.design?.threaded} onclick={() => {$settings.design.threaded = !$settings.design.threaded}}>
                    <TextQuote size={20} color="var(--deck-row-settings-button-color, var(--primary-color))" strokeWidth="var(--icon-stroke-width, 2px)"></TextQuote>
                </button>
            {/if}

            {#if (isJunk && column?.algorithm?.type !== 'authorLike')}
                <button class="deck-row-column-add-button" disabled={isColumnAlreadyAdded} onclick={columnAddFromJunk} aria-label="Add column">
                    <SquarePlus size={20} color={isColumnAlreadyAdded ? 'var(--border-color-1)' : 'var(--primary-color)'} strokeWidth="var(--icon-stroke-width, 2px)"></SquarePlus>
                </button>
            {/if}

            {#if column?.algorithm?.type === 'chat' && $settings.design?.layout === 'decks' && !isJunk}
                <button class="deck-popup-button only-pc" aria-label="Popup" onclick={handleChangePopup}>
                    <PictureInPicture2 color="var(--text-color-1)"></PictureInPicture2>
                </button>
            {/if}

            {#if column?.algorithm?.type === 'notification' && !isJunk}
                <button class="deck-popup-button only-pc" aria-label="Mark all notifications as read" onclick={handleMarkAllRead}>
                    <CheckCheck color="var(--deck-row-settings-button-color, var(--text-color-3))" strokeWidth="var(--icon-stroke-width, 2px)"></CheckCheck>
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
            <ColumnIconPicker onchange={handleIconChange} onclose={() => {isIconPickerOpen = false}} current={column?.settings?.icon} avatar={column?.algorithm?.type === 'custom' ? column.algorithm.avatar : undefined}></ColumnIconPicker>
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
            disabled={column?.algorithm?.type === 'chat' || column?.algorithm?.type === 'chatList' || $settings.design?.layout === 'default' || !!profileRefreshContext}
    >
        <div class="deck-row__content">
            {#if !isContentDeferred}
                <ColumnContent {index} {_agent} {isJunk} {unique} {isTopScrolling} onrefresh={handleRefresh}></ColumnContent>
            {/if}
        </div>
    </Refresher>
</div>

{#if scrollEl && column?.settings?.autoScroll}
    <ColumnAutoScrolling {column} {index} {isTopScrolling} {isScrollPaused} {unique}></ColumnAutoScrolling>
{/if}

<style lang="postcss">
    .deck-row {
        width: 100%;
        height: 100%;
        flex-shrink: 0;
        position: relative;
        overflow-y: scroll;
        border-radius: var(--deck-inner-radius, 0px);
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
            background-clip: padding-box;
            border: var(--scroll-bar-thumb-inset, 0px) solid transparent;
            border-radius: var(--scroll-bar-border-radius, 0);
        }

        &::-webkit-scrollbar-track {
            background: var(--scroll-bar-bg-color);
            margin-top: calc(var(--deck-heading-height) - 1px);
            margin-bottom: var(--deck-scroll-bar-inset-end, 0px);
            border-top: 1px solid var(--deck-border-color);
        }

        @media (max-width: 767px) {
            scrollbar-color: var(--scroll-bar-color) var(--scroll-bar-bg-color);
            scrollbar-width: thin;
            padding-top: calc(var(--bar-height, 48px) - 2px);
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
                    top: var(--bar-height, 48px);
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

            @media (max-width: 767px) {
                padding-top: 0;
            }

            .deck-heading {
                top: var(--deck-heading-height, 52px);
                padding-left: 16px;

                &:not(.deck-heading--sticky) {
                    border-radius: var(--deck-inner-radius, 0px) var(--deck-inner-radius, 0px) 0 0;
                }
            }
        }

        &--popup {
            @media (min-width: 768px) {
                width: 100%;
                height: 100%;
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
                    padding: 12px 10px calc(var(--bar-bottom-height, 56px) + 4px + var(--safe-area-bottom));
                    height: calc(var(--deck-heading-height) + var(--bar-bottom-height, 56px) + var(--safe-area-bottom));
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
        text-align: left;
        display: flex;
        align-items: center;
        gap: 4px;
        height: var(--deck-heading-height);
        position: sticky;
        top: 0;
        left: 0;
        right: 0;
        background: var(--deck-heading-bg-color);
        z-index: 10;
        border-bottom: 1px solid var(--deck-border-color);
        min-width: 0;
        backdrop-filter: var(--deck-heading-backdrop-filter);

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
            border-radius: var(--deck-heading-icon-border-radius, 5px);
            background: var(--deck-heading-icon-bg-color);
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

        .merge-chips {
            display: flex;
            align-items: center;
            gap: 4px;
            overflow: hidden;
            min-width: 0;
        }

        .merge-chip {
            flex-shrink: 1;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            min-width: 26px;
            height: 18px;
            padding: 0 7px;
            border-radius: 9px;
            font-size: 11px;
            font-weight: normal;
            letter-spacing: 0;
            line-height: 1;
            color: var(--deck-heading-subhead-color);
            background-color: color-mix(in srgb, var(--merge-source-color) 18%, transparent);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            touch-action: none;

            &::before {
                content: '';
                flex-shrink: 0;
                width: 6px;
                height: 6px;
                border-radius: var(--radius-round, 50%);
                background-color: var(--merge-source-color);
            }

            &--solo {
                color: var(--deck-heading-title-color);
                box-shadow: inset 0 0 0 1.5px var(--merge-source-color);
            }

            &--dimmed {
                opacity: .45;
            }
        }

        &__buttons {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        &--sticky {
            position: sticky !important;
            top: var(--deck-heading-height, 52px);
            border-radius: 0;
        }

        &--scroll-down {
            @media (max-width: 767px) {
                opacity: 0;
                visibility: hidden;
                transform: translateY(calc(-1 * var(--bar-height, 48px)));
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
            background-color: var(--state-hover, var(--bg-color-2));
        }

        &--open {
            background-color: var(--primary-color);
            --deck-row-settings-button-color: var(--on-accent, var(--bg-color-1));

            &:hover {
                background-color: var(--primary-color);
            }
        }
    }

    :global(.deck-heading-select) {
        display: flex;
        align-items: center;
        gap: 4px;
        height: 32px;
        padding: 0 10px;
        margin-left: -10px;
        border-radius: var(--radius-control, var(--border-radius-3));
        color: var(--text-color-2);
        font-size: 14px;
        font-weight: bold;
        transition: background-color var(--motion-duration-hover, .2s) var(--motion-easing-hover, ease-in-out);

        @media (hover: hover) {
            &:hover {
                background-color: var(--state-hover, var(--bg-color-2));
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
            --deck-row-settings-button-color: var(--on-accent, var(--bg-color-1));
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
        height: var(--deck-heading-height, 52px);
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
</style>
