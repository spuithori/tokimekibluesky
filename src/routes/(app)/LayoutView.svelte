<script lang="ts">
    import DeckColumn from "./DeckColumn.svelte";
    import LayoutView from "./LayoutView.svelte";
    import GripHorizontal from '@lucide/svelte/icons/grip-horizontal';
    import { getColumnState } from "$lib/classes/columnState.svelte";
    import { firstLeafId, type LayoutNode } from "$lib/classes/deckLayout";
    import { startPointerDrag } from "$lib/pointerDrag";

    interface Props {
        node: LayoutNode;
        isJunk?: boolean;
        isScrollPaused?: boolean;
        showDragHandle?: boolean;
        depth?: number;
    }

    let { node, isJunk = false, isScrollPaused = false, showDragHandle = false, depth = 0 }: Props = $props();

    const columnState = getColumnState(isJunk);
    let isResizing = $state(false);

    function childKey(child: LayoutNode): string {
        return firstLeafId(child);
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
            <div class="layout-split__pane" style="flex: {node.sizes[i]}">
                <LayoutView
                    node={child}
                    {isJunk}
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
{:else}
    {@const index = columnState.getColumnIndex(node.columnId)}
    <DeckColumn {index} {isJunk} {isScrollPaused} isSplit={depth > 0} {showDragHandle}></DeckColumn>
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
</style>
