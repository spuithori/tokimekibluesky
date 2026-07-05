<script lang="ts">
    import MessageCircleMore from '@lucide/svelte/icons/message-circle-more';
    import { chatState } from '$lib/classes/chatState.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { parseCommandLine, runCommand } from '$lib/commands/registry.svelte';

    interface Props {
        variant?: 'bar' | 'column';
        options?: Record<string, string>;
    }

    let { options: itemOptions = {} }: Props = $props();

    const options = $derived({ ...(riceState.moduleConfig('chat')?.options ?? {}), ...itemOptions });
    const count = $derived(chatState.totalChatCount + chatState.totalChatRequestCount);
    const hidden = $derived(options['hide-zero'] === 'true' && count === 0);

    function handleClick(event: MouseEvent) {
        const { id, arg } = parseCommandLine(options['on-click'] ?? 'nav.chat');
        const anchor = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        runCommand(id, arg, { anchor });
    }
</script>

{#if !hidden}
    <button class="rice-bar-item" onclick={handleClick}>
        <MessageCircleMore size={16} color="var(--text-color-2)" strokeWidth="var(--icon-stroke-width, 2px)"></MessageCircleMore>
        {#if count > 0}
            <span class="rice-bar-item__count rice-bar-item__count--active">{count}</span>
        {/if}
    </button>
{/if}
