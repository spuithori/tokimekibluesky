<script lang="ts">
    import { settings } from '$lib/stores';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { runCommand } from '$lib/commands/registry.svelte';
    import Pencil from '@lucide/svelte/icons/pencil';
    import X from '@lucide/svelte/icons/x';

    interface Props {
        open: boolean;
        onOpen: () => void;
        onClose: () => void;
    }

    let { open, onOpen, onClose }: Props = $props();

    const fab = $derived(riceState.fab);
    const show = $derived(fab?.show ?? true);

    const fabVars = $derived.by(() => {
        if (!fab) return '';
        const p = fab.props;
        let style = '';
        if (p.size) style += `--rice-fab-size: ${p.size};`;
        if (p.rounding) style += `--rice-fab-rounding: ${p.rounding};`;
        if (p.offset) style += `--rice-fab-offset: ${p.offset};`;
        return style;
    });

    function handleOpenClick() {
        if (fab?.onClick) {
            runCommand(fab.onClick);
            return;
        }
        onOpen();
    }
</script>

{#if show}
    {#if open}
        <button
            class="publish-toggle publish-toggle--close"
            class:publish-toggle--left={fab?.position === 'left'}
            aria-label="Close post composer."
            class:publish-toggle--vk={!$settings.design?.mobilePostLayoutTop}
            style={fabVars}
            onclick={onClose}
        >
            <X size="24" color="var(--bg-color-1)"></X>
        </button>
    {:else}
        <button
            class="publish-toggle"
            class:publish-toggle--left={fab?.position === 'left'}
            aria-label="Open post composer."
            class:publish-toggle--decks={riceState.layoutStyle === 'deck'}
            style={fabVars}
            onclick={handleOpenClick}
        >
            <Pencil size="22" color="var(--bg-color-1)"></Pencil>
        </button>
    {/if}
{/if}

<style lang="postcss">
    .publish-toggle {
        display: flex;
        position: fixed;
        right: 16px;
        bottom: calc(16px + var(--safe-area-bottom));
        width: var(--rice-fab-size, 52px);
        height: var(--rice-fab-size, 52px);
        border-radius: var(--rice-fab-rounding, 16px);
        background-color: var(--primary-color);
        align-items: center;
        justify-content: center;
        z-index: 2001;
        pointer-events: auto;

        @media (max-width: 767px) {
            display: flex;
            bottom: calc(var(--rice-footer-height, 56px) + var(--rice-fab-offset, 8px) + var(--safe-area-bottom));
        }

        &--left {
            right: auto;
            left: 16px;
        }

        &--vk {
            @media (max-width: 767px) {
                display: none;
            }
        }

        &--decks {
            @media (min-width: 768px) {
                display: none;
            }
        }
    }
</style>
