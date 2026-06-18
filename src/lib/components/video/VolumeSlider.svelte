<script lang="ts">
    import { getContext } from "svelte";

    const player: any = getContext('player');

    let sliderElement: HTMLDivElement | undefined = $state();
    let isDragging = $state(false);

    $effect(() => {
        if (sliderElement) {
            const percentage = player.volume * 100;
            sliderElement.style.setProperty('--slider-fill', `${percentage}%`);
        }
    });

    function handlePointerDown(e: PointerEvent) {
        if (!sliderElement) return;
        isDragging = true;
        sliderElement.setPointerCapture(e.pointerId);
        updateVolume(e);
    }

    function handlePointerMove(e: PointerEvent) {
        if (!isDragging) return;
        updateVolume(e);
    }

    function handlePointerUp(e: PointerEvent) {
        if (!sliderElement) return;
        isDragging = false;
        sliderElement.releasePointerCapture(e.pointerId);
    }

    function updateVolume(e: PointerEvent) {
        if (!sliderElement) return;

        const rect = sliderElement.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

        player.setVolume(percentage);
    }
</script>

<div
    bind:this={sliderElement}
    class="video-volume-slider"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    role="slider"
    aria-label="Volume"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={player.volume * 100}
>
    <div class="video-volume-slider__filler"></div>
</div>

<style lang="postcss">
    .video-volume-slider {
        width: 60px;
        position: absolute;
        display: block;
        height: 3px;
        left: 46px;
        bottom: 18px;
        background-color: rgba(255, 255, 255, .3);
        border-radius: 1px;
        cursor: pointer;

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
            background-color: #fff;
            width: var(--slider-fill, 0%);
            border-radius: 1px;
        }

        &::after {
            content: '';
            width: 10px;
            height: 10px;
            position: absolute;
            background-color: #fff;
            border-radius: 50%;
            box-shadow: 0 0 4px var(--box-shadow-color-1);
            top: -3.5px;
            left: calc(var(--slider-fill, 0%) - 5px);
            transform: scale(0);
            transition: transform .2s ease-in-out;
        }

        &__filler {
            display: block;
            position: absolute;
            left: -4px;
            right: -4px;
            bottom: -8px;
            top: -8px;
        }
    }
</style>