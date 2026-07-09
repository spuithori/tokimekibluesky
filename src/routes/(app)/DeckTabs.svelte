<script lang="ts" module>
    const stripScrollMemory = new Map<string, number>();
</script>

<script lang="ts">
    import { flushSync } from "svelte";
    import { SvelteSet } from "svelte/reactivity";
    import DeckColumn from "./DeckColumn.svelte";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";
    import { getScopedColumnState } from "$lib/classes/columnState.svelte";
    import type { TabsNode } from "$lib/classes/deckLayout";
    import { startPointerDrag } from "$lib/pointerDrag";
    import { iconMap } from "$lib/columnIcons";
    import { animEasing, animMs } from "$lib/rice/anim";
    import { prefersReducedMotion } from "$lib/animations/flip";
    import { riceState } from "$lib/rice/riceState.svelte";

    interface Props {
        node: TabsNode;
        isScrollPaused?: boolean;
        showDragHandle?: boolean;
        stripOnly?: boolean;
    }

    let { node, isScrollPaused = false, showDragHandle = false, stripOnly = false }: Props = $props();
    const flow = $derived(riceState.layoutStyle === 'single');

    const columnState = getScopedColumnState();
    let draggingTabId = $state<string | null>(null);
    let suppressTabClick = false;
    let suppressReveal = false;
    let hasRevealed = false;

    const scrollMemoryKey = $derived(node.children[0]);

    const activeId = $derived(node.children[Math.max(0, Math.min(node.active ?? 0, node.children.length - 1))]);
    const isCarousel = $derived(node.kind === 'feedtabs');

    const visitedIds = new SvelteSet<string>();
    $effect(() => {
        visitedIds.add(activeId);
    });

    function centerActiveTab(el: HTMLElement, behavior: ScrollBehavior) {
        const strip = el.closest('.deck-tabs__strip') as HTMLElement | null;
        if (!strip) return;
        const pad = 24;
        const left = el.offsetLeft;
        const right = left + el.offsetWidth;
        const viewLeft = strip.scrollLeft;
        const viewRight = viewLeft + strip.clientWidth;
        if (left >= viewLeft + pad && right <= viewRight - pad) return;
        const target = right > viewRight - pad ? right - strip.clientWidth + pad : left - pad;
        strip.scrollTo({
            left: target,
            behavior: prefersReducedMotion() ? 'auto' : behavior,
        });
    }

    function onStripPointerDown(event: PointerEvent, strip: HTMLElement) {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        const pointerId = event.pointerId;
        const startX = event.clientX;
        const startScroll = strip.scrollLeft;
        let moved = false;
        suppressTabClick = false;
        const move = (e: PointerEvent) => {
            if (e.pointerId !== pointerId) return;
            if (!moved && Math.abs(e.clientX - startX) < 4) return;
            moved = true;
            strip.scrollLeft = startScroll - (e.clientX - startX);
        };
        const up = (e: PointerEvent) => {
            if (e.pointerId !== pointerId) return;
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            document.removeEventListener('pointercancel', up);
            suppressTabClick = moved;
        };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', up);
    }

    function onTabPointerDown(event: PointerEvent, tabsNode: TabsNode, tabId: string) {
        if (isCarousel || tabsNode.source) return;
        if (event.button !== 0 && event.pointerType === 'mouse') return;
        suppressTabClick = false;
        const button = event.currentTarget as HTMLElement;
        const strip = button.closest('.deck-tabs__strip') as HTMLElement | null;
        if (!strip) return;
        const startX = event.clientX;
        let moved = false;
        let grab = 0;
        let naturalPos = 0;
        let off = 0;

        const otherTabs = () =>
            (Array.from(strip.querySelectorAll('.deck-tabs__tab')) as HTMLElement[]).filter((el) => el !== button);

        startPointerDrag(
            event,
            (e) => {
                if (!moved && Math.abs(e.clientX - startX) < 6) return;
                if (!moved) {
                    moved = true;
                    draggingTabId = tabId;
                    naturalPos = button.getBoundingClientRect().left;
                    grab = startX - naturalPos;
                }
                off = e.clientX - grab - naturalPos;
                button.style.transform = `translateX(${off}px)`;

                const from = tabsNode.children.indexOf(tabId);
                if (from === -1) return;
                const center = button.getBoundingClientRect().left + button.offsetWidth / 2;
                const target = otherTabs().filter((el) => {
                    const r = el.getBoundingClientRect();
                    return r.left + r.width / 2 < center;
                }).length;
                if (target === from) return;

                const first = new Map(otherTabs().map((el) => [el, el.getBoundingClientRect()]));
                flushSync(() => columnState.moveTab(tabsNode, from, target));
                if (!prefersReducedMotion()) {
                    for (const el of otherTabs()) {
                        const before = first.get(el);
                        if (!before) continue;
                        const dx = before.left - el.getBoundingClientRect().left;
                        if (!dx) continue;
                        el.animate(
                            [{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }],
                            { duration: animMs('reorder', 220), easing: animEasing('reorder', 'cubic-bezier(0.2, 0, 0, 1)'), fill: 'none' },
                        );
                    }
                }
                naturalPos = button.getBoundingClientRect().left - off;
                off = e.clientX - grab - naturalPos;
                button.style.transform = `translateX(${off}px)`;
            },
            () => {
                button.style.transform = '';
                draggingTabId = null;
                suppressTabClick = moved;
            },
        );
    }

    function onTabClick(tabsNode: TabsNode, index: number) {
        if (suppressTabClick) {
            suppressTabClick = false;
            return;
        }
        suppressReveal = true;
        columnState.setTabsActive(tabsNode, index);
    }

