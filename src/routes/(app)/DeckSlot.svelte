<script lang="ts">
    import {settings} from "$lib/stores";
    import {getColumnState, setScopedColumnState} from "$lib/classes/columnState.svelte";
    import {tilingDrag} from "$lib/classes/tilingDragState.svelte";
    import {animateLayout} from "$lib/animations/flip";
    import {clampDeckWidth} from "$lib/deckWidth";
    import {startPointerDrag} from "$lib/pointerDrag";
    import { sortable } from "$lib/attachments/sortable.svelte";
    import { riceState } from "$lib/rice/riceState.svelte";
    import LayoutView from "./LayoutView.svelte";
    import DeckColumn from "./DeckColumn.svelte";

    interface Props {
        index?: number;
        isJunk?: boolean;
        name?: any;
        _agent?: any;
    }

    let {
        index = 0,
        isJunk = false,
        name = undefined,
        _agent = undefined,
    }: Props = $props();

    const columnState = getColumnState(isJunk);
    setScopedColumnState(columnState);
    const slot = $derived(columnState.getSlot(index));
    const isSplitLayout = $derived(!!slot && slot.layout.type !== 'leaf');
    const leafIndex = $derived(columnState.getColumnIndex(columnState.leafIdsOf(index)[0]));
    const column = $derived(columnState.getColumn(leafIndex));
    const widthValue = $derived(column?.settings?.width ?? 'medium');

    let isScrollPaused = $state(false);
    let isMobile = $state(false);
    let slotEl = $state<HTMLElement | undefined>();
    let isWidthResizing = $state(false);

    $effect(() => {
        if (typeof window !== 'undefined') {
            const checkMobile = () => { isMobile = window.innerWidth <= 767; };
            checkMobile();
            window.addEventListener('resize', checkMobile);
            return () => window.removeEventListener('resize', checkMobile);
        }
    });

    function handleMouseEnter() { isScrollPaused = true; }
    function handleMouseLeave() { isScrollPaused = false; }

    function reorderColumns(from: number, to: number) {
        columnState.reorderVisibleSlots(from, to);
    }

    const riceStyle = $derived(riceState.styleForColumn(column));
    const useSplitLayout = $derived(isSplitLayout && !isMobile && !isJunk && $settings.design?.layout !== 'default');
    const showDragHandle = $derived(!column?.settings?.isPopup && $settings.design?.layout === 'decks');
    const showWidthBar = $derived(
        $settings.design?.layout === 'decks'
        && !isMobile
        && !isJunk
        && !column?.settings?.isPopup
    );

    function startWidthResize(event: PointerEvent) {
        if (isMobile || !slotEl || !column) return;
        const cols = slot?.layout?.type === 'tabs'
            ? columnState.leafIdsOf(index)
                .map((id) => columnState.getColumn(columnState.getColumnIndex(id)))
                .filter((c) => !!c)
            : [column];
        const startX = event.clientX;
        const startWidth = slotEl.offsetWidth;
        isWidthResizing = true;
        columnState.isResizingWidth = true;
        startPointerDrag(
            event,
            (e) => {
                const width = clampDeckWidth(startWidth + (e.clientX - startX));
                for (const col of cols) col.settings.width = width;
            },
            () => { isWidthResizing = false; columnState.isResizingWidth = false; },
        );
    }
</script>

<div
    class="deck-row-wrap"
     class:deck-row-wrap--single={$settings.design?.layout === 'default'}
     style={riceStyle || null}
     {@attach !isJunk && sortable(() => ({
         axis: 'x',
         participantSelector: '.deck-row-wrap',
         handle: '.deck-drag-area',
         disabled: $settings.design?.layout === 'default',
         onReorder: reorderColumns,
         onDragStart: (dragId) => { columnState.isReordering = true; tilingDrag.begin(dragId ?? column?.id ?? ''); },
         onDragEnd: () => { columnState.isReordering = false; tilingDrag.end(); },
         tileSelector: $settings.design?.layout === 'decks' ? '[data-tile-id]' : undefined,
         onTilePreview: (p) => tilingDrag.setPreview(p),
         onDragMove: (x, y) => tilingDrag.setPointer(x, y),
         onTile: (sourceId, target) => animateLayout(() => tilingDrag.applySplit(columnState, sourceId, target)),
         onExtract: (sourceId, target) => {
             if (!target) return;
             const i = target.beforeId ? columnState.slotIndexOf(target.beforeId) : columnState.slots.length;
             animateLayout(() => columnState.moveLeafToSlot(sourceId, i));
         },
     }))}
