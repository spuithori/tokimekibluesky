<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import MochottWordmark from '$lib/components/mochott/MochottWordmark.svelte';

    const postLines = [
        { y: 68, width: 146, delay: 0 },
        { y: 80, width: 140, delay: 0.2 },
        { y: 92, width: 118, delay: 0.4 },
    ];

    const articleLines = [
        { y: 62, width: 136, delay: 2.7 },
        { y: 73, width: 128, delay: 2.85 },
        { y: 84, width: 112, delay: 3 },
        { y: 128, width: 136, delay: 3.3 },
        { y: 139, width: 96, delay: 3.45 },
    ];
</script>

<svg class="chotto-art" viewBox="0 0 428 168" aria-hidden="true">
    <rect class="chotto-art__ground" width="428" height="168" rx="16"></rect>

    <rect class="chotto-art__card" x="24" y="30" width="170" height="108" rx="12"></rect>
    <circle class="chotto-art__avatar" cx="44" cy="50" r="9"></circle>
    <rect class="chotto-art__name" x="60" y="45" width="54" height="7" rx="3.5"></rect>
    <rect class="chotto-art__line" x="118" y="45" width="36" height="7" rx="3.5"></rect>
    {#each postLines as line (line.y)}
        <rect class="chotto-art__line chotto-art__in" style="animation-delay: {line.delay}s" x="36" y={line.y} width={line.width} height="6" rx="3"></rect>
    {/each}
    <circle class="chotto-art__tap" cx="152" cy="116" r="16"></circle>
    <text class="chotto-art__more chotto-art__in" style="animation-delay: .6s" x="182" y="120" text-anchor="end">…{$_('chotto_read_more')}</text>
    <path class="chotto-art__wire" d="M186 116 C 214 116, 214 84, 242 84"></path>

    <g class="chotto-art__in" style="animation-delay: 2.4s">
        <rect class="chotto-art__card" x="244" y="14" width="160" height="140" rx="12"></rect>
        <MochottWordmark x="256" y="26" width="52" height="8" />
        <rect class="chotto-art__name" x="256" y="44" width="112" height="8" rx="4"></rect>
    </g>
    {#each articleLines as line (line.y)}
        <rect class="chotto-art__line chotto-art__in" style="animation-delay: {line.delay}s" x="256" y={line.y} width={line.width} height="5" rx="2.5"></rect>
    {/each}
    <rect class="chotto-art__image chotto-art__in" style="animation-delay: 3.15s" x="256" y="96" width="64" height="24" rx="4"></rect>
</svg>

<style lang="postcss">
    .chotto-art {
        display: block;
        width: 100%;
        height: auto;
    }

    .chotto-art__ground {
        fill: var(--bg-color-2);
    }

    .chotto-art__card {
        fill: var(--bg-color-1);
        stroke: var(--border-color-1);
    }

    .chotto-art__avatar {
        fill: var(--primary-color);
        opacity: .35;
    }

    .chotto-art__name {
        fill: var(--text-color-1);
        opacity: .8;
    }

    .chotto-art__line {
        fill: var(--text-color-1);
        opacity: .18;
    }

    .chotto-art__image {
        fill: var(--primary-color);
        opacity: .22;
    }

    .chotto-art__more {
        fill: var(--primary-color);
        font-size: 11px;
        font-weight: bold;
    }

    .chotto-art__in {
        transform-box: fill-box;
        animation: chotto-in 9s ease-out infinite backwards;
    }

    .chotto-art__line.chotto-art__in {
        animation-name: chotto-in-faint;
    }

    .chotto-art__image.chotto-art__in {
        animation-name: chotto-in-image;
    }

    .chotto-art__tap {
        fill: var(--primary-color);
        opacity: 0;
        transform-box: fill-box;
        transform-origin: center;
        animation: chotto-tap 9s ease-out infinite;
    }

    .chotto-art__wire {
        fill: none;
        stroke: var(--primary-color);
        stroke-width: 1.5;
        stroke-linecap: round;
        stroke-dasharray: 96;
        stroke-dashoffset: 96;
        animation: chotto-wire 9s ease-in-out infinite;
    }

    @keyframes chotto-in {
        0% { opacity: 0; transform: translateY(3px); }
        4% { opacity: 1; transform: none; }
        62% { opacity: 1; }
        68%, 100% { opacity: 0; }
    }

    @keyframes chotto-in-faint {
        0% { opacity: 0; transform: translateY(3px); }
        4% { opacity: .18; transform: none; }
        62% { opacity: .18; }
        68%, 100% { opacity: 0; }
    }

    @keyframes chotto-in-image {
        0% { opacity: 0; transform: translateY(3px); }
        4% { opacity: .22; transform: none; }
        62% { opacity: .22; }
        68%, 100% { opacity: 0; }
    }

    @keyframes chotto-tap {
        0%, 15% { opacity: 0; transform: scale(.4); }
        18% { opacity: .35; }
        26%, 100% { opacity: 0; transform: scale(1.7); }
    }

    @keyframes chotto-wire {
        0%, 20% { stroke-dashoffset: 96; }
        28%, 84% { stroke-dashoffset: 0; }
        90%, 100% { stroke-dashoffset: -96; }
    }

    @media (prefers-reduced-motion: reduce) {
        .chotto-art__in,
        .chotto-art__wire,
        .chotto-art__tap {
            animation: none;
        }

        .chotto-art__wire {
            stroke-dashoffset: 0;
        }
    }
</style>