</script>

<div class="deck-tabs" class:deck-tabs--strip-only={stripOnly} class:deck-tabs--flow={flow}>
    <div
        class="deck-tabs__strip"
        class:deck-tabs__strip--carousel={isCarousel}
        role="tablist"
        tabindex="-1"
        {@attach (el) => {
            const key = scrollMemoryKey;
            const saved = stripScrollMemory.get(key);
            if (saved !== undefined && Math.abs(el.scrollLeft - saved) > 1) {
                el.scrollLeft = saved;
            }
            const onScroll = () => stripScrollMemory.set(key, el.scrollLeft);
            el.addEventListener('scroll', onScroll, { passive: true });
            return () => el.removeEventListener('scroll', onScroll);
        }}
        {@attach (el) => {
            if (!isCarousel) return;
            const onDown = (e: PointerEvent) => onStripPointerDown(e, el);
            el.addEventListener('pointerdown', onDown);
            return () => el.removeEventListener('pointerdown', onDown);
        }}
    >
        {#each node.children as id, i (id)}
            {@const column = columnState.getColumn(columnState.getColumnIndex(id))}
            <button
                class="deck-tabs__tab"
                class:deck-tabs__tab--active={id === activeId}
                class:deck-tabs__tab--dragging={id === draggingTabId}
                role="tab"
                aria-selected={id === activeId}
                onmousedown={(e) => e.preventDefault()}
                onpointerdown={(e) => onTabPointerDown(e, node, id)}
                onclick={() => onTabClick(node, i)}
                {@attach (el) => {
                    if (!isCarousel || id !== activeId) return;
                    if (suppressReveal) {
                        suppressReveal = false;
                        hasRevealed = true;
                        return;
                    }
                    const firstMount = !hasRevealed;
                    hasRevealed = true;
                    if (firstMount && stripScrollMemory.has(scrollMemoryKey)) return;
                    centerActiveTab(el, firstMount ? 'auto' : 'smooth');
                }}
            >
                {#if column?.settings?.icon && iconMap.get(column.settings.icon)}
                    {@const CustomIcon = iconMap.get(column.settings.icon)}
                    <CustomIcon size={14} color="currentColor" strokeWidth="var(--icon-stroke-width, 2px)"></CustomIcon>
                {:else}
                    <ColumnIcon type={column?.algorithm?.type} color="currentColor" size={14}></ColumnIcon>
                {/if}
                <span class="deck-tabs__label">{column?.algorithm?.name ?? ''}</span>
            </button>
        {/each}
    </div>
    {#if !stripOnly}
        <div class="deck-tabs__panes">
            {#each node.children as id (id)}
                {@const index = columnState.getColumnIndex(id)}
                <div class="deck-tabs__pane" class:deck-tabs__pane--inactive={id !== activeId}>
                    {#if visitedIds.has(id)}
                        <DeckColumn {index} {isScrollPaused} isSplit={true} {showDragHandle}></DeckColumn>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style lang="postcss">
    .deck-tabs {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        min-width: 0;
    }

    .deck-tabs--strip-only {
        flex: none;
    }

    .deck-tabs__strip {
        position: relative;
        flex-shrink: 0;
        display: flex;
        align-items: stretch;
        height: var(--deck-tabs-height, 36px);
        background-color: var(--deck-tabs-bg-color, var(--deck-heading-bg-color));
        border-bottom: 1px solid var(--deck-tabs-border-color, var(--deck-border-color));
        overflow-x: auto;
        scrollbar-width: none;
        user-select: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    .deck-tabs__strip--carousel {
        touch-action: pan-x;
        overscroll-behavior-x: contain;

        .deck-tabs__tab {
            flex: 0 0 auto;
            padding: 0 14px;
        }
    }

    .deck-tabs__tab {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 0 10px;
        border-bottom: 2px solid transparent;
        color: var(--deck-tabs-color, var(--text-color-3));
        font-size: 13px;
        font-weight: bold;
        transition: color var(--anim-hover-duration, .15s) var(--anim-hover-easing, ease);

        &:hover {
            color: var(--deck-tabs-active-color, var(--text-color-1));
        }
    }

    .deck-tabs__tab--active {
        color: var(--deck-tabs-active-color, var(--text-color-1));
        border-bottom-color: var(--deck-tabs-active-border-color, var(--primary-color));
    }

    .deck-tabs__tab--dragging {
        position: relative;
        z-index: 2;
        background-color: var(--deck-tabs-bg-color, var(--deck-heading-bg-color));
        box-shadow: 0 2px 10px rgba(0, 0, 0, .25);
        opacity: .9;
        cursor: grabbing;
        transition: none;
    }

    .deck-tabs__tab :global(svg) {
        flex-shrink: 0;
    }

    .deck-tabs__label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .deck-tabs__panes {
        position: relative;
        flex: 1;
        min-height: 0;
    }

    .deck-tabs__pane {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        min-height: 0;
    }

    .deck-tabs__pane--inactive {
        visibility: hidden;
        opacity: 0;
        pointer-events: none;
    }

    .deck-tabs--flow {
        flex: none;

        .deck-tabs__strip {
            position: sticky;
            top: var(--rice-statusbar-top-height, 0px);
            z-index: 100;
        }

        .deck-tabs__panes {
            position: static;
            flex: none;

            :global(.deck-row--single .deck-heading) {
                top: calc(var(--rice-statusbar-top-height, 0px) + var(--deck-tabs-height, 36px));
            }
        }

        .deck-tabs__pane {
            position: static;
        }

        .deck-tabs__pane--inactive {
            display: none;
        }

        @media (max-width: 767px) {
            padding-top: var(--rice-switcher-top-height, 46px);

            .deck-tabs__strip {
                top: calc(var(--rice-statusbar-top-height, 0px) + var(--rice-switcher-top-height, 46px));
            }

            .deck-tabs__panes {
                :global(.deck-row) {
                    padding-top: 0;
                }

                :global(.deck-row--single .deck-heading) {
                    top: calc(var(--rice-statusbar-top-height, 0px) + var(--rice-switcher-top-height, 46px) + var(--deck-tabs-height, 36px));
                }
            }
        }
    }
</style>
