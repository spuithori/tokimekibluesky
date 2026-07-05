<script lang="ts">
    import { parseCommandLine, runCommand } from '$lib/commands/registry.svelte';

    interface Props {
        options?: Record<string, string>;
    }

    let { options = {} }: Props = $props();

    const label = $derived(options.label ?? '');
    const command = $derived(options['on-click']);
    const primary = $derived(options.appearance === 'primary');

    function handleClick(event: MouseEvent) {
        if (!command) return;
        const { id, arg } = parseCommandLine(command);
        const anchor = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        runCommand(id, arg, { anchor });
    }
</script>

{#if label && command}
    <button class="rice-button-widget" class:rice-button-widget--primary={primary} onclick={handleClick}>{label}</button>
{/if}

<style>
    .rice-button-widget {
        display: block;
        width: 100%;
        padding: 10px 14px;
        border: 1px solid var(--border-color-1);
        border-radius: var(--rice-statusbar-rounding, 999px);
        color: var(--text-color-1);
        font-size: var(--rice-statusbar-font-size, 14px);
        font-weight: bold;
        text-align: center;
        transition: background-color var(--anim-hover-duration, .15s) var(--anim-hover-easing, ease);

        &:hover {
            background-color: var(--side-nav-hover-bg-color, var(--bg-color-2));
        }
    }

    .rice-button-widget--primary {
        border: none;
        background-color: var(--primary-color);
        color: var(--bg-color-1);

        &:hover {
            background-color: var(--primary-color);
            opacity: .9;
        }
    }
</style>
