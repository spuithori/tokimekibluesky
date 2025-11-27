<script lang="ts">
    import { fly } from 'svelte/transition';
    import {agents} from "$lib/stores";
    import AvatarAgentsSelectorModalItem from "$lib/components/acp/AvatarAgentsSelectorModalItem.svelte";
    import { offset, flip, shift } from 'svelte-floating-ui/dom';
    import { createFloatingActions } from 'svelte-floating-ui';

    interface Props {
        onselect: any;
        onclose: any;
    }

    let { onselect, onclose }: Props = $props();
    let el = $state();

    const [ floatingRef, floatingContent ] = createFloatingActions({
        strategy: 'absolute',
        placement: 'top',
        middleware: [
            offset(32),
            flip(),
            shift(),
        ]
    });

    function handleClick(event) {
        const rect = el.getBoundingClientRect();
        const isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width);

        if (!isInDialog) {
            onclose();
        }
    }

    $effect(() => {
        if (el) {
            el.showModal();
        }
    });
</script>

<div class="avatar-agents-selector-skeleton" use:floatingRef>
    <dialog class="avatar-agents-selector-modal"
            tabindex="-1"
            bind:this={el}
            onclick={handleClick}
            use:floatingContent
            transition:fly={{ y: 30, duration: 250 }}
    >
        {#each $agents as [key, agent]}
            {#if (agent.agent?.session)}
                <AvatarAgentsSelectorModalItem
                    {agent}
                    {key}
                    onselect={() => {onselect(agent)}}
                ></AvatarAgentsSelectorModalItem>
            {/if}
        {/each}
    </dialog>
</div>

<style lang="postcss">
    .avatar-agents-selector-modal {
        width: fit-content;
        z-index: 101;
        background-color: var(--bg-color-1);
        border-radius: var(--border-radius-3);
        box-shadow: 0 0 8px var(--box-shadow-color-1);
        padding: 8px;
        min-width: 200px;
        border: none;
    }
</style>