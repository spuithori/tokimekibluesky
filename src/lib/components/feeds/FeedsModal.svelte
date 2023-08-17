<script lang="ts">
    import { agent } from '$lib/stores';
    import {createEventDispatcher, onMount} from 'svelte';
    import toast from 'svelte-french-toast';
    import { _ } from 'svelte-i18n';
    import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";
    const dispatch = createEventDispatcher();

    let popularFeeds = [];
    let savedFeeds = [];
    let tokimekiFeeds = [];

    async function save () {
        try {
            dispatch('close', {
                clear: false,
            });
        } catch (e) {
            toast.error('Error: ' + e);
        }
    }

    async function remove () {
       
    }

    async function getSavedFeeds () {
        const preferenceRes = await $agent.agent.api.app.bsky.actor.getPreferences()
        const preference = preferenceRes.data.preferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')
        savedFeeds = preference[0]?.saved || [];
        console.log(savedFeeds)
    }

    function isSaved(feed) {
        const uri = feed.uri;
        return savedFeeds.includes(uri);
    }

    onMount(async () => {
        await getSavedFeeds();

        if ($agent.agent.service.host === 'bsky.social') {
            const popularRes = await $agent.agent.api.app.bsky.unspecced.getPopularFeedGenerators();
            popularFeeds = popularRes.data.feeds;
            console.log(popularFeeds)
        }
        
        const tokimekiRes = await $agent.agent.api.app.bsky.feed.getActorFeeds({actor: $agent.agent.service.host === 'bsky.social' ? 'holybea.social' : 'holybea.nextsky.tokimeki.blue'});
        tokimekiFeeds = tokimekiRes.data.feeds;
    })
</script>

<div class="feeds-modal">
  <div class="feeds-modal-contents">
    <h2 class="feeds-modal-title">{$_('feeds_add_management')}</h2>

    <div class="feeds-group">
      <h3 class="feeds-group-title">{$_('tokimeki_feeds')}</h3>

      <div class="feeds-list">
        {#each tokimekiFeeds as feed}
          <FeedsItem feed={feed} subscribed={isSaved(feed)} on:close></FeedsItem>
        {/each}
      </div>
    </div>

    {#if ($agent.agent.service.host === 'bsky.social')}
      <div class="feeds-group">
        <h3 class="feeds-group-title">{$_('popular_feeds')}</h3>

        <div class="feeds-list">
          {#each popularFeeds as feed}
            <FeedsItem feed={feed} subscribed={isSaved(feed)} on:close></FeedsItem>
          {/each}
        </div>
      </div>
    {/if}

    <div class="feeds-modal-close">
      <button class="button button--sm" on:click={save}>{$_('close_button')}</button>
    </div>
  </div>

  <button class="modal-background-close" aria-hidden="true" on:click={save}></button>
</div>

<style lang="postcss">
    .feeds-modal {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        z-index: 9999;
        background-color: rgba(0, 0, 0, .5);
        overflow: auto;
        padding: 50px 0;

        @media (max-width: 767px) {
            display: block;
            overscroll-behavior-y: none;
            padding: 20px;
        }
    }

    .feeds-modal-contents {
        padding: 30px;
        border-radius: 10px;
        background-color: var(--bg-color-1);
        width: 740px;
        max-width: 100%;
        position: relative;
        z-index: 2;

        @media (max-width: 767px) {
            width: 100%;
        }
    }

    .feeds-modal-title {
        font-weight: 900;
        font-size: 20px;
        line-height: 1.5;
        margin-bottom: 26px;
    }

    .feeds-modal-close {
        text-align: center;
        margin-top: 20px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
    }

    .feeds-list {

    }

    .feeds-group-title {
        margin-bottom: 15px;
    }

    .feeds-group {
        margin-top: 30px;
    }
</style>