<script lang="ts">
  import { _ } from 'svelte-i18n';
  import FeedSubscribeButton from "$lib/components/feeds/FeedSubscribeButton.svelte";
  import Menu from "$lib/components/ui/Menu.svelte";
  import {EllipsisVertical, ExternalLink, Quote} from "lucide-svelte";
  import {postState} from "$lib/classes/postState.svelte";
  import {goto} from "$app/navigation";
  import {onMount} from "svelte";

  let { _agent, feed } = $props();
  let isMenuOpen = $state(false);
  let savedFeeds = $state();

  async function getSavedFeeds () {
    const preferenceRes = await _agent.agent.api.app.bsky.actor.getPreferences()
    const preference = preferenceRes.data.preferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')
    savedFeeds = preference[0]?.saved || [];
  }

  function isSaved(feed) {
    const uri = feed.uri;
    return savedFeeds.includes(uri);
  }

  function handleEmbedClick() {
    postState.quote = feed;
    postState.quotePulse = Symbol();
    goto('/');
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
      <FeedSubscribeButton {feed} {_agent} subscribed={isSaved(feed)}></FeedSubscribeButton>
    {/if}
  </div>

  <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="profile-menu-toggle">
    {#snippet ref()}
      <EllipsisVertical color="var(--text-color-3)" size="20"></EllipsisVertical>
    {/snippet}

    {#snippet content()}
      <ul class="timeline-menu-list" >
        <li class="timeline-menu-list__item">
          <a class="timeline-menu-list__button" href="https://bsky.app/profile/{feed.creator.did}/feed/{feed.uri.split('/').slice(-1)[0]}" target="_blank">
            <ExternalLink color="var(--text-color-1)" size="20"></ExternalLink>
            <span>{$_('open_social_app')}</span>
          </a>
        </li>

        <li class="timeline-menu-list__item">
          <button class="timeline-menu-list__button" onclick={handleEmbedClick}>
            <Quote color="var(--text-color-1)" size="20"></Quote>
            <span>{$_('embed_feed_button')}</span>
          </button>
        </li>
      </ul>
    {/snippet}
  </Menu>
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
          border-radius: var(--border-radius-2);
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
          margin-left: auto;
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