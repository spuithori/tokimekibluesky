<script lang="ts">
    import DeckColumn from "./DeckColumn.svelte";
    import LayoutView from "./LayoutView.svelte";
    import GripHorizontal from '@lucide/svelte/icons/grip-horizontal';
    import GripVertical from '@lucide/svelte/icons/grip-vertical';
    import { getColumnState } from "$lib/classes/columnState.svelte";
    import { firstLeafId, type LayoutNode } from "$lib/classes/deckLayout";

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
        event.preventDefault();
        isResizing = true;

        const handle = event.currentTarget as HTMLElement;
        const pointerId = event.pointerId;
        handle.setPointerCapture?.(pointerId);

        const splitNode = node;
        const container = handle.closest('.layout-split') as HTMLElement;
        const rect = container?.getBoundingClientRect();
        const isRow = splitNode.direction === 'row';
        const start = isRow ? event.clientX : event.clientY;
        const total = (isRow ? rect?.width : rect?.height) || 1;
        const startA = splitNode.sizes[childIndex];
        const startB = splitNode.sizes[childIndex + 1];
        const pairSum = startA + startB;

        function onMove(e: PointerEvent) {
            if (e.pointerId !== pointerId) return;
            const delta = (isRow ? e.clientX : e.clientY) - start;
            let a = startA + (delta / total);
            a = Math.max(0.15 * pairSum, Math.min(0.85 * pairSum, a));
            const sizes = [...splitNode.sizes];
            sizes[childIndex] = a;
            sizes[childIndex + 1] = pairSum - a;
            columnState.setNodeSizes(splitNode, sizes);
        }

        function onUp(e: PointerEvent) {
            if (e.pointerId !== pointerId) return;
            isResizing = false;
            handle.releasePointerCapture?.(pointerId);
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
        }

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
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
                    <div class="layout-split__handle">
                        {#if node.direction === 'row'}
                            <GripVertical size="16" color="var(--text-color-3)"></GripVertical>
                        {:else}
                            <GripHorizontal size="16" color="var(--text-color-3)"></GripHorizontal>
                        {/if}
                    </div>
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
        background-color: var(--bg-color-2);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.15s ease;
        user-select: none;
        touch-action: none;

        &--column {
            height: 8px;
            cursor: ns-resize;
            border-top: 1px solid var(--deck-border-color);
            border-bottom: 1px solid var(--deck-border-color);
        }

        &--row {
            width: 8px;
            cursor: ew-resize;
            border-left: 1px solid var(--deck-border-color);
            border-right: 1px solid var(--deck-border-color);
        }

        &:hover,
        &--resizing {
            background-color: var(--bg-color-3);
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
