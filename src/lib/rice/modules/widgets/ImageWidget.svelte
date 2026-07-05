<script lang="ts">
    import { parseCommandLine, runCommand } from '$lib/commands/registry.svelte';

    interface Props {
        options?: Record<string, string>;
    }

    let { options = {} }: Props = $props();

    const src = $derived(options.src && /^(https?:|data:image\/)/.test(options.src) ? options.src : null);
    const command = $derived(options['on-click']);

    function handleClick(event: MouseEvent) {
        if (!command) return;
        const { id, arg } = parseCommandLine(command);
        const anchor = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        runCommand(id, arg, { anchor });
    }
</script>

{#if src}
    {#if command}
        <button class="rice-image-widget rice-image-widget--clickable" onclick={handleClick}>
            <img {src} alt={options.alt ?? ''} loading="lazy" style:height={options.height} style:border-radius={options.rounding} />
        </button>
    {:else}
        <div class="rice-image-widget">
            <img {src} alt={options.alt ?? ''} loading="lazy" style:height={options.height} style:border-radius={options.rounding} />
        </div>
    {/if}
{/if}

<style>
    .rice-image-widget {
        display: block;
        width: 100%;
        padding: 4px;

        img {
            display: block;
            width: 100%;
            height: auto;
            object-fit: cover;
        }
    }

    .rice-image-widget--clickable {
        cursor: pointer;

        &:hover {
            opacity: .9;
        }
    }
</style>
