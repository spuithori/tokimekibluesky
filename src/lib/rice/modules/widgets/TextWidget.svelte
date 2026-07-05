<script lang="ts">
    import { parseCommandLine, runCommand } from '$lib/commands/registry.svelte';

    interface Props {
        options?: Record<string, string>;
    }

    let { options = {} }: Props = $props();

    const content = $derived(options.content ?? '');
    const command = $derived(options['on-click']);

    function handleClick(event: MouseEvent) {
        if (!command) return;
        const { id, arg } = parseCommandLine(command);
        const anchor = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        runCommand(id, arg, { anchor });
    }
</script>

{#if content}
    {#if command}
        <button
            class="rice-text-widget rice-text-widget--clickable"
            style:text-align={options.align}
            style:font-size={options.size}
            style:color={options.color}
            onclick={handleClick}
        >{content}</button>
    {:else}
        <div
            class="rice-text-widget"
            style:text-align={options.align}
            style:font-size={options.size}
            style:color={options.color}
        >{content}</div>
    {/if}
{/if}

<style>
    .rice-text-widget {
        display: block;
        width: 100%;
        padding: 8px 12px;
        color: var(--text-color-1);
        font-size: var(--rice-statusbar-font-size, 14px);
        text-align: left;
        overflow-wrap: break-word;
    }

    .rice-text-widget--clickable {
        border-radius: var(--border-radius-2);
        transition: background-color var(--anim-hover-duration, .15s) var(--anim-hover-easing, ease);

        &:hover {
            background-color: var(--side-nav-hover-bg-color, var(--bg-color-2));
        }
    }
</style>
