<script lang="ts">
    import {agent} from '$lib/stores';
    import spinner from '$lib/images/loading.svg';
    import Thread from './profile/[handle]/post/[id]/Thread.svelte';
    import {onMount} from "svelte";
    import {_} from "svelte-i18n";

    export let column;
    export let index;
    export let _agent = $agent;
    export let isRefreshing;
    let rootClientHeight = 0;

    let isMuted: boolean = false;
    let isMuteDisplay: boolean = false;

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
        } catch (e) {
            column.data.feed = 'NotFound';
        }

        isRefreshing = false;
    }

    onMount(async () => {
        await getPostThread();
    })
</script>

<div class="timeline thread-wrap" style="--root-client-height: {rootClientHeight}px">
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
    <Thread feeds={column.data.feed} depth={0} column={column} {_agent} bind:rootClientHeight={rootClientHeight}></Thread>
  {/if}
</div>

<style lang="postcss">
    .thread-wrap {
        position: relative;
        margin-bottom: calc(94vh - 120px - var(--root-client-height, 0px));

        @media (max-width: 767px) {
            margin-bottom: calc(100vh - 120px - var(--root-client-height, 0px));
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