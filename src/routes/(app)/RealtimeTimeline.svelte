<script lang="ts">
    import {agent, columns} from '$lib/stores';
    import { realtime, isRealtimeConnected } from "$lib/stores";
    import TimelineItem from "./TimelineItem.svelte";
    import {createEventDispatcher, onDestroy, onMount} from 'svelte';
    import MediaTimelineItem from "./MediaTimelineItem.svelte";
    const dispatch = createEventDispatcher();
    import toast from "svelte-french-toast";
    import {_} from "svelte-i18n";
    import {connect, disconnect} from "$lib/realtime";
    import {accountsDb} from "$lib/db";

    export let column;
    export let index;
    export let _agent = $agent;

    let follows = [];
    let isFollowsListRefreshing = false;
    let isFollowsListFinished = false;
    let accountId;

    $: getRealtime($realtime.data);

    async function getRecord(uri, repost = undefined, retryCount = 0) {
        try {
            const res = await _agent.agent.api.app.bsky.feed.getPostThread({depth: 0, parentHeight: 1, uri: uri});
            let thread = res.data.thread;

            if (thread?.parent && thread.post.record.reply) {
                thread.reply = {
                    parent: thread.parent.post,
                    root: thread.post.record.reply.root,
                }
            }

            if (repost) {
                const rres = await _agent.agent.api.app.bsky.actor.getProfile({actor: repost.repo})
                thread.reason = {
                    $type: 'app.bsky.feed.defs#reasonRepost',
                    indexedAt: repost.indexedAt,
                    by: rres.data,
                }
            }

            column.data.feed.forEach(item => item.post.indexedAt = item.post.indexedAt);
            column.data.feed = [thread, ...column.data.feed];

            if (column.data.feed.length > 40) {
                column.data.feed.pop();
                column.data.feed = column.data.feed;
            }
        } catch (e) {
            if (retryCount < 3) {
                retryCount = retryCount + 1;
                console.log('Post get failure. Retry: ' + retryCount)
                await new Promise(resolve => setTimeout(resolve, 2000));
                await getRecord(uri, repost, retryCount);
            } else {
                console.error(e);
            }
        }
    }

    function streamSelector(algorithm, repo, text = '') {
        if (algorithm === 'following') {
            return follows.some(follow => follow === repo);
        }

        if (algorithm === 'search' && column.algorithm.search) {
            return text.includes(column.algorithm.search);
        }

        return false;
    }

    async function getRealtime(data) {
        if (!$realtime.isConnected) {
            await connect();
        }

        if (!isFollowsListFinished) {
            return false;
        }

        const path = data.op.path;
        const repo = data.body.repo;
        const uri = 'at://' + repo + '/' + path;
        const isStream: boolean = streamSelector(column.algorithm?.algorithm || 'following', repo, data.record.text);

        if (data.record.$type === 'app.bsky.feed.post' && typeof data.record.text === 'string') {
            if (isStream) {
                await getRecord(uri);
            }
        }

        if (data.record.$type === 'app.bsky.feed.repost') {
            const subject = data.record.subject.uri;
            const repost = {
                repo: repo,
                indexedAt: data.record.createdAt,
            }

            if (isStream) {
                await getRecord(subject, repost);
            }
        }
    }

    async function getFollows() {
        isFollowsListRefreshing = true;
        let cursor = '';
        let count = 0;
        follows = [];

        try {
            follows = [...follows, _agent.did()];

            while(cursor !== undefined && count < 30) {
                const res = await _agent.agent.api.app.bsky.graph.getFollows({actor: _agent.did(), limit: 100, cursor: cursor});

                res.data.follows.forEach(follow => {
                    follows = [...follows, follow.did];
                })

                count = count + 1;
                cursor = res.data.cursor;
            }

            try {
                const id = await accountsDb.accounts.update(accountId, {
                    following: {
                        data: follows,
                        indexedAt: Date.now().toString()
                    }
                });
            } catch (e) {
                console.error(e);
            }

            toast.success($_('realtime_success_get_follows') + ': ' + follows.length);
            isFollowsListRefreshing = false;
        } catch(e) {
            toast.error($_('realtime_failed_get_follows'));
            dispatch('disconnect');
            isFollowsListRefreshing = false;
            throw new Error(e);
        }
    }

    async function refreshFollowsList() {
        await getFollows();
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
            await getFollows();
        }

        isFollowsListFinished = true;
    })

    onDestroy(async() => {
        await disconnect();
    })
</script>

<div class="realtime-wrap">
    <div class="timeline timeline--virtual timeline--{column.style}">
        <div class="realtime-status" class:realtime-status--connected={$isRealtimeConnected}></div>

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