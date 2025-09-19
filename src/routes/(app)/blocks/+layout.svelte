<script lang="ts">
    import {_} from 'svelte-i18n';
    import { ArrowLeft, X } from "lucide-svelte";
    import {agents} from "$lib/stores";
    import AgentsUserItem from "$lib/components/acp/AgentsUserItem.svelte";
    import {page} from "$app/state";

    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();
    const id = $derived(page.params.id);
</script>

<svelte:head>
    <title>{$_('blocks_list')} - TOKIMEKI</title>
</svelte:head>

<div class="settings-modal">
    <div class="settings-modal-content">
        <div class="settings-column">
            <div class="settings-toc" class:settings-toc--mobile-visible={!id}>
                <div class="column-heading only-mobile">
                    <div class="column-heading__buttons">
                        <button class="settings-back" aria-label="Back" onclick={() => {history.back()}}>
                            <ArrowLeft size="24" color="var(--text-color-1)"></ArrowLeft>
                        </button>
                    </div>

                    <h1 class="column-heading__title">{$_('blocks_list')}</h1>

                    <div class="column-heading__buttons column-heading__buttons--right">
                        <a class="settings-back" href="/">
                            <X size="24" color="var(--text-color-1)"></X>
                        </a>
                    </div>
                </div>

                <div class="timeline timeline--inline-p0">
                    {#each $agents as [key, agent]}
                        {#if (agent.agent?.session)}
                            <a href="/blocks/{agent.did()}" class="user-item-wrap" class:user-item-wrap--current={agent.did() === id}>
                                <AgentsUserItem {agent} {key}></AgentsUserItem>
                            </a>
                        {/if}
                    {/each}
                </div>
            </div>

            <div class="settings-content">
                <div class="settings-content-container">
                    {#key id}
                        {@render children?.()}
                    {/key}
                </div>
            </div>
        </div>
    </div>

    <a class="modal-background-close" aria-hidden="true" href="/"></a>
</div>

<style lang="postcss">
    .settings-column {
        background-color: var(--bg-color-1);
        display: grid;
        grid-template-columns: 320px 1fr;
        height: 100%;

        @media (max-width: 767px) {
            display: block;
        }
    }

    .settings-content {
        min-width: 0;
        height: 100%;
        overflow-y: scroll;

        @media (max-width: 767px) {
            padding-left: 0;
        }
    }

    .settings-toc {
        border-right: 1px solid var(--border-color-2);
        overflow-y: auto;

        @media (max-width: 767px) {
            display: none;
            border-right: none;
        }

        &--mobile-visible {
            @media (max-width: 767px) {
                display: block;
                overflow-y: auto;
                height: 100vh;
            }
        }
    }

    .user-item-wrap {
        display: block;

        &:hover {
            text-decoration: none;
        }

        &--current {
            background-color: var(--bg-color-2);
        }
    }
</style>