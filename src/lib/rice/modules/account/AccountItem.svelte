<script lang="ts">
    import UserRound from '@lucide/svelte/icons/user-round';
    import { agent, agents } from '$lib/stores';
    import { accountsDb } from '$lib/db';
    import { getAccountIdByDid } from '$lib/util';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { parseCommandLine, runCommand } from '$lib/commands/registry.svelte';

    interface Props {
        variant?: 'bar' | 'column' | 'menu';
        options?: Record<string, string>;
    }

    let { variant = 'bar', options: itemOptions = {} }: Props = $props();

    const options = $derived({ ...(riceState.moduleConfig('account')?.options ?? {}), ...itemOptions });
    const show = $derived(options['show'] ?? 'both');
    const handle = $derived($agent ? $agent.handle() : null);

    let avatar = $state('');

    $effect(() => {
        const currentAgent = $agent;
        if (!currentAgent) {
            avatar = '';
            return;
        }
        let cancelled = false;
        const accountId = getAccountIdByDid($agents, currentAgent.did());
        accountsDb.accounts.get(accountId as any).then((account) => {
            if (!cancelled) {
                avatar = account?.avatar ?? '';
            }
        }).catch(() => {});
        return () => {
            cancelled = true;
        };
    });

    function handleClick(event: MouseEvent) {
        const { id, arg } = parseCommandLine(options['on-click'] ?? 'nav.profile');
        const anchor = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        runCommand(id, arg, { anchor });
    }
</script>

{#if handle}
    {#if variant === 'menu'}
        <button class="rice-account-header" onclick={handleClick}>
            {#if avatar}
                <img class="rice-account-header__avatar" src={avatar} alt="">
            {:else}
                <span class="rice-account-header__fallback">
                    <UserRound size={22} color="var(--text-color-2)" strokeWidth="var(--icon-stroke-width, 2px)"></UserRound>
                </span>
            {/if}
            <span class="rice-account-header__handle">@{handle}</span>
        </button>
    {:else}
        <button class="rice-bar-item" onclick={handleClick}>
            {#if show !== 'handle'}
                {#if avatar}
                    <img class="rice-bar-item__avatar" src={avatar} alt="">
                {:else}
                    <UserRound size={16} color="var(--text-color-2)" strokeWidth="var(--icon-stroke-width, 2px)"></UserRound>
                {/if}
            {/if}
            {#if show !== 'avatar'}
                <span class="rice-bar-item__label">{handle}</span>
            {/if}
        </button>
    {/if}
{/if}

<style>
    .rice-account-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        margin-bottom: 8px;
        border-radius: var(--border-radius-3);
        color: var(--text-color-1);
        text-align: left;
        transition: background-color .15s ease;

        &:hover {
            background-color: var(--side-nav-hover-bg-color, var(--bg-color-2));
        }
    }

    .rice-account-header__avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
    }

    .rice-account-header__fallback {
        display: grid;
        place-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: var(--bg-color-2);
        flex-shrink: 0;
    }

    .rice-account-header__handle {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
        color: var(--text-color-2);
    }
</style>
