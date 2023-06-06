<script lang="ts">
  import UserItem from '../../../routes/(app)/profile/[handle]/UserItem.svelte';
  import { slide } from 'svelte/transition';
  import { _ } from 'svelte-i18n';
  import FeedSubscribeButton from "$lib/components/feeds/FeedSubscribeButton.svelte";
  import {agent, currentAlgorithm, cursor, timeline} from "$lib/stores";
  import {createEventDispatcher} from 'svelte';
  const dispatch = createEventDispatcher();

  export let feed;
  export let subscribed = false;
  let isCreatorOpen = false;

  async function setCurrentFeed () {
      currentAlgorithm.set({
          type: 'custom',
          algorithm: feed.uri,
          name: feed.displayName,
      });
      localStorage.setItem('currentAlgorithm', JSON.stringify($currentAlgorithm));

      const res = await $agent.getTimeline({limit: 25, cursor: '', algorithm: $currentAlgorithm});

      timeline.set(res.data.feed);
      cursor.set(res.data.cursor);

      dispatch('close', {
          clear: false,
          allClose: true,
      });
  }
</script>

<section class="feed">
  <div class="feed__column">
    <div class="feed__avatar">
      {#if (feed.avatar)}
        <img src="{feed.avatar}" alt="">
      {/if}
    </div>

    <div class="feed__content">
      <h3 class="feed__title">{feed.displayName}</h3>
      <p class="feed__text">{feed.description}</p>

      <div class="feed__buttons">
        <FeedSubscribeButton feed={feed} subscribed={subscribed}></FeedSubscribeButton>

        <button class="button button--border button--ss" on:click={setCurrentFeed}>{$_('feed_show_button')}</button>
      </div>
    </div>
  </div>

  <button class="feed-creator-toggle" on:click={() => {isCreatorOpen = !isCreatorOpen}}><svg xmlns="http://www.w3.org/2000/svg" width="11.599" height="7.421" viewBox="0 0 11.599 7.421">
    <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l4.389,5.01,4.388-5.01" transform="translate(-4391.997 -793.447)" fill="none" stroke="var(--text-color-3)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
  </svg>{$_('feeds_toggle_creator')}</button>

  {#if isCreatorOpen}
    <div class="feed-creator" transition:slide={{ duration: 200 }}>
      <UserItem user={feed.creator}></UserItem>
    </div>
  {/if}
</section>

<style lang="postcss">
  .feed {
      margin-bottom: 15px;
      border-radius: 6px;
      box-shadow: 0 0 10px var(--box-shadow-color-1);
      overflow: hidden;

      &__column {
          display: grid;
          grid-template-columns: 60px 1fr;
          gap: 15px;
          padding: 15px 10px;
      }

      &__avatar {
          border-radius: 10px;
          aspect-ratio: 1 / 1;
          background-color: var(--primary-color);
          overflow: hidden;

          img {
              width: 100%;
              height: 100%;
              object-fit: cover;
          }
      }

      &__title {
          font-size: 16px;
          letter-spacing: .05em;
          color: var(--text-color-1);
      }

      &__text {
          font-size: 14px;
          color: var(--text-color-2);
      }

      &__buttons {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
      }
  }

  .feed-creator-toggle {
      background-color: var(--bg-color-2);
      color: var(--text-color-3);
      width: 100%;
      height: 36px;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;

      svg {
          transition: transform .2s ease-in-out;
      }

      &:has(+ .feed-creator) {
          svg {
              transform: rotate(180deg);
          }
      }
  }

  .feed-creator {
      padding: 0 10px;
  }
</style>