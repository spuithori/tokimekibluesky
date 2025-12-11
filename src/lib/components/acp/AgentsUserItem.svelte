<script lang="ts">
    import {accountsDb} from "$lib/db";
    import {onMount} from "svelte";

    let { agent, key } = $props();
    let avatar = $state();
    let displayName = $state();

    accountsDb.accounts.get(key)
        .then(value => {
            avatar = value?.avatar;
            displayName = value?.name;
        })

    onMount(async () => {
        try {
            const profile = await agent.agent.api.app.bsky.actor.getProfile({actor: agent.did() as string});

            avatar = profile.data?.avatar || '';
            displayName = profile.data?.displayName || '';

            accountsDb.accounts.update(key, {
                avatar: avatar,
                name: displayName,
            });
        } catch (e) {
            console.error(e);
        }
    });
</script>

<div class="agent-user-item">
    <div class="agent-user-item__avatar">
        {#if (avatar)}
            <img src="{avatar}" alt="">
        {/if}
    </div>

    <div class="agent-user-item__content">
        <p class="agent-user-item__name">{displayName || ' '}</p>
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