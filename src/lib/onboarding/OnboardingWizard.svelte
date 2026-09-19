<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { fly, fade } from 'svelte/transition';
    import { cubicOut } from 'svelte/easing';
    import Check from '@lucide/svelte/icons/check';
    import Home from '@lucide/svelte/icons/home';
    import Bell from '@lucide/svelte/icons/bell';
    import Pencil from '@lucide/svelte/icons/pencil';
    import Heart from '@lucide/svelte/icons/heart';
    import MessagesSquare from '@lucide/svelte/icons/messages-square';
    import Newspaper from '@lucide/svelte/icons/newspaper';
    import Pin from '@lucide/svelte/icons/pin';
    import MoveHorizontal from '@lucide/svelte/icons/move-horizontal';
    import { agent } from '$lib/stores';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { getColumnState } from '$lib/classes/columnState.svelte';
    import { isMobileViewport } from '$lib/viewportQuery.svelte';
    import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
    import { CatalogSourcesState } from '$lib/components/column/catalog/catalogSources.svelte';
    import { makeColumn, columnKey } from '$lib/components/column/catalog/columnCatalog';
    import { applyDefaultColumnIcon } from '$lib/columnAvatar';
    import { onboardingState } from './onboardingState.svelte';
    import type { Column } from '$lib/types/column';

    type Layout = 'decks' | 'default';

    interface Choice {
        key: string;
        algorithm: Column['algorithm'];
        icon: 'home' | 'bell' | 'pencil' | 'heart' | 'chat' | 'feed';
        avatar?: string;
        subtitle?: string;
        pinned?: boolean;
    }

    const columnState = getColumnState();
    const sources = new CatalogSourcesState($agent);
    const isMobile = $derived(isMobileViewport.current);

    let step = $state(0);
    let direction = $state(1);
    let layout = $state<Layout>('decks');
    let selected = $state<string[]>(['default:', 'notification:']);
    let feedsLoading = $state(true);
    let busy = $state(false);

    onboardingState.openWizard();

    const loaded = sources.load().then(() => {
        for (const feed of sources.pinnedFeeds) {
            const key = columnKey({ algorithm: { type: 'custom', algorithm: feed.uri } });
            if (!selected.includes(key)) {
                selected = [...selected, key];
            }
        }
        feedsLoading = false;
    });

    const basicChoices: Choice[] = $derived([
        { key: 'default:', algorithm: { type: 'default', name: 'HOME' }, icon: 'home' },
        { key: 'notification:', algorithm: { type: 'notification', name: $_('notifications') }, icon: 'bell' },
        { key: 'myPost:', algorithm: { type: 'myPost', name: $_('my_post') }, icon: 'pencil' },
        { key: 'like:', algorithm: { type: 'like', name: $_('likes') }, icon: 'heart' },
        { key: 'chatList:', algorithm: { type: 'chatList', name: $_('chat_list') }, icon: 'chat' },
    ]);

    const feedChoices: Choice[] = $derived(sources.pinnedFeeds.map(feed => ({
        key: columnKey({ algorithm: { type: 'custom', algorithm: feed.uri } }),
        algorithm: { type: 'custom', algorithm: feed.uri, name: feed.name, avatar: feed.avatar },
        icon: 'feed',
        avatar: feed.avatar,
        subtitle: feed.creator?.handle ? `@${feed.creator.handle}` : undefined,
        pinned: true,
    })));

    const orderedChoices = $derived([
        ...basicChoices.slice(0, 2),
        ...feedChoices,
        ...basicChoices.slice(2),
    ]);

    const selectedCount = $derived(orderedChoices.filter(choice => selected.includes(choice.key)).length);

    const steps = ['layout', 'columns'] as const;

    function open(node: HTMLDialogElement) {
        node.showModal();
        node.querySelector<HTMLElement>('.wizard__card')?.focus({ preventScroll: true });
    }

    function toggle(key: string) {
        selected = selected.includes(key) ? selected.filter(entry => entry !== key) : [...selected, key];
    }

    function goTo(next: number) {
        direction = next > step ? 1 : -1;
        step = next;
    }

    function createColumns() {
        const did = $agent.did();
        const handle = $agent.handle() ?? '';
        for (const choice of orderedChoices) {
            if (!selected.includes(choice.key)) {
                continue;
            }
            columnState.add(applyDefaultColumnIcon(makeColumn(did, handle, structuredClone($state.snapshot(choice.algorithm))), settingsStore.design.defaultColumnIcon));
        }
        settingsStore.design.layout = layout;
    }

    async function finish(withTour: boolean) {
        if (busy) {
            return;
        }
        busy = true;
        if (feedsLoading) {
            await loaded;
        }
        createColumns();
        onboardingState.closeWizard();
        if (withTour) {
            onboardingState.startTour();
        } else {
            settingsStore.onboarding.tourSeen = true;
        }
    }

    function next() {
        if (step === 1) {
            finish(true);
            return;
        }
        goTo(step + 1);
    }

    function handleCancel(event: Event) {
        event.preventDefault();
    }
