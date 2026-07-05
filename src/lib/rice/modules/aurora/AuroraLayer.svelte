<script lang="ts">
    import { riceState } from '$lib/rice/riceState.svelte';

    const intensity = $derived.by(() => {
        const raw = parseFloat(riceState.moduleConfig('aurora')?.options.intensity ?? '');
        return Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 1) : 0.4;
    });

    function aurora(canvas: HTMLCanvasElement) {
        let cleanup: (() => void) | undefined;
        let cancelled = false;
        import('./scene').then(({ createAuroraScene }) => {
            if (cancelled) return;
            cleanup = createAuroraScene(canvas, () => intensity);
        });
        return () => {
            cancelled = true;
            cleanup?.();
        };
    }
</script>

<canvas class="aurora-layer" {@attach aurora}></canvas>

<style>
    .aurora-layer {
        width: 100%;
        height: 100%;
        display: block;
    }
</style>