>
    <div
        class="deck-row-slot {typeof widthValue === 'string' ? `deck-row-slot--${widthValue}` : ''}"
        class:deck-row-slot--split={useSplitLayout}
        class:deck-row-slot--popup={column?.settings?.isPopup === true}
        class:deck-row-slot--decks={$settings.design?.layout === 'decks'}
        class:deck-row-slot--single={$settings.design?.layout === 'default'}
        class:deck-row-slot--junk={isJunk}
        style:--deck-col-width={typeof widthValue === 'number' ? `${widthValue}px` : null}
        onmouseenter={handleMouseEnter}
        onmouseleave={handleMouseLeave}
        role="group"
        bind:this={slotEl}
    >
        {#if useSplitLayout}
            <LayoutView
                node={slot.layout}
                {isScrollPaused}
                {showDragHandle}
            ></LayoutView>
        {:else}
            <DeckColumn
                index={leafIndex}
                {name}
                {_agent}
                {isScrollPaused}
                {showDragHandle}
            ></DeckColumn>
        {/if}
    </div>

    {#if showWidthBar}
        <div
            class="deck-width-bar"
            class:deck-width-bar--active={isWidthResizing}
            onpointerdown={startWidthResize}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize column width"
        ></div>
    {/if}
</div>

<style lang="postcss">
    .deck-row-wrap {
        position: relative;
        touch-action: auto !important;
        background-color: var(--deck-content-bg-color);
        backdrop-filter: var(--deck-content-backdrop-filter, none);
        border: var(--deck-border, var(--deck-border-width) solid var(--deck-border-color));
        border-radius: var(--deck-border-radius);
        box-shadow: var(--deck-box-shadow);
        overflow: clip;
        opacity: var(--rice-column-opacity, 1);

        @media (max-width: 767px) {
            border-radius: 0;
            box-shadow: none;
        }

        &:not(.deck-row-wrap--single):not(:has(.deck-row-slot--junk)):has(~ :global(.deck-row-wrap))::after {
            content: '';
            position: absolute;
            inset: 0 0 0 auto;
            width: 0;
            border-right: var(--deck-divider, var(--deck-border-right, none));
            pointer-events: none;
            z-index: 1;
        }

        &--single {
            position: static;
            display: contents;
        }

        &:has(.deck-row-slot--junk) {
            border: none;
            overflow: visible;
        }
    }

    .deck-row-slot {
        width: var(--rice-column-width, var(--deck-col-width, var(--deck-m-width)));
        flex-shrink: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        container: deck-column / size;

        @media (max-width: 767px) {
            width: 100vw;
            scroll-snap-align: start;
            scroll-snap-stop: always;
            height: calc(100dvh);
        }

        &--xxs { --deck-col-width: var(--deck-xxs-width); }
        &--xs { --deck-col-width: var(--deck-xs-width); }
        &--small { --deck-col-width: var(--deck-s-width); }
        &--medium { --deck-col-width: var(--deck-m-width); }
        &--large { --deck-col-width: var(--deck-l-width); }
        &--xl { --deck-col-width: var(--deck-xl-width); }
        &--xxl { --deck-col-width: var(--deck-xxl-width); }

        &--single {
            height: auto;
            width: auto;
            overflow: visible;
            display: block;
            container-type: normal;
        }

        &--junk {
            overflow: visible;
            width: 100%;
            height: auto;
            display: block;
            container-type: normal;
        }

        &--popup {
            @media (min-width: 768px) {
                width: 100%;
                height: 100%;
            }
        }
    }

    .deck-row-wrap:global(.dragging) {
        position: relative;
        z-index: 100000;
        transition: none;
        box-shadow: 0 12px 32px rgba(0, 0, 0, .28);
    }
</style>
