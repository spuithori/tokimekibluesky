<script lang="ts">
    import {onMount} from "svelte";
    import {createAccountProfileLoader} from "$lib/components/acp/accountProfileLoader.svelte";

    let { agent, key } = $props();
    const { profile, loadFresh } = createAccountProfileLoader(() => agent, () => key);

    onMount(() => {
        loadFresh();
    });
</script>

<div class="agent-user-item">
    <div class="agent-user-item__avatar">
        {#if (profile.avatar)}
            <img src="{profile.avatar}" alt="">
        {/if}
    </div>

    <div class="agent-user-item__content">
        <p class="agent-user-item__name">{profile.displayName || ' '}</p>
        <p class="agent-user-item__handle">@{agent.handle()}</p>
    </div>
</div>

<style lang="postcss">
    .agent-user-item {
        color: var(--text-color-1);
        font-size: 14px;
        white-space: nowrap;
        padding: 8px 16px;
        width: 100%;
        text-align: left;
        display: grid;
        grid-template-columns: 40px 1fr;
        gap: 10px;

        &:hover {
            background-color: var(--bg-color-2);
        }

        &__avatar {
            overflow: hidden;
            aspect-ratio: 1 / 1;
            border-radius: 50%;
            background-color: var(--primary-color);

            img {
                display: block;
                width: 100%;
            }
        }

        &__content {
            display: flex;
            flex-direction: column;
            line-height: 1.3;
        }

        &__name {
            font-weight: bold;
            font-size: 14px;
            color: var(--text-color-1);
        }

        &__handle {
            font-size: 12px;
            color: var(--text-color-3);
        }
    }
</style>