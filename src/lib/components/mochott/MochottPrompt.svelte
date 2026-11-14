<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { fade } from 'svelte/transition';
    import { prefersReducedMotion } from 'svelte/motion';
    import X from '@lucide/svelte/icons/x';
    import { trackSideEdge } from '$lib/components/utils/trackSideEdge';
    import MochottWordmark from './MochottWordmark.svelte';
    import { MOCHOTT_URL } from './mochottPrompt';
    import { mochottPromptState } from './mochottPromptState.svelte';

    const TYPE_START = 520;
    const LINES = [100, 92, 58];

    const chars = $derived([...$_('mochott_prompt_headline')]);
    const step = $derived(Math.min(120, 1080 / chars.length));
    const typeEnd = $derived(TYPE_START + chars.length * step);
</script>

<aside
    class="mochott-prompt"
    aria-labelledby="mochott-prompt-title"
    out:fade|global={{ duration: prefersReducedMotion.current ? 0 : 160 }}
    {@attach trackSideEdge('--mochott-prompt-left')}
>
    <div class="mochott-prompt__hero">
        <div class="mochott-prompt__logo">
            <MochottWordmark width="78" role="img" aria-label="mochott" />
        </div>
        <h2 class="mochott-prompt__title" id="mochott-prompt-title" aria-label={$_('mochott_prompt_headline')}>
            {#each chars as char, i (i)}<span class="mochott-prompt__char" aria-hidden="true" style:--wait="{TYPE_START + i * step}ms">{char}</span>{/each}<span class="mochott-prompt__cursor" aria-hidden="true" style:--wait="{typeEnd}ms">_</span>
        </h2>
        {#each LINES as width, i (width)}
            <span class="mochott-prompt__line" style:width="{width}%" style:--wait="{typeEnd + 80 + i * 120}ms"></span>
        {/each}
    </div>

    <button
        class="mochott-prompt__close"
        type="button"
        onclick={() => mochottPromptState.dismiss()}
        aria-label={$_('close')}
    >
        <X size={18} />
    </button>

    <div class="mochott-prompt__body">
        <p class="mochott-prompt__text">{$_('mochott_prompt_body')}</p>

        <a
            class="mochott-prompt__cta"
            href={MOCHOTT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onclick={() => mochottPromptState.dismiss()}
        >{$_('mochott_prompt_cta')}</a>
    </div>
</aside>

<style lang="postcss">
    .mochott-prompt {
        --mochott-brand: #d44b6a;
        --mochott-brand-strong: #c23f5d;
        --mochott-prompt-motion: 420ms;
        position: fixed;
        left: calc(var(--mochott-prompt-left, 0px) + 16px);
        bottom: 16px;
        z-index: 1001;
        width: 320px;
        max-width: calc(100vw - 32px);
        overflow: hidden;
        color: var(--text-color-1);
        background-color: var(--bg-color-1);
        border: var(--menu-border);
        border-radius: 20px;
        box-shadow:
            0 0 0 1px color-mix(in srgb, var(--text-color-1) 8%, transparent),
            0 24px 48px -16px color-mix(in srgb, var(--mochott-brand) 24%, transparent),
            0 8px 24px color-mix(in srgb, var(--text-color-1) 10%, transparent);
        opacity: 1;
        translate: 0 0;
        transition:
            opacity var(--mochott-prompt-motion) cubic-bezier(0.22, 1, 0.36, 1),
            translate var(--mochott-prompt-motion) cubic-bezier(0.22, 1, 0.36, 1);

        @media (max-width: 767px) {
            left: 16px;
            bottom: calc(var(--bar-bottom-height, 56px) + var(--safe-area-bottom, 0px) + 12px);
            z-index: 998;
            max-width: calc(100vw - 32px - 72px);
        }
    }

    :global(.left-mode) .mochott-prompt {
        @media (max-width: 767px) {
            left: auto;
            right: 16px;
        }
    }

    @starting-style {
        .mochott-prompt {
            opacity: 0;
            translate: 0 24px;
        }
    }

    .mochott-prompt__hero {
        padding: 20px 20px 22px;
        background-color: color-mix(in srgb, var(--mochott-brand) 12%, var(--bg-color-1));
    }

    .mochott-prompt__logo {
        margin-bottom: 20px;
    }

    .mochott-prompt__title {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        margin: 0 0 16px;
        font-size: 22px;
        font-weight: 700;
        line-height: 1.3;
        letter-spacing: 0;
    }

    .mochott-prompt__char {
        overflow: hidden;
        white-space: pre;
        animation: mochott-prompt-wait var(--wait) steps(1, end) backwards;
    }

    .mochott-prompt__cursor {
        color: var(--mochott-brand);
        animation: mochott-prompt-blink 720ms steps(1, end) var(--wait) 3;
    }

    .mochott-prompt__line {
        display: block;
        height: 6px;
        margin-top: 9px;
        background-color: color-mix(in srgb, var(--text-color-1) 14%, transparent);
        border-radius: 3px;
        animation: mochott-prompt-line 320ms ease-out var(--wait) both;
    }

    @keyframes mochott-prompt-wait {
        from,
        to {
            max-width: 0;
        }
    }

    @keyframes mochott-prompt-blink {
        50% {
            opacity: 0;
        }
    }

    @keyframes mochott-prompt-line {
        from {
            opacity: 0;
            translate: 0 3px;
        }
    }

    .mochott-prompt__close {
        position: absolute;
        top: 10px;
        right: 10px;
        display: grid;
        place-content: center;
        width: 32px;
        height: 32px;
        color: var(--text-color-1);
        background-color: color-mix(in srgb, var(--bg-color-1) 72%, transparent);
        border: none;
        border-radius: 50%;
        cursor: pointer;

        &:hover {
            background-color: var(--state-hover, var(--bg-color-1));
        }

        &:focus-visible {
            outline: 2px solid var(--primary-color);
            outline-offset: 2px;
        }
    }

    .mochott-prompt__body {
        padding: 18px 20px 20px;
    }

    .mochott-prompt__text {
        margin: 0 0 16px;
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-color-1);
        text-wrap: pretty;
    }

    .mochott-prompt__cta {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        padding: 8px 16px;
        font-size: 15px;
        font-weight: 700;
        line-height: 1.2;
        color: #fff;
        background-color: var(--mochott-brand-strong);
        border-radius: 14px;
        text-decoration: none;
        transition: translate 160ms ease, box-shadow 160ms ease;

        &:hover {
            translate: 0 -1px;
            box-shadow: 0 10px 20px -10px var(--mochott-brand-strong);
        }

        &:focus-visible {
            outline: 2px solid var(--mochott-brand-strong);
            outline-offset: 3px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .mochott-prompt {
            --mochott-prompt-motion: 120ms;
            translate: none;
        }

        @starting-style {
            .mochott-prompt {
                translate: none;
            }
        }

        .mochott-prompt__char,
        .mochott-prompt__cursor,
        .mochott-prompt__line {
            animation: none;
        }

        .mochott-prompt__cta:hover {
            translate: none;
        }
    }
</style>
