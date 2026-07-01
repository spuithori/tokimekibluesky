<script lang="ts">
    import { tilingDrag } from "$lib/classes/tilingDragState.svelte";
    import { getColumnState } from "$lib/classes/columnState.svelte";
    import { iconMap } from "$lib/columnIcons";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";

    const columnState = getColumnState();
    const column = $derived(columnState.columns.find((c) => c.id === tilingDrag.draggingId));
    const CustomIcon = $derived(column?.settings?.icon ? iconMap.get(column.settings.icon) : undefined);
</script>

{#if tilingDrag.draggingId && tilingDrag.pointer && column}
    <div
        class="tile-ghost"
        style:transform="translate3d({tilingDrag.pointer.x}px, {tilingDrag.pointer.y}px, 0)"
    >
        <div class="tile-ghost__card">
            <span class="tile-ghost__icon">
                {#if CustomIcon}
                    <CustomIcon color="var(--primary-color)" strokeWidth="var(--icon-stroke-width, 2px)" />
                {:else}
                    <ColumnIcon type={column.algorithm?.type} color="var(--primary-color)" />
                {/if}
            </span>
            <span class="tile-ghost__name">{column.algorithm?.name}</span>
        </div>
    </div>
{/if}

<style lang="postcss">
    .tile-ghost {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 10001;
        pointer-events: none;
        will-change: transform;
    }

    .tile-ghost__card {
        transform: translate(14px, 14px) rotate(-2.5deg);
        transform-origin: top left;
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 240px;
        padding: 9px 13px;
        background-color: var(--bg-color-1);
        border: 1.5px solid var(--primary-color);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, .3), 0 0 0 1px color-mix(in srgb, var(--primary-color) 18%, transparent);
        animation: tile-ghost-in .12s cubic-bezier(0.2, 0, 0, 1);
    }

    .tile-ghost__icon {
        display: grid;
        place-content: center;
        flex-shrink: 0;
        width: 22px;
        height: 22px;
    }

    .tile-ghost__name {
        font-weight: bold;
        font-size: 13px;
        letter-spacing: .03em;
        color: var(--text-color-1);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    @keyframes tile-ghost-in {
        from {
            opacity: 0;
            transform: translate(14px, 14px) rotate(-2.5deg) scale(.86);
        }
        to {
            opacity: 1;
            transform: translate(14px, 14px) rotate(-2.5deg) scale(1);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .tile-ghost__card {
            animation: none;
        }
    }
</style>
