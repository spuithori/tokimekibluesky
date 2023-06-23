<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { agent } from '$lib/stores';
    import { page } from '$app/stores';
    import Thread from "./Thread.svelte";
    import { beforeNavigate } from "$app/navigation";
    import { fly } from 'svelte/transition';
    import spinner from '$lib/images/loading.svg';

    let isMuted: boolean = false;
    let isMuteDisplay: boolean = false;

    $: feeds = getPostThread($page.params.id, $page.params.handle);

    function isMutedIncludes(feed) {
        isMuted = feed.post.author?.viewer.muted;

        if (feed.parent && !isMuted) {
            isMutedIncludes(feed.parent);
        }

        if (feed.replies?.length && !isMuted) {
            isMutedIncludes(feed.replies[0]);
        }
    }

    async function getDidByHandle(handle) {
        const res = await $agent.agent.api.com.atproto.identity.resolveHandle({ handle: handle });
        return res.data.did;
    }

    async function getPostThread(id, handle) {
        const did = await getDidByHandle(handle);
        const uri = 'at://' + did + '/app.bsky.feed.post/' + id;
        const raw = await $agent.agent.api.app.bsky.feed.getPostThread({uri: uri});
        let feeds = [ raw.data.thread ];

        feeds.forEach(feed => {
            if (!feed.blocked) {
                isMutedIncludes(feed);
            }
        });

        return feeds;
    }

    beforeNavigate(async () => {
        isMuteDisplay = false;
    })
</script>

<div class="timeline thread-wrap">
  {#if (isMuted && !isMuteDisplay)}
    <div class="thread-notice" class:thread-notice--shown={isMuteDisplay}>
      <p class="thread-notice__text">スレッドにミュートしているユーザーが含まれています。</p>

      <button class="button button--sm" on:click={() => {isMuteDisplay = true}}>表示する</button>
    </div>
  {/if}

  <h1 class="page-nav-title" in:fly={{ x: 10, duration: 100, delay: 100 }}>{$_('title_thread')}</h1>

  {#await feeds}
    <div class="thread-loading">
      <img src={spinner} alt="">
    </div>
  {:then feeds}
    <Thread feeds={feeds} depth={0}></Thread>
  {/await}
</div>

<style lang="postcss">
    .thread-wrap {
        position: relative;
    }

    .thread-notice {
        position: absolute;
        bottom: 0;
        top: 0;
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: var(--bg-color-2);
        z-index: 1;
        text-align: center;
        padding: 20px;

        &__text {
            margin-bottom: 20px;
        }

        &--shown {
            display: none;
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