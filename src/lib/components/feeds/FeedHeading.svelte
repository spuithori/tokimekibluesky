<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import FeedSubscribeButton from "$lib/components/feeds/FeedSubscribeButton.svelte";
  import {onMount} from "svelte";
  import Info from '@lucide/svelte/icons/info';
  import AboutFeedModal from './AboutFeedModal.svelte';

  let { _agent, feed } = $props();
  let isAboutOpen = $state(false);
  let savedFeeds = $state();

  async function getSavedFeeds () {
    const preferenceRes = await _agent.xrpc.get('app.bsky.actor.getPreferences')
    const preference = preferenceRes.preferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')
    savedFeeds = preference[0]?.saved || [];
  }

  function isSaved(feed) {
    const uri = feed.uri;
    return savedFeeds.includes(uri);
  }

  onMount(async () => {
    await getSavedFeeds();
  })
</script>

<div class="feed-heading">
  <div class="feed-heading__avatar">
    {#if feed.avatar}
      <img src="{feed.avatar}" alt="">
    {:else}
      <span class="feed-avatar-empty"></span>
    {/if}
  </div>

  <div class="feed-heading__heading">
    <h1 class="feed-heading__title">{feed.displayName}</h1>
    <p class="feed-heading__description">{feed.description}</p>
  </div>


  <div class="feed-heading__buttons">
    {#if savedFeeds}
      <FeedSubscribeButton {feed} {_agent} subscribed={isSaved(feed)} size='ss'></FeedSubscribeButton>
    {/if}

    <button
      class="feed-heading__about-button"
      onclick={() => isAboutOpen = true}
    >
      <Info aria-label={$_('about_this_feed')} />
    </button>
  </div>

  {#if isAboutOpen && savedFeeds}
    <AboutFeedModal
      {_agent}
      feed={feed}
      onClose={()=> {
        isAboutOpen = false;
      }}
      subscribed={isSaved(feed)}
    />
  {/if}
</div>

<style lang="postcss">
  .feed-heading {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;

      &__avatar {
          width: 32px;
          aspect-ratio: 1 / 1;
          border-radius: var(--feed-avatar-border-radius, var(--border-radius-2));
          overflow: hidden;
          flex-shrink: 0;

          img {
              width: 100%;
              height: 100%;
              object-fit: contain;
          }
      }

      &__title {
          font-size: 15px;
          letter-spacing: .05em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.3;
      }

      &__description {
          color: var(--text-color-3);
          font-size: 12px;
          line-height: 1.3;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
      }

      &__buttons {
          display: flex;
          column-gap: 8px;
          margin-left: auto;
          flex-shrink: 0;
      }

      &__about-button {
          display: flex;
          align-items: center;
          align-self: center;
          padding: 2px;
          color: var(--text-color-3);
          font-size: 12px;
          border-radius: 100lvmax;
          transition: background-color var(--motion-duration-hover, .2s) var(--motion-easing-hover, ease-in-out);

          &:hover {
              background-color: var(--bg-color-3);
          }
      }

      &__heading {
          min-width: 0;
      }
  }

  .feed-avatar-empty {
      display: block;
      width: 100%;
      height: 100%;
      background-color: var(--primary-color);
  }
</style>
