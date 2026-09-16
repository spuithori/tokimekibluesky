<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { fade } from 'svelte/transition';
    import { prefersReducedMotion } from 'svelte/motion';
    import { on } from 'svelte/events';
    import X from '@lucide/svelte/icons/x';
    import { publishState } from '$lib/classes/publishState.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { supportPromptState } from '$lib/support/supportPromptState.svelte';
    import { COFFEE_URL, SUPPORT_URL } from '$lib/support/supportPrompt';

    function trackSideEdge(node: HTMLElement) {
        void publishState.isBottom;
        void settingsStore.design.layout;

        const measure = () => {
            const side = document.querySelector<HTMLElement>('.side');
            const right = side ? Math.max(0, side.getBoundingClientRect().right) : 0;
            node.style.setProperty('--support-prompt-left', `${right}px`);
        };
        measure();
        return on(window, 'resize', measure);
    }
</script>

<aside
    class="support-prompt"
    aria-labelledby="support-prompt-title"
    out:fade={{ duration: prefersReducedMotion.current ? 0 : 160 }}
    {@attach trackSideEdge}
>
    <div class="support-prompt__hero" aria-hidden="true">
        <svg class="support-prompt__mark" viewBox="0 0 64 64">
            <defs>
                <linearGradient id="support-prompt-rainbow" x1="1" y1="0.4" x2="-0.112" y2="0.391">
                    <stop offset="0" stop-color="#ffa3b2" />
                    <stop offset="0.268" stop-color="#ec86d6" />
                    <stop offset="0.536" stop-color="#73f08d" />
                    <stop offset="0.789" stop-color="#75c0e5" />
                    <stop offset="1" stop-color="#923ec9" />
                </linearGradient>
                <linearGradient id="support-prompt-sky" x1="0.5" y1="0" x2="0.5" y2="1">
                    <stop offset="0" stop-color="#afe2ff" />
                    <stop offset="1" stop-color="#fff" />
                </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="32" fill="url(#support-prompt-rainbow)" opacity="0.61" />
            <circle cx="32" cy="34.5" r="25.5" fill="url(#support-prompt-sky)" />
            <circle cx="32" cy="37" r="19" fill="url(#support-prompt-sky)" />
            <circle cx="32" cy="40" r="12.8" fill="#fff" />
        </svg>
    </div>

    <button
        class="support-prompt__close"
        type="button"
        onclick={() => supportPromptState.dismiss()}
        aria-label={$_('close')}
    >
        <X size={18} />
    </button>

    <div class="support-prompt__body">
        <h2 class="support-prompt__title" id="support-prompt-title">{$_('support_prompt_title')}</h2>
        <p class="support-prompt__text">{$_('support_prompt_body')}</p>
        <p class="support-prompt__note">{$_('support_prompt_note')}</p>

        <a
            class="support-prompt__cta"
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onclick={() => supportPromptState.dismiss()}
        >
            <span class="support-prompt__cta-brand">pixivFANBOX</span>
            <span class="support-prompt__cta-label">{$_('support_prompt_cta')}</span>
        </a>

        <a
            class="support-prompt__alt"
            href={COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onclick={() => supportPromptState.dismiss()}
        >Buy Me A Coffee</a>
    </div>
</aside>

<style lang="postcss">
    .support-prompt {
        --support-prompt-motion: 420ms;
        position: fixed;
        left: calc(var(--support-prompt-left, 0px) + 16px);
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
            0 24px 48px -16px color-mix(in srgb, #923ec9 28%, transparent),
            0 8px 24px color-mix(in srgb, var(--text-color-1) 10%, transparent);
        opacity: 1;
        translate: 0 0;
        transition:
            opacity var(--support-prompt-motion) cubic-bezier(0.22, 1, 0.36, 1),
            translate var(--support-prompt-motion) cubic-bezier(0.22, 1, 0.36, 1);

        @media (max-width: 767px) {
            left: 16px;
            bottom: calc(56px + var(--safe-area-bottom, 0px) + 12px);
            z-index: 998;
            max-width: calc(100vw - 32px - 72px);
        }
    }

    :global(.left-mode) .support-prompt {
        @media (max-width: 767px) {
            left: auto;
            right: 16px;
        }
    }

    @starting-style {
        .support-prompt {
            opacity: 0;
            translate: 0 24px;
        }
    }

    .support-prompt__hero {
        position: relative;
        height: 168px;
        overflow: hidden;
        background:
            radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, #ffa3b2 42%, transparent), transparent 60%),
            radial-gradient(90% 80% at 0% 100%, color-mix(in srgb, #75c0e5 48%, transparent), transparent 62%),
            linear-gradient(180deg, color-mix(in srgb, #caecee 55%, var(--bg-color-1)), var(--bg-color-1));
    }

    .support-prompt__mark {
        position: absolute;
        left: 50%;
        bottom: -96px;
        width: 232px;
        height: 232px;
        translate: -50% 0;
        transform-origin: 50% 100%;
        animation: support-prompt-rise var(--support-prompt-motion) cubic-bezier(0.22, 1, 0.36, 1) both;
        animation-delay: 80ms;
        filter: drop-shadow(0 12px 24px color-mix(in srgb, #923ec9 22%, transparent));
    }

    @keyframes support-prompt-rise {
        from {
            translate: -50% 40px;
            scale: 0.92;
        }
        to {
            translate: -50% 0;
            scale: 1;
        }
    }

    .support-prompt__close {
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
        backdrop-filter: blur(6px);

        &:hover {
            background-color: var(--bg-color-1);
        }

        &:focus-visible {
            outline: 2px solid var(--primary-color);
            outline-offset: 2px;
        }
    }

    .support-prompt__body {
        padding: 20px 20px 20px;
    }

    .support-prompt__title {
        margin: 0 0 8px;
        font-size: 20px;
        font-weight: 700;
        line-height: 1.25;
        letter-spacing: -0.01em;
    }

    .support-prompt__text {
        margin: 0 0 8px;
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-color-2);
        text-wrap: pretty;
    }

    .support-prompt__note {
        margin: 0 0 16px;
        font-size: 11px;
        line-height: 1.5;
        color: var(--text-color-3);
        text-wrap: pretty;
    }

    .support-prompt__cta {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        min-height: 56px;
        padding: 8px 16px;
        color: var(--bg-color-1);
        background-color: var(--primary-color);
        border-radius: 14px;
        text-decoration: none;
        transition: translate 160ms ease, box-shadow 160ms ease;

        &:hover {
            translate: 0 -1px;
            box-shadow: 0 10px 20px -10px var(--primary-color);
        }

        &:focus-visible {
            outline: 2px solid var(--primary-color);
            outline-offset: 3px;
        }
    }

    .support-prompt__cta-brand {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.06em;
        opacity: 0.85;
    }

    .support-prompt__cta-label {
        font-size: 15px;
        font-weight: 700;
        line-height: 1.2;
    }

    .support-prompt__alt {
        display: block;
        width: fit-content;
        margin: 12px auto 0;
        font-size: 13px;
        color: var(--text-color-2);
        text-decoration: underline;
        text-underline-offset: 3px;
        text-decoration-color: color-mix(in srgb, var(--text-color-2) 50%, transparent);

        &:hover {
            color: var(--text-color-1);
            text-decoration-color: currentColor;
        }

        &:focus-visible {
            outline: 2px solid var(--primary-color);
            outline-offset: 3px;
            border-radius: 4px;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .support-prompt {
            --support-prompt-motion: 120ms;
            translate: none;
        }

        @starting-style {
            .support-prompt {
                translate: none;
            }
        }

        .support-prompt__mark {
            animation: none;
        }

        .support-prompt__cta:hover {
            translate: none;
        }
    }
</style>
