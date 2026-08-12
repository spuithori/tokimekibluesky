<script lang="ts">
    import { tilingDrag } from "$lib/classes/tilingDragState.svelte";

    const BAR = 5;

    const box = $derived.by(() => {
        const p = tilingDrag.preview;
        if (!p) return null;
        if (p.kind === 'extract') {
            return { kind: 'extract' as const, left: p.lineX - BAR / 2, top: p.top, width: BAR, height: p.height };
        }
        const { x, y, w, h } = p.rect;
        switch (p.zone) {
            case 'top': return { kind: 'split' as const, left: x, top: y, width: w, height: h / 2 };
            case 'bottom': return { kind: 'split' as const, left: x, top: y + h / 2, width: w, height: h / 2 };
            case 'left': return { kind: 'split' as const, left: x, top: y, width: w / 2, height: h };
            case 'right': return { kind: 'split' as const, left: x + w / 2, top: y, width: w / 2, height: h };
        }
    });
</script>

{#if tilingDrag.draggingId && box}
    <div
        class="tile-drop-hint"
        class:tile-drop-hint--extract={box.kind === 'extract'}
        style:left="{box.left}px"
        style:top="{box.top}px"
        style:width="{box.width}px"
        style:height="{box.height}px"
    ></div>
{/if}

<style lang="postcss">
    .tile-drop-hint {
        position: fixed;
        z-index: 9999;
        pointer-events: none;
        background-color: color-mix(in srgb, var(--primary-color) 20%, transparent);
        border: 2px solid var(--primary-color);
        border-radius: var(--border-radius-2, 6px);
        box-shadow:
            inset 0 0 0 1px color-mix(in srgb, var(--bg-color-1) 45%, transparent),
            0 0 22px color-mix(in srgb, var(--primary-color) 42%, transparent);
        transition: left .1s ease, top .1s ease, width .1s ease, height .1s ease;
        will-change: left, top, width, height;
        animation: tile-hint-in .14s cubic-bezier(0.2, 0, 0, 1);
    }

    .tile-drop-hint--extract {
        background-color: var(--primary-color);
        border: none;
        box-shadow: 0 0 16px color-mix(in srgb, var(--primary-color) 70%, transparent);
    }

    @keyframes tile-hint-in {
        from {
            opacity: 0;
            transform: scale(.96);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .tile-drop-hint {
            animation: none;
            transition: none;
        }
    }
</style>
