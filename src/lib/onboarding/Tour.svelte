<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import X from '@lucide/svelte/icons/x';
    import { isMobileViewport } from '$lib/viewportQuery.svelte';
    import { onboardingState } from './onboardingState.svelte';
    import { tourStepsFor } from './tourSteps';
    import { placeTooltip, spotlightRect, type Rect } from './tourPlacement';

    const PADDING = 8;

    const steps = $derived(tourStepsFor(isMobileViewport.current));
    const index = $derived(Math.min(onboardingState.tourStep, steps.length - 1));
    const step = $derived(steps[index]);
    const isLast = $derived(index === steps.length - 1);

    let targetRect = $state.raw<Rect | null>(null);
    let tooltipEl = $state<HTMLElement | undefined>();
    let tooltipWidth = $state(0);
    let tooltipHeight = $state(0);
    let viewportWidth = $state(0);
    let viewportHeight = $state(0);
    let measureFrame = 0;

    const placement = $derived(placeTooltip(targetRect, { width: tooltipWidth, height: tooltipHeight }, { width: viewportWidth, height: viewportHeight }));
    const spotlight = $derived(targetRect ? spotlightRect(targetRect, PADDING) : null);

    function measure() {
        cancelAnimationFrame(measureFrame);
        measureFrame = requestAnimationFrame(() => {
            const el = step.target ? document.querySelector<HTMLElement>(step.target) : null;
            if (!el) {
                targetRect = null;
                return;
            }
            const rect = el.getBoundingClientRect();
            targetRect = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
        });
    }

    function scrollTargetIntoView() {
        const el = step.target ? document.querySelector<HTMLElement>(step.target) : null;
        el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    $effect(() => {
        step;
        scrollTargetIntoView();
        measure();
        return () => cancelAnimationFrame(measureFrame);
    });

    async function go(next: number) {
        if (next < 0) {
            return;
        }
        if (next >= steps.length) {
            onboardingState.endTour();
            return;
        }
        onboardingState.tourStep = next;
        await tick();
        tooltipEl?.focus({ preventScroll: true });
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            event.preventDefault();
            onboardingState.endTour();
        } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
            event.preventDefault();
            go(index + 1);
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            go(index - 1);
        }
    }

    function focusOnMount(node: HTMLElement) {
        node.focus({ preventScroll: true });
    }
</script>

<svelte:window bind:innerWidth={viewportWidth} bind:innerHeight={viewportHeight} onresize={measure} onkeydown={handleKeydown} />
<svelte:document onscrollcapture={measure} />

