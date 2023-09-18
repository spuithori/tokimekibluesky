<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {agent, didHint, settings} from '$lib/stores';
    import { page } from '$app/stores';
    import Thread from "./Thread.svelte";
    import { beforeNavigate } from "$app/navigation";
    import spinner from '$lib/images/loading.svg';
    import {isDid} from "$lib/util";
    import PageModal from "$lib/components/ui/PageModal.svelte";

    let isMuted: boolean = false;
    let isMuteDisplay: boolean = false;

    $: feeds = getPostThread($page.params.id, $page.params.handle);

    function isMutedIncludes(feed) {
        isMuted = feed.post?.author.viewer.muted;

        if (feed.parent && !isMuted) {
            isMutedIncludes(feed.parent);
        }

        if (feed.replies?.length && !isMuted) {
            isMutedIncludes(feed.replies[0]);
        }
    }

    async function getDidByHandle(handle) {
        if ($didHint) {
            const _did = $didHint;
            didHint.set('');
            return _did;
        }

        if (isDid(handle)) {
            return handle;
        }

        const res = await $agent.agent.api.com.atproto.identity.resolveHandle({ handle: handle });
        return res.data.did;
    }

    async function getPostThread(id, handle) {
        const did = await getDidByHandle(handle);
        const uri = 'at://' + did + '/app.bsky.feed.post/' + id;
        const raw = await $agent.agent.api.app.bsky.feed.getPostThread({uri: uri});
        let feeds = [ raw.data.thread ];

        console.log(feeds);

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

<PageModal>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" on:click={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h2 class="column-heading__title">{$_('title_thread')}</h2>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="timeline thread-wrap">
    {#if (isMuted && !isMuteDisplay)}
      <div class="thread-notice" class:thread-notice--shown={isMuteDisplay}>
        <p class="thread-notice__text">{$_('muted_user_thread')}</p>

        <button class="button button--sm" on:click={() => {isMuteDisplay = true}}>{$_('show_button')}</button>
      </div>
    {/if}

    {#await feeds}
      <div class="thread-loading">
        <img src={spinner} alt="">
      </div>
    {:then feeds}
      <Thread feeds={feeds} depth={0}></Thread>
    {:catch error}
      {#if (error.error === 'NotFound')}
        <p class="thread-error">{$_('error_thread_notfound')}</p>
      {:else}
        {error.message}
      {/if}
    {/await}
  </div>
</PageModal>

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