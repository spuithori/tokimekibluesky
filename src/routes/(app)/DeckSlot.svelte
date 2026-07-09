<script lang="ts">
    import {settings} from "$lib/stores";
    import {getColumnState, setScopedColumnState} from "$lib/classes/columnState.svelte";
    import {firstLeafId} from "$lib/classes/deckLayout";
    import {tilingDrag} from "$lib/classes/tilingDragState.svelte";
    import {animateLayout} from "$lib/animations/flip";
    import {clampDeckWidth, clampShellWidth, parseShellWidthPx, resolveDeckWidthPx, SHELL_WIDTH_DEFAULT, tileWeightForTargetWidth} from "$lib/deckWidth";
    import {measureTileContext} from "$lib/tileMeasure";
    import {shellResizeState} from "$lib/classes/shellResizeState.svelte";
    import {settingsStore} from "$lib/settings/settings.svelte";
    import {setValueInText} from "$lib/rice/config/edit";
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
    const leafIndex = $derived(slot ? columnState.getColumnIndex(firstLeafId(slot.layout)) : -1);
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
    const useSplitLayout = $derived(isSplitLayout && !isJunk && (slot?.layout.type === 'tabs' || (riceState.layoutStyle === 'deck' && !isMobile)));
    const showDragHandle = $derived(!column?.settings?.isPopup && riceState.layoutStyle === 'deck');
    const tileMode = $derived(
        riceState.layoutMode === 'tile'
        && riceState.layoutStyle === 'deck'
        && !isJunk
        && column?.settings?.isPopup !== true
    );
    const shellResizeTarget = $derived(
        tileMode
        && riceState.compiled.layout?.shell === 'centered'
        && columnState.visibleSlotCount() === 1
    );
    const showWidthBar = $derived(
        riceState.layoutStyle === 'deck'
        && !isMobile
        && !isJunk
        && !column?.settings?.isPopup
        && (shellResizeTarget || !riceStyle.includes('--rice-column-width'))
    );
    const tileWeight = $derived(clampDeckWidth(resolveDeckWidthPx(widthValue)));

    function startShellResize(event: PointerEvent) {
        const startShell = parseShellWidthPx(riceState.compiled.layout?.shellWidth) ?? SHELL_WIDTH_DEFAULT;
        const startX = event.clientX;
        isWidthResizing = true;
        startPointerDrag(
            event,
            (e) => {
                shellResizeState.previewWidth = clampShellWidth(startShell + 2 * (e.clientX - startX));
            },
            () => {
                isWidthResizing = false;
                const committed = shellResizeState.previewWidth;
                shellResizeState.previewWidth = null;
                if (committed != null) {
                    settingsStore.rice.config = setValueInText(
                        settingsStore.rice.config ?? '',
                        [{ name: 'layout' }],
                        'shellwidth',
                        `${committed}px`,
                    );
                }
            },
        );
    }

    function startWidthResize(event: PointerEvent) {
        if (isMobile || !slotEl || !column) return;
        if (shellResizeTarget) {
            startShellResize(event);
            return;
        }
        const cols = slot?.layout?.type === 'tabs'
            ? columnState.leafIdsOf(index)
                .map((id) => columnState.getColumn(columnState.getColumnIndex(id)))
                .filter((c) => !!c)
            : [column];
        const startX = event.clientX;
        const startWidth = slotEl.offsetWidth;
        const tileResize = tileMode;
        let containerPx = 0;
        let otherWeightsSum = 0;
        if (tileResize) {
            const ctx = measureTileContext(columnState, index, slotEl.closest<HTMLElement>('.deck'));
            if (ctx) {
                containerPx = ctx.containerPx;
                otherWeightsSum = ctx.otherWeightsSum;
            }
        }
        isWidthResizing = true;
        columnState.isResizingWidth = true;
        startPointerDrag(
            event,
            (e) => {
                const target = startWidth + (e.clientX - startX);
                const width = tileResize
                    ? tileWeightForTargetWidth(target, otherWeightsSum, containerPx)
                    : clampDeckWidth(target);
                for (const col of cols) col.settings.width = width;
            },
            () => { isWidthResizing = false; columnState.isResizingWidth = false; },
        );
    }
</script>

<div
    class="deck-row-wrap"
     class:deck-row-wrap--single={riceState.layoutStyle === 'single'}
     class:deck-row-wrap--tile={tileMode}
     style={riceStyle || null}
     style:--deck-tile-weight={tileMode ? tileWeight : null}
     {@attach !isJunk && sortable(() => ({
         axis: 'x',
         participantSelector: '.deck-row-wrap',
         handle: '.deck-drag-area',
         disabled: riceState.layoutStyle === 'single',
         onReorder: reorderColumns,
         onDragStart: (dragId) => { columnState.isReordering = true; tilingDrag.begin(dragId ?? column?.id ?? ''); },
         onDragEnd: () => { columnState.isReordering = false; tilingDrag.end(); },
         tileSelector: riceState.layoutStyle === 'deck' ? '[data-tile-id]' : undefined,
         edgeScrollContainer: riceState.layoutStyle === 'deck' && !isMobile
             ? (n) => n.closest<HTMLElement>('.deck')
             : undefined,
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
        class:deck-row-slot--tile={tileMode}
        class:deck-row-slot--popup={column?.settings?.isPopup === true}
        class:deck-row-slot--decks={riceState.layoutStyle === 'deck'}
        class:deck-row-slot--single={riceState.layoutStyle === 'single'}
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

        &--tile {
            @media (min-width: 768px) {
                flex-grow: var(--rice-tile-weight, var(--deck-tile-weight, 400));
                flex-shrink: var(--rice-tile-weight, var(--deck-tile-weight, 400));
                flex-basis: 0;
                min-width: 0;
            }
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

        &--tile {
            @media (min-width: 768px) {
                width: auto;
                min-width: 0;
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
