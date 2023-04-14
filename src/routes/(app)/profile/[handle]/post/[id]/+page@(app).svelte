<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { agent } from '$lib/stores';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import Thread from "./Thread.svelte";
    import {afterNavigate, beforeNavigate} from "$app/navigation";

    let feeds = [];
    let isMuted: boolean = false;
    let isMuteDisplay: boolean = false;
    $: recordId = $page.params.id;
    $: handle = $page.params.handle;

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
        const res = await $agent.agent.api.com.atproto.repo.describeRepo({ repo: handle });
        return res.data.did;
    }

    async function getPostThread() {
        const did = await getDidByHandle(handle);
        const uri = 'at://' + did + '/app.bsky.feed.post/' + recordId;
        const raw = await $agent.agent.api.app.bsky.feed.getPostThread({uri: uri});
        feeds = [ raw.data.thread ];

        feeds.forEach(feed => {
            isMutedIncludes(feed);
        })
    }

    /* onMount(async() => {
        await getPostThread();
    }) */

    beforeNavigate(async () => {
        isMuteDisplay = false;
        console.log(isMuteDisplay);
    })

    afterNavigate(async () => {
        feeds = [];
        await getPostThread();
    })
</script>

<div class="timeline thread-wrap">
  {#if (isMuted && !isMuteDisplay)}
    <div class="thread-notice" class:thread-notice--shown={isMuteDisplay}>
      <p class="thread-notice__text">スレッドにミュートしているユーザーが含まれています。</p>

      <button class="button button--sm" on:click={() => {isMuteDisplay = true}}>表示する</button>
    </div>
  {/if}

  <h1 class="thread-title">{$_('title_thread')}</h1>

  <Thread feeds={feeds}></Thread>
</div>

<style lang="postcss">
    .thread-wrap {
        position: relative;
    }

    .thread-title {
        text-align: center;
        margin-bottom: 20px;
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
</style>