</script>

<dialog class="wizard" {@attach open} oncancel={handleCancel}>
    <div class="wizard__card" tabindex="-1">
        <header class="wizard__head">
            <ol class="wizard__dots" aria-label="{$_('onboarding_step_of', { current: step + 1, total: steps.length })}">
                {#each steps as id, i (id)}
                    <li class="wizard__dot" class:wizard__dot--done={i < step} class:wizard__dot--current={i === step} aria-current={i === step ? 'step' : undefined}></li>
                {/each}
            </ol>

            <button class="wizard__skip" type="button" onclick={() => finish(false)} disabled={busy}>{$_('onboarding_skip')}</button>
        </header>

        <div class="wizard__stage">
            {#key step}
                <section
                    class="wizard__step"
                    in:fly={{ x: 40 * direction, duration: 320, easing: cubicOut, delay: 60 }}
                    out:fade={{ duration: 120 }}
                >
                    {#if step === 0}
                        <h2 class="wizard__title">{$_('onboarding_step_layout_title')}</h2>
                        <p class="wizard__lead">{$_('onboarding_step_layout_lead')}</p>

                        <div class="layout-choice" role="radiogroup" aria-label={$_('layout')}>
                            <button
                                class="layout-card"
                                class:layout-card--selected={layout === 'decks'}
                                type="button"
                                role="radio"
                                aria-checked={layout === 'decks'}
                                onclick={() => (layout = 'decks')}
                            >
                                <span class="layout-card__preview layout-card__preview--decks" aria-hidden="true">
                                    <span class="layout-card__col"><i></i><i></i><i></i></span>
                                    <span class="layout-card__col"><i></i><i></i><i></i></span>
                                    <span class="layout-card__col"><i></i><i></i><i></i></span>
                                </span>
                                <span class="layout-card__text">
                                    <span class="layout-card__name">
                                        {$_('layout_decks')}
                                        <span class="layout-card__badge">{$_('onboarding_recommended')}</span>
                                    </span>
                                    <span class="layout-card__desc">{$_('onboarding_layout_decks_desc')}</span>
                                </span>
                                <span class="layout-card__check"><Check size={14} color="var(--bg-color-1)" strokeWidth={3} /></span>
                            </button>

                            <button
                                class="layout-card"
                                class:layout-card--selected={layout === 'default'}
                                type="button"
                                role="radio"
                                aria-checked={layout === 'default'}
                                onclick={() => (layout = 'default')}
                            >
                                <span class="layout-card__preview layout-card__preview--single" aria-hidden="true">
                                    <span class="layout-card__col"><i></i><i></i><i></i><i></i></span>
                                </span>
                                <span class="layout-card__text">
                                    <span class="layout-card__name">{$_('layout_single')}</span>
                                    <span class="layout-card__desc">{$_('onboarding_layout_single_desc')}</span>
                                </span>
                                <span class="layout-card__check"><Check size={14} color="var(--bg-color-1)" strokeWidth={3} /></span>
                            </button>
                        </div>

                        {#if isMobile && layout === 'decks'}
                            <p class="wizard__hint"><MoveHorizontal size={16} color="var(--primary-color)" />{$_('onboarding_layout_mobile_hint')}</p>
                        {/if}
                    {:else if step === 1}
                        <h2 class="wizard__title">{$_('onboarding_step_columns_title')}</h2>
                        <p class="wizard__lead">{$_('onboarding_step_columns_lead')}</p>

                        <div class="choice-grid">
                            {#each orderedChoices as choice (choice.key)}
                                {@const on = selected.includes(choice.key)}
                                <button
                                    class="choice"
                                    class:choice--on={on}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={on}
                                    onclick={() => toggle(choice.key)}
                                >
                                    <span class="choice__icon" class:choice__icon--avatar={Boolean(choice.avatar)}>
                                        {#if choice.avatar}
                                            <img src={choice.avatar} alt="" width="36" height="36" loading="lazy" decoding="async">
                                        {:else if choice.icon === 'home'}
                                            <Home size={18} color="currentColor" />
                                        {:else if choice.icon === 'bell'}
                                            <Bell size={18} color="currentColor" />
                                        {:else if choice.icon === 'pencil'}
                                            <Pencil size={18} color="currentColor" />
                                        {:else if choice.icon === 'heart'}
                                            <Heart size={18} color="currentColor" />
                                        {:else if choice.icon === 'chat'}
                                            <MessagesSquare size={18} color="currentColor" />
                                        {:else}
                                            <Newspaper size={18} color="currentColor" />
                                        {/if}
                                    </span>
                                    <span class="choice__text">
                                        <span class="choice__name">{choice.algorithm.name}</span>
                                        {#if choice.pinned || choice.subtitle}
                                            <span class="choice__meta">
                                                {#if choice.pinned}<span class="choice__pin"><Pin size={11} color="currentColor" strokeWidth={2.5} />{$_('catalog_pinned')}</span>{/if}
                                                {#if choice.subtitle}<span>{choice.subtitle}</span>{/if}
                                            </span>
                                        {/if}
                                    </span>
                                    <span class="choice__box"><Check size={14} color="var(--bg-color-1)" strokeWidth={3} /></span>
                                </button>
                            {/each}
                        </div>

                        <p class="wizard__hint">
                            {#if feedsLoading}
                                <LoadingSpinner padding={0} size={14} strokeWidth={2}></LoadingSpinner>
                                {$_('onboarding_pinned_loading')}
                            {:else if !feedChoices.length}
                                {$_('onboarding_pinned_empty')}
                            {:else}
                                {$_('onboarding_more_later')}
                            {/if}
                        </p>
                    {/if}
                </section>
            {/key}
        </div>

        <footer class="wizard__foot">
            {#if step === 0}
                <span></span>
                <button class="wizard__button wizard__button--primary" type="button" onclick={next}>{$_('onboarding_next')}</button>
            {:else}
                <button class="wizard__button wizard__button--ghost" type="button" onclick={() => goTo(0)}>{$_('onboarding_back')}</button>
                <button class="wizard__button wizard__button--primary" type="button" onclick={next} disabled={selectedCount === 0 || busy}>
                    {$_('onboarding_create_columns', { count: selectedCount })}
                </button>
            {/if}
        </footer>
    </div>
</dialog>

<style lang="postcss">
    .wizard {
        --wizard-ease: cubic-bezier(.22, 1, .36, 1);

        margin: auto;
        padding: 0;
        border: none;
        background: transparent;
        color: var(--text-color-1);
        max-width: min(680px, 94vw);
        width: 100%;
        max-height: 94dvh;
        overflow: visible;
        font-family: var(--ui-font), var(--font-body), sans-serif;
        animation: wizard-in .45s var(--wizard-ease);

        &::backdrop {
            background-color: rgba(10, 16, 28, .55);
            backdrop-filter: blur(6px);
        }

        @media (max-width: 767px) {
            margin: auto 0 0;
            max-width: 100vw;
            max-height: 96dvh;
        }
    }

    .wizard__card {
        background-color: var(--bg-color-1);
        border-radius: 28px;
        box-shadow: 0 40px 80px -30px rgba(0, 0, 0, .5);
        display: flex;
        flex-direction: column;
        max-height: 94dvh;
        overflow: hidden;
        outline: none;

        @media (max-width: 767px) {
            border-radius: 28px 28px 0 0;
            max-height: 96dvh;
        }
    }

    .wizard__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px 0;
        min-height: 44px;
    }

    .wizard__dots {
        display: flex;
        gap: 6px;
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .wizard__dot {
        width: 8px;
        height: 8px;
        border-radius: 4px;
        background-color: var(--border-color-1);
        transition: width .3s var(--wizard-ease), background-color .3s ease;

        &--done {
            background-color: color-mix(in srgb, var(--primary-color) 45%, var(--border-color-1));
        }

        &--current {
            width: 24px;
            background-color: var(--primary-color);
        }
    }

    .wizard__skip {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-color-3);
        padding: 6px 10px;
        border-radius: 999px;
        transition: background-color .15s ease, color .15s ease;

        &:hover {
            background-color: var(--bg-color-2);
            color: var(--text-color-1);
        }
    }

    .wizard__stage {
        position: relative;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 12px 24px 8px;
        display: grid;

        @media (max-width: 767px) {
            padding: 8px 18px;
        }
    }

    .wizard__step {
        grid-area: 1 / 1;
        min-width: 0;
    }

    .wizard__title {
        font-size: 22px;
        font-weight: 800;
        line-height: 1.35;
        letter-spacing: -.005em;
        margin: 8px 0 6px;
        text-wrap: balance;

        @media (max-width: 767px) {
            font-size: 20px;
        }
    }

    .wizard__lead {
        font-size: 14px;
        line-height: 1.7;
        color: var(--text-color-2);
        margin: 0 0 20px;
        text-wrap: balance;
    }

    .wizard__hint {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        line-height: 1.6;
        color: var(--text-color-3);
        margin: 14px 0 4px;
    }

    .layout-choice {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;

        @media (max-width: 767px) {
            grid-template-columns: minmax(0, 1fr);
        }
    }

    .layout-card {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 14px;
        border-radius: 20px;
        border: 2px solid var(--border-color-2);
        background-color: var(--bg-color-1);
        text-align: left;
        color: var(--text-color-1);
        transition: border-color .2s ease, background-color .2s ease, transform .2s var(--wizard-ease);

        &:hover {
            border-color: color-mix(in srgb, var(--primary-color) 50%, var(--border-color-2));
        }

        &--selected {
            border-color: var(--primary-color);
            background-color: color-mix(in srgb, var(--primary-color) 5%, var(--bg-color-1));
        }

        @media (max-width: 767px) {
            flex-direction: row;
            align-items: center;
        }
    }

    .layout-card__preview {
        display: flex;
        gap: 6px;
        height: 96px;
        padding: 10px;
        border-radius: 14px;
        background-color: var(--bg-color-3);
        flex-shrink: 0;

        @media (max-width: 767px) {
            width: 112px;
            height: 76px;
            padding: 8px;
        }
    }

    .layout-card__col {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 6px;
        border-radius: 7px;
        background-color: var(--bg-color-1);

        i {
            display: block;
            height: 5px;
            border-radius: 3px;
            background-color: var(--border-color-1);

            &:first-child {
                width: 55%;
                background-color: color-mix(in srgb, var(--primary-color) 60%, var(--border-color-1));
            }

            &:nth-child(3) {
                width: 80%;
            }
        }
    }

    .layout-card__preview--single .layout-card__col {
        max-width: 60%;
        margin: 0 auto;
    }

    .layout-card__text {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }

    .layout-card__name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 800;
    }

    .layout-card__badge {
        font-size: 11px;
        font-weight: 700;
        color: var(--primary-color);
        background-color: color-mix(in srgb, var(--primary-color) 14%, var(--bg-color-1));
        padding: 2px 8px;
        border-radius: 999px;
    }

    .layout-card__desc {
        font-size: 13px;
        line-height: 1.6;
        color: var(--text-color-3);
    }

    .layout-card__check,
    .choice__box {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        border: 2px solid var(--border-color-1);
        background-color: var(--bg-color-1);
        transition: background-color .2s ease, border-color .2s ease, transform .25s cubic-bezier(.34, 1.56, .64, 1);

        :global(svg) {
            opacity: 0;
            transform: scale(.5);
            transition: opacity .15s ease, transform .25s cubic-bezier(.34, 1.56, .64, 1);
        }
    }

    .layout-card--selected .layout-card__check,
    .choice--on .choice__box {
        background-color: var(--primary-color);
        border-color: var(--primary-color);

        :global(svg) {
            opacity: 1;
            transform: scale(1);
        }
    }

    .choice-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;

        @media (max-width: 767px) {
            grid-template-columns: minmax(0, 1fr);
        }
    }

    .choice {
        position: relative;
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 60px;
        padding: 8px 44px 8px 8px;
        border-radius: 16px;
        border: 2px solid var(--border-color-2);
        background-color: var(--bg-color-1);
        text-align: left;
        color: var(--text-color-1);
        transition: border-color .2s ease, background-color .2s ease;

        &:hover {
            border-color: color-mix(in srgb, var(--primary-color) 50%, var(--border-color-2));
        }

        &--on {
            border-color: var(--primary-color);
            background-color: color-mix(in srgb, var(--primary-color) 5%, var(--bg-color-1));
        }
    }

    .choice__box {
        top: 50%;
        transform: translateY(-50%);
        right: 12px;
    }

    .choice__icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background-color: var(--bg-color-2);
        color: var(--text-color-1);
        flex-shrink: 0;
        overflow: hidden;

        &--avatar {
            background-color: transparent;
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    .choice__text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .choice__name {
        font-size: 14px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .choice__meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--text-color-3);
        overflow: hidden;
        white-space: nowrap;
    }

    .choice__pin {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        color: var(--primary-color);
        font-weight: 600;
    }

    .wizard__foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 12px 24px 20px;

        @media (max-width: 767px) {
            padding: 12px 18px calc(16px + env(safe-area-inset-bottom, 0px));
        }
    }

    .wizard__button {
        height: 44px;
        padding: 0 20px;
        border-radius: 22px;
        font-size: 14px;
        font-weight: 700;
        transition: background-color .15s ease, opacity .15s ease, transform .1s ease;

        &:active {
            transform: scale(.97);
        }

        &--ghost {
            color: var(--text-color-2);

            &:hover {
                background-color: var(--bg-color-2);
            }
        }

        &--primary {
            background-color: var(--primary-color);
            color: var(--bg-color-1);
            min-width: 140px;

            &:hover {
                opacity: .88;
            }

            &:disabled {
                opacity: .45;
                transform: none;
            }
        }
    }

    @keyframes wizard-in {
        from {
            opacity: 0;
            transform: translateY(16px) scale(.98);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .wizard {
            animation: none;
        }
    }
</style>
