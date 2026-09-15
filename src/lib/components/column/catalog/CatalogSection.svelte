<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { slide } from 'svelte/transition';
    import ChevronDown from '@lucide/svelte/icons/chevron-down';
    import HelpCircle from '@lucide/svelte/icons/help-circle';
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import type { Snippet } from 'svelte';

    interface Props {
        id: string;
        title: string;
        count?: number;
        open: boolean;
        loading?: boolean;
        helpUrl?: string;
        description?: string;
        ontoggle: (open: boolean) => void;
        actions?: Snippet;
        children: Snippet;
    }

    let { id, title, count = undefined, open, loading = false, helpUrl = undefined, description = undefined, ontoggle, actions, children }: Props = $props();
</script>

<section class="catalog-section" class:catalog-section--open={open}>
    <div class="catalog-section__head">
        <button class="catalog-section__toggle" type="button" aria-expanded={open} aria-controls="catalog-section-{id}" onclick={() => ontoggle(!open)}>
            <span class="catalog-section__chevron"><ChevronDown size={16} color="currentColor" strokeWidth={2.5} /></span>
            <span class="catalog-section__title">{title}</span>
            {#if count !== undefined}
                <span class="catalog-section__count">{count}</span>
            {/if}
            {#if loading}
                <span class="catalog-section__spinner"><LoadingSpinner padding={0} size={12} strokeWidth={2}></LoadingSpinner></span>
            {/if}
        </button>

        {#if helpUrl}
            <a class="catalog-section__help" href={helpUrl} target="_blank" rel="noopener" aria-label={$_('details')}>
                <HelpCircle size={16} color="var(--text-color-3)" />
            </a>
        {/if}

        {#if actions}
            <div class="catalog-section__actions">
                {@render actions()}
            </div>
        {/if}
    </div>

    {#if open}
        <div class="catalog-section__body" id="catalog-section-{id}" transition:slide={{ duration: 200 }}>
            {#if description}
                <p class="catalog-section__description">{description}</p>
            {/if}
            {@render children()}
        </div>
    {/if}
</section>

<style lang="postcss">
    .catalog-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .catalog-section__head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
        padding: 4px 0;
    }

    .catalog-section__toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 32px;
        padding: 0 6px 0 2px;
        border-radius: var(--border-radius-3);
        color: var(--text-color-1);
        font-weight: 700;
        font-size: 14px;
        letter-spacing: .02em;
        white-space: nowrap;
        transition: background-color .15s ease;

        &:hover {
            background-color: var(--bg-color-2);
        }
    }

    .catalog-section__chevron {
        display: grid;
        place-items: center;
        color: var(--text-color-3);
        transition: transform .2s ease;
        transform: rotate(-90deg);

        .catalog-section--open & {
            transform: rotate(0deg);
        }
    }

    .catalog-section__count {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-color-3);
        background-color: var(--bg-color-2);
        border-radius: 999px;
        min-width: 20px;
        height: 18px;
        padding: 0 6px;
        display: inline-grid;
        place-items: center;
        line-height: 1;
    }

    .catalog-section__spinner {
        display: grid;
        place-items: center;
    }

    .catalog-section__help {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;

        &:hover {
            background-color: var(--bg-color-2);
        }
    }

    .catalog-section__actions {
        margin-left: auto;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
        gap: 4px;
    }

    .catalog-section__body {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .catalog-section__description {
        font-size: 12.5px;
        line-height: 1.6;
        color: var(--text-color-3);
        margin: 0;
    }
</style>
