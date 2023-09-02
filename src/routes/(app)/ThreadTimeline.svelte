<script lang="ts">
    import {agent, agents, columns} from '$lib/stores';
    import spinner from '$lib/images/loading.svg';
    import Thread from './profile/[handle]/post/[id]/Thread.svelte';
    import {onMount} from "svelte";
    import {_} from "svelte-i18n";

    export let column;
    export let index;
    export let _agent = $agent;

    let feeds;
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
        const uri = column.algorithm.algorithm;

        try {
            const raw = await _agent.agent.api.app.bsky.feed.getPostThread({uri: uri});
            feeds = [ raw.data.thread ];

            feeds.forEach(feed => {
                if (!feed.blocked) {
                    isMutedIncludes(feed);
                }
            });
        } catch (e) {
            feeds = 'NotFound';
        }
    }

    onMount(async () => {
        await getPostThread();
        console.log(feeds);
    })
</script>

<div class="timeline thread-wrap">
  {#if (isMuted && !isMuteDisplay)}
    <div class="thread-notice" class:thread-notice--shown={isMuteDisplay}>
      <p class="thread-notice__text">{$_('muted_user_thread')}</p>

      <button class="button button--sm" on:click={() => {isMuteDisplay = true}}>{$_('show_button')}</button>
    </div>
  {/if}

  {#if !feeds}
    <div class="thread-loading">
      <img src={spinner} alt="">
    </div>
  {:else if (feeds === 'NotFound')}
    <p class="thread-error">{$_('error_thread_notfound')}</p>
  {:else}
    <Thread feeds={feeds} depth={0} column={column} {_agent}></Thread>
  {/if}
</div>

<style lang="postcss">
    .thread-wrap {
        position: relative;
    }

    .thread-loading {
        text-align: center;

        img {
            width: 50px;
            height: 50px;
        }
    }
</style>