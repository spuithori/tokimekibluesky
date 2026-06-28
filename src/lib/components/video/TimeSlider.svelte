<script lang="ts">
    import { getContext } from "svelte";

    const player: any = getContext('player');

    let sliderElement: HTMLDivElement | undefined = $state();
    let isDragging = $state(false);
    let seeking = $state(false);
    let previewPercent = $state(0);

    let cachedRect: DOMRect | null = null;
    let rafId: number | null = null;
    let pendingSeekTime = 0;

    const fillPercent = $derived(
        player.duration === 0
            ? 0
            : (isDragging || seeking)
                ? previewPercent
                : (player.currentTime / player.duration) * 100
    );

    $effect(() => {
        if (seeking && player.duration > 0 && Math.abs(player.currentTime - pendingSeekTime) < 0.5) {
            seeking = false;
        }
    });

    function handlePointerDown(e: PointerEvent) {
        if (!sliderElement) return;
        isDragging = true;
        sliderElement.setPointerCapture(e.pointerId);

        cachedRect = sliderElement.getBoundingClientRect();
        updatePreview(e);
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isDragging) return;

        if (rafId !== null) return;

        rafId = requestAnimationFrame(() => {
            updatePreview(e);
            rafId = null;
        });
    }

    function handlePointerUp(e: PointerEvent) {
        if (!sliderElement || !isDragging) return;
        isDragging = false;
        sliderElement.releasePointerCapture(e.pointerId);

        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }

        updatePreview(e);
        cachedRect = null;

        if (player.duration > 0) {
            seeking = true;
            player.seek(pendingSeekTime);
        }
    }

    function updatePreview(e: PointerEvent) {
        if (!sliderElement || player.duration === 0) return;

        const rect = cachedRect || sliderElement.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        pendingSeekTime = percentage * player.duration;
        previewPercent = percentage * 100;
    }
</script>

<div
    bind:this={sliderElement}
    class="video-time-slider"
    class:video-time-slider--visible={player.isHovering || player.paused}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    role="slider"
    aria-label="Seek"
    aria-valuemin={0}
    aria-valuemax={player.duration}
    aria-valuenow={player.currentTime}
    tabindex="0"
    style="--slider-duration: {player.duration}; --slider-current: {player.currentTime}; --slider-fill: {fillPercent}%"
>
    <div class="video-time-slider__filler"></div>
</div>

<style lang="postcss">
    .video-time-slider {
        position: absolute;
        left: 8px;
        right: 8px;
        bottom: 40px;
        height: 4px;
        background-color: rgba(211, 211, 211, .5);
        border-radius: 2px;
        cursor: pointer;
        opacity: 0;
        transition: all .2s ease-in-out;

        &--visible {
            opacity: 1;
        }

        &:hover {
            &::after {
                transform: scale(1);
            }
        }

        &::before {
            content: '';
            display: block;
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            background-color: var(--primary-color);
            width: var(--slider-fill, 0%);
            border-radius: 2px;
        }

        &::after {
            content: '';
            width: 14px;
            height: 14px;
            position: absolute;
            background-color: var(--primary-color);
            border-radius: 50%;
            box-shadow: 0 0 4px var(--box-shadow-color-1);
            top: -5px;
            left: calc(var(--slider-fill, 0%) - 6px);
            transform: scale(0);
            transition: transform .2s ease-in-out;
        }

        &__filler {
            display: block;
            position: absolute;
            left: 0;
            right: 0;
            bottom: -4px;
            top: -12px;
        }
    }
</style>