<div class="tour" transition:fade={{ duration: 200 }}>
    <div class="tour__dim" class:tour__dim--full={!spotlight}></div>

    {#if spotlight}
        <div
            class="tour__spotlight"
            style:top="{spotlight.top}px"
            style:left="{spotlight.left}px"
            style:width="{spotlight.width}px"
            style:height="{spotlight.height}px"
        ></div>
    {/if}

    <div
        class="tour__tooltip tour__tooltip--{placement.side}"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        tabindex="-1"
        bind:this={tooltipEl}
        bind:clientWidth={tooltipWidth}
        bind:clientHeight={tooltipHeight}
        style:top="{placement.top}px"
        style:left="{placement.left}px"
        style:--arrow-offset="{placement.arrowOffset}px"
        {@attach focusOnMount}
    >
        <div class="tour__head">
            <span class="tour__counter">{index + 1} / {steps.length}</span>
            <button class="tour__close" type="button" onclick={() => onboardingState.endTour()} aria-label={$_('tour_end')}>
                <X size={16} color="currentColor" />
            </button>
        </div>

        {#key step.id}
            <div class="tour__body">
                <h3 class="tour__title" id="tour-title">{$_(step.titleKey)}</h3>
                <p class="tour__text">{$_(step.bodyKey)}</p>
            </div>
        {/key}

        <div class="tour__foot">
            {#if index > 0}
                <button class="tour__button tour__button--ghost" type="button" onclick={() => go(index - 1)}>{$_('tour_back')}</button>
            {/if}
            <button class="tour__button tour__button--primary" type="button" onclick={() => go(index + 1)}>
                {isLast ? $_('tour_finish') : $_('tour_next')}
            </button>
        </div>
    </div>
</div>

<style lang="postcss">
    .tour {
        position: fixed;
        inset: 0;
        z-index: 10050;
        font-family: var(--ui-font), var(--font-body), sans-serif;
    }

    .tour__dim {
        position: absolute;
        inset: 0;

        &--full {
            background-color: rgba(0, 0, 0, .55);
        }
    }

    .tour__spotlight {
        position: fixed;
        border-radius: 14px;
        box-shadow: 0 0 0 200vmax rgba(0, 0, 0, .55), 0 0 0 2px color-mix(in srgb, var(--primary-color) 70%, transparent);
        pointer-events: none;
        transition: top .35s cubic-bezier(.22, 1, .36, 1), left .35s cubic-bezier(.22, 1, .36, 1), width .35s cubic-bezier(.22, 1, .36, 1), height .35s cubic-bezier(.22, 1, .36, 1);
    }

    .tour__tooltip {
        position: fixed;
        width: min(340px, calc(100vw - 24px));
        background-color: var(--bg-color-1);
        color: var(--text-color-1);
        border-radius: 18px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, .12), 0 24px 48px -12px rgba(0, 0, 0, .35);
        padding: 14px 18px 16px;
        outline: none;
        transition: top .35s cubic-bezier(.22, 1, .36, 1), left .35s cubic-bezier(.22, 1, .36, 1);

        &::before {
            content: '';
            position: absolute;
            width: 14px;
            height: 14px;
            background-color: var(--bg-color-1);
            transform: rotate(45deg);
            border-radius: 2px;
        }

        &--bottom::before {
            top: -7px;
            left: calc(var(--arrow-offset) - 7px);
        }

        &--top::before {
            bottom: -7px;
            left: calc(var(--arrow-offset) - 7px);
        }

        &--right::before {
            left: -7px;
            top: calc(var(--arrow-offset) - 7px);
        }

        &--left::before {
            right: -7px;
            top: calc(var(--arrow-offset) - 7px);
        }

        &--center::before {
            display: none;
        }
    }

    .tour__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
    }

    .tour__counter {
        font-size: 12px;
        font-weight: 700;
        color: var(--primary-color);
        letter-spacing: .04em;
    }

    .tour__close {
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        color: var(--text-color-3);
        margin-right: -6px;

        &:hover {
            background-color: var(--bg-color-2);
            color: var(--text-color-1);
        }
    }

    .tour__body {
        animation: tour-body-in .3s cubic-bezier(.22, 1, .36, 1) both;
    }

    .tour__title {
        font-size: 16px;
        font-weight: 800;
        line-height: 1.4;
        margin: 0 0 6px;
    }

    .tour__text {
        font-size: 13.5px;
        line-height: 1.7;
        color: var(--text-color-2);
        margin: 0;
    }

    .tour__foot {
        display: flex;
        justify-content: flex-end;
        gap: 6px;
        margin-top: 14px;
    }

    .tour__button {
        height: 36px;
        padding: 0 16px;
        border-radius: 18px;
        font-size: 13.5px;
        font-weight: 700;
        transition: background-color .15s ease, opacity .15s ease;

        &--ghost {
            color: var(--text-color-2);

            &:hover {
                background-color: var(--bg-color-2);
            }
        }

        &--primary {
            background-color: var(--primary-color);
            color: var(--bg-color-1);

            &:hover {
                opacity: .85;
            }
        }
    }

    @keyframes tour-body-in {
        from {
            opacity: 0;
            transform: translateY(4px);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .tour__spotlight,
        .tour__tooltip {
            transition: none;
        }

        .tour__body {
            animation: none;
        }
    }
</style>
