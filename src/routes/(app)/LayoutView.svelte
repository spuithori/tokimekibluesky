<script lang="ts">
    import { flushSync } from "svelte";
    import DeckColumn from "./DeckColumn.svelte";
    import LayoutView from "./LayoutView.svelte";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";
    import GripHorizontal from '@lucide/svelte/icons/grip-horizontal';
    import { getScopedColumnState } from "$lib/classes/columnState.svelte";
    import { firstLeafId, type LayoutNode, type TabsNode } from "$lib/classes/deckLayout";
    import { startPointerDrag } from "$lib/pointerDrag";
    import { riceState } from "$lib/rice/riceState.svelte";
    import { iconMap } from "$lib/columnIcons";
    import { animEasing, animMs } from "$lib/rice/anim";
    import { prefersReducedMotion } from "$lib/animations/flip";

    interface Props {
        node: LayoutNode;
        isScrollPaused?: boolean;
        showDragHandle?: boolean;
        depth?: number;
    }

    let { node, isScrollPaused = false, showDragHandle = false, depth = 0 }: Props = $props();

    const columnState = getScopedColumnState();
    let isResizing = $state(false);
    let draggingTabId = $state<string | null>(null);
    let suppressTabClick = false;

    function onTabPointerDown(event: PointerEvent, tabsNode: TabsNode, tabId: string) {
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
        columnState.setTabsActive(tabsNode, index);
    }

    function childKey(child: LayoutNode): string {
        return firstLeafId(child);
    }

    function paneRiceStyle(child: LayoutNode): string {
        if (child.type !== 'leaf') return '';
        const column = columnState.getColumn(columnState.getColumnIndex(child.columnId));
        return riceState.styleForColumn(column);
    }

    function startResize(event: PointerEvent, childIndex: number) {
        if (node.type !== 'split') return;
        if (typeof window !== 'undefined' && window.innerWidth <= 767) return;
        if (event.button !== 0 && event.pointerType === 'mouse') return;
        isResizing = true;

        const splitNode = node;
        const container = (event.currentTarget as HTMLElement).closest('.layout-split') as HTMLElement;
        const rect = container?.getBoundingClientRect();
        const isRow = splitNode.direction === 'row';
        const start = isRow ? event.clientX : event.clientY;
        const total = (isRow ? rect?.width : rect?.height) || 1;
        const startA = splitNode.sizes[childIndex];
        const startB = splitNode.sizes[childIndex + 1];
        const pairSum = startA + startB;

        startPointerDrag(
            event,
            (e) => {
                const delta = (isRow ? e.clientX : e.clientY) - start;
                let a = startA + (delta / total);
                a = Math.max(0.15 * pairSum, Math.min(0.85 * pairSum, a));
                const sizes = [...splitNode.sizes];
                sizes[childIndex] = a;
                sizes[childIndex + 1] = pairSum - a;
                columnState.setNodeSizes(splitNode, sizes);
            },
            () => { isResizing = false; },
        );
    }
</script>

{#if node.type === 'split'}
    <div class="layout-split layout-split--{node.direction}">
        {#each node.children as child, i (childKey(child))}
            <div class="layout-split__pane" style="flex: {node.sizes[i]};{paneRiceStyle(child)}">
                <LayoutView
                    node={child}
                    {isScrollPaused}
                    {showDragHandle}
                    depth={depth + 1}
                ></LayoutView>
            </div>

            {#if i < node.children.length - 1}
                <div
                    class="layout-split__divider layout-split__divider--{node.direction}"
                    class:layout-split__divider--resizing={isResizing}
                    onpointerdown={(e) => startResize(e, i)}
                    role="separator"
                    aria-orientation={node.direction === 'row' ? 'vertical' : 'horizontal'}
                >
                    {#if node.direction === 'column'}
                        <div class="layout-split__handle">
                            <GripHorizontal size="16" color="var(--text-color-3)"></GripHorizontal>
                        </div>
                    {/if}
                </div>
            {/if}
        {/each}
    </div>
{:else if node.type === 'tabs'}
    {@const tabsNode = node}
    {@const activeId = node.children[Math.max(0, Math.min(node.active ?? 0, node.children.length - 1))]}
    <div class="deck-tabs">
        <div class="deck-tabs__strip" role="tablist">
            {#each node.children as id, i (id)}
                {@const column = columnState.getColumn(columnState.getColumnIndex(id))}
                <button
                    class="deck-tabs__tab"
                    class:deck-tabs__tab--active={id === activeId}
                    class:deck-tabs__tab--dragging={id === draggingTabId}
                    role="tab"
                    aria-selected={id === activeId}
                    onpointerdown={(e) => onTabPointerDown(e, tabsNode, id)}
                    onclick={() => onTabClick(tabsNode, i)}
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
        <div class="deck-tabs__panes">
            {#each node.children as id (id)}
                {@const index = columnState.getColumnIndex(id)}
                <div class="deck-tabs__pane" class:deck-tabs__pane--inactive={id !== activeId}>
                    <DeckColumn {index} {isScrollPaused} isSplit={true} {showDragHandle}></DeckColumn>
                </div>
            {/each}
        </div>
    </div>
{:else}
    {@const index = columnState.getColumnIndex(node.columnId)}
    <DeckColumn {index} {isScrollPaused} isSplit={depth > 0} {showDragHandle}></DeckColumn>
{/if}

<style lang="postcss">
    .layout-split {
        display: flex;
        flex: 1;
        min-height: 0;
        min-width: 0;
        overflow: hidden;

        &--row {
            flex-direction: row;
        }

        &--column {
            flex-direction: column;
        }
    }

    .layout-split__pane {
        position: relative;
        overflow: hidden;
        min-height: 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
        opacity: var(--rice-column-opacity, 1);
    }

    .layout-split__divider {
        flex-shrink: 0;
        position: relative;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        touch-action: none;

        &--column {
            height: 8px;
            cursor: ns-resize;
            background-color: var(--bg-color-2);
            border-top: 1px solid var(--deck-border-color);
            border-bottom: 1px solid var(--deck-border-color);
            transition: background-color 0.15s ease;

            &:hover,
            &.layout-split__divider--resizing {
                background-color: var(--bg-color-3);
            }

            @media (prefers-reduced-motion: reduce) {
                transition: none;
            }
        }

        &--row {
            width: 8px;
            cursor: ew-resize;

            &::after {
                content: '';
                width: 4px;
                height: 56px;
                max-height: 40%;
                border-radius: 4px;
                background: var(--primary-color);
                box-shadow: 0 0 0 1px var(--bg-color-1);
                opacity: 0;
                transition: opacity .15s ease;
            }

            &:hover::after,
            &.layout-split__divider--resizing::after {
                opacity: 1;
            }

            @media (prefers-reduced-motion: reduce) {
                &::after {
                    transition: none;
                }
            }
        }
    }

    .layout-split__handle {
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.6;
        pointer-events: none;
    }

    .deck-tabs {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        min-width: 0;
    }

    .deck-tabs__strip {
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
        content-visibility: hidden;
        visibility: hidden;
        pointer-events: none;
    }
</style>
