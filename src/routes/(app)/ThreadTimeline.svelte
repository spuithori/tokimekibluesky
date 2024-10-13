<script lang="ts">
    import {agent, settings} from '$lib/stores';
    import spinner from '$lib/images/loading.svg';
    import Thread from './profile/[handle]/post/[id]/Thread.svelte';
    import {onMount} from "svelte";
    import {_} from "svelte-i18n";
    import {isReasonPin} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
    import TimelineItem from "./TimelineItem.svelte";
    import VirtualThreadList from "$lib/components/thread/VirtualThreadList.svelte";

    export let column;
    export let index;
    export let _agent = $agent;
    export let isRefreshing;
    export let isJunk = false;
    let scrollTop: undefined | Number = undefined;
    let rootClientHeight = 0;
    let rootIndex;

    let isMuted: boolean = false;
    let isMuteDisplay: boolean = false;

    let flatThread = [];

    function isMutedIncludes(feed) {
        isMuted = feed.post.author?.viewer.muted;

        if (feed.parent && !isMuted) {
            isMutedIncludes(feed.parent);
        }

        if (feed.replies?.length && !isMuted) {
            isMutedIncludes(feed.replies[0]);
        }
    }

    async function getPostThread() {
        isRefreshing = true;
        const uri = column.algorithm.algorithm;

        try {
            const raw = await _agent.agent.api.app.bsky.feed.getPostThread({uri: uri});
            column.data.feed = [ raw.data.thread ];

            column.data.feed.forEach(feed => {
                if (!feed.blocked) {
                    isMutedIncludes(feed);
                }
            });

            if (isJunk) {
                scrollTop = $settings.design.layout === 'decks' ? document.querySelector('.modal-page-content').scrollTop : document.querySelector(':root').scrollTop;
            }
        } catch (e) {
            column.data.feed = 'NotFound';
        }

        isRefreshing = false;
    }

    async function getFlatThread() {
        const uri = column.algorithm.algorithm;

        try {
            const raw = await _agent.agent.api.app.bsky.feed.getPostThread({uri: uri});
            const thread = [ raw.data.thread ];

            if (thread.length) {
                flatPost(thread);
            }

            column.data.feed = flatThread;
            rootIndex = flatThread.findIndex(feed => feed.depth === 0);
        } catch (e) {
            column.data.feed = 'NotFound';
        }
    }

    function flatPost(thread, depth = 0, position: 'parent' | 'child' | undefined = undefined) {
        thread.forEach((feed, index) => {
            if (feed.parent) {
                flatPost([feed.parent], depth - 1, 'parent');
            }

            const _feed = {
                ...feed,
                depth,
                position,
            }
            flatThread = [...flatThread, _feed];

            if (feed.replies?.length) {
                flatPost(feed.replies, depth + 1, 'child');
            }
        })
    }

    onMount(async () => {
        if (isJunk) {
            await getFlatThread();
        } else {
            await getPostThread();
        }
    })
</script>

{#if (isMuted && !isMuteDisplay)}
  <div class="thread-notice">
    <p class="thread-notice__text">{$_('muted_user_thread')}</p>

    <button class="button button--sm" on:click={() => {isMuteDisplay = true}}>{$_('show_button')}</button>
  </div>
{/if}

{#if !column.data.feed.length}
  <div class="thread-loading">
    <img src={spinner} alt="">
  </div>
{:else if (column.data.feed === 'NotFound')}
  <p class="thread-error">{$_('error_thread_notfound')}</p>
{:else}
  {#if (isJunk)}
    <VirtualThreadList {_agent} {column} {rootIndex}></VirtualThreadList>
  {:else}
    <div class="timeline thread-wrap" style="--root-client-height: {rootClientHeight}px" >
      <Thread feeds={column.data.feed} depth={0} column={column} {_agent} bind:rootClientHeight={rootClientHeight} scrollTop={scrollTop}></Thread>
    </div>
  {/if}
{/if}

<style lang="postcss">
    .thread-wrap {
        padding-bottom: calc(94vh - 120px - var(--root-client-height, 0px));

        @media (max-width: 767px) {
            padding-bottom: calc(100vh - 120px - var(--root-client-height, 0px));
        }
    }

    .thread-loading {
        text-align: center;

        img {
            width: 50px;
            height: 50px;
        }
    }
</style>