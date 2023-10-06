<script lang="ts">
    import {agent, columns} from '$lib/stores';
    import { realtime } from "$lib/stores";
    import TimelineItem from "./TimelineItem.svelte";
    import {createEventDispatcher, onMount} from 'svelte';
    import MediaTimelineItem from "./MediaTimelineItem.svelte";
    const dispatch = createEventDispatcher();
    import toast from "svelte-french-toast";
    import {_} from "svelte-i18n";
    import {getPostRealtime} from "$lib/realtime";
    import {accountsDb} from "$lib/db";
    import {getFollowsWithUpdateDb} from "$lib/getActorsList";
    import {getAccountIdByDidFromDb} from "$lib/util";

    export let column;
    export let index;
    export let _agent = $agent;

    let follows = [];
    let isFollowsListRefreshing = false;
    let isFollowsListFinished = false;
    let accountId;

    $: insertRealtimeData($realtime);

    function insertRealtimeData(realtime) {
        if (!isFollowsListFinished) {
            return false;
        }

        getPostRealtime(realtime, follows, _agent)
            .then(value => {
                if (!value) {
                    return false;
                }

                column.data.feed = [value, ...column.data.feed];
            });
    }

    async function refreshFollowsList() {
        isFollowsListRefreshing = true;
        follows = await getFollowsWithUpdateDb(_agent, await getAccountIdByDidFromDb(_agent.did()));
        isFollowsListRefreshing = false;
    }

    onMount(async () => {
        if (column.algorithm.algorithm === 'following' || column.algorithm.algorithm === undefined) {
            const res = await _agent.getTimeline({limit: 20, cursor: '', algorithm: column.algorithm});
            column.data.feed = res.data.feed;
        }

        const account = await accountsDb.accounts
            .where('did')
            .equals(_agent.did() as string)
            .first();
        accountId = account.id;

        if (account.following) {
            follows = account.following.data;
        } else {
            await refreshFollowsList();
        }

        isFollowsListFinished = true;
    });
</script>

<div class="realtime-wrap">
    <div class="timeline timeline--virtual timeline--{column.style}">
        <p class="notice"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>{$_('realtime_column_obsolete')}</p>

        {#if (column.algorithm.algorithm === 'following' || column.algorithm.algorithm === undefined)}
            <div class="realtime-follows">
                <p class="realtime-follows__count"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users-2" aria-label="{$_('realtime_follows_count')}"><path d="M14 19a6 6 0 0 0-12 0"/><circle cx="8" cy="9" r="4"/><path d="M22 19a6 6 0 0 0-6-6 4 4 0 1 0 0-8"/></svg> {follows.length}</p>

                <button class="button button--ss" disabled={isFollowsListRefreshing} on:click={refreshFollowsList}>{$_('realtime_follows_refresh')}</button>
            </div>
        {/if}

        {#if (column.algorithm.algorithm === 'search')}
            <div class="realtime-search-form">
                <input class="realtime-search-form__input" type="text" bind:value={$columns[index].algorithm.search} placeholder="keywords...">
            </div>
        {/if}

        {#if (column.style === 'default')}
            {#each column.data.feed as data, index (data)}
                <TimelineItem data={ data } index={index} column={column} {_agent}></TimelineItem>
            {/each}
        {:else}
            <div class="media-list">
                {#each column.data.feed as data (data)}
                    {#if (data.post.embed?.images)}
                        <MediaTimelineItem data={data} {_agent}></MediaTimelineItem>
                    {/if}
                {/each}
            </div>
        {/if}
    </div>
</div>

<style lang="postcss">
    .realtime-follows {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-left: 26px;

        &__count {
            margin-right: auto;
            display: flex;
            align-items: center;
            gap: 4px;
        }
    }

    .realtime-status {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: var(--color-theme-7);
        position: absolute;
        left: 23px;
        top: 26px;
        margin-top: 2px;

        &::before {
            content: '';
            display: block;
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            box-shadow: 0 0 0 4px var(--color-theme-7);
            opacity: .3;
            animation: 1s ease-in-out infinite alternate status-dot;
        }

        &--connected {
            background-color: var(--color-theme-8);

            &::before {
                box-shadow: 0 0 0 4px var(--color-theme-8);
            }
        }
    }

    @keyframes status-dot {
        0% {
            opacity: .3;
        }

        100% {
            opacity: .2;
        }
    }

    .realtime-search-form {
        &__input {
            border-radius: 4px;
            border: 1px solid var(--border-color-1);
            background-color: var(--bg-color-2);
            height: 30px;
            width: 100%;
            padding: 0 10px 0 30px;
            font-size: 13px;
            color: var(--text-color-1);
        }
    }

    .realtime-wrap {
        height: 100%;
    }

    .timeline--virtual {
        display: flex;
        flex-direction: column;
        height: 100%;
    }
</style>