<script lang="ts">
  import UserItem from '../../../routes/(app)/profile/[handle]/UserItem.svelte';
  import { slide } from 'svelte/transition';
  import { _ } from 'svelte-i18n';
  import FeedSubscribeButton from "$lib/components/feeds/FeedSubscribeButton.svelte";
  import { createEventDispatcher } from 'svelte';
  import {agent, columns} from "$lib/stores";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import toast from "svelte-french-toast";
  const dispatch = createEventDispatcher();

  export let _agent = $agent;
  export let feed;
  export let subscribed = false;
  export let layout = 'default';
  let isCreatorOpen = false;
  let isColumnAdded = false;

  async function setCurrentFeed () {
      dispatch('close', {
          clear: false,
          allClose: true,
      });
  }

  async function addColumn() {
      const _column = {
          id: self.crypto.randomUUID(),
          algorithm: {
              type: 'custom',
              algorithm: feed.uri,
              name: feed.displayName,
          },
          style: 'default',
          settings: defaultDeckSettings,
          did: _agent.did(),
          handle: _agent.handle(),
      }

      try {
          $columns = [...$columns, _column];

          dispatch('add');
          toast.success($_('column_added'));
          isColumnAdded = true;
      } catch (e) {
          console.error(e);
          toast.error('Error: ' + e);
      }
  }
</script>

<section class="feed feed--{layout}">
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
        <FeedSubscribeButton feed={feed} subscribed={subscribed} {_agent}></FeedSubscribeButton>

        <button class="button button--ss" on:click={addColumn} disabled={isColumnAdded}>{$_('feed_quick_add')}</button>

        {#if (layout === 'default')}
         <a href="/profile/{feed.creator.did}/feed/{feed.uri.split('/').slice(-1)[0]}" on:click={setCurrentFeed} class="button button--border button--ss">{$_('feed_show_button')}</a>
        {/if}
      </div>
    </div>
  </div>

  <button class="feed-creator-toggle" on:click={() => {isCreatorOpen = !isCreatorOpen}}><svg xmlns="http://www.w3.org/2000/svg" width="11.599" height="7.421" viewBox="0 0 11.599 7.421">
    <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l4.389,5.01,4.388-5.01" transform="translate(-4391.997 -793.447)" fill="none" stroke="var(--text-color-3)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
  </svg>{$_('feeds_toggle_creator')}</button>

  {#if isCreatorOpen}
    <div class="feed-creator" transition:slide={{ duration: 200 }}>
      <UserItem user={feed.creator} layout={'noborder'} {_agent}></UserItem>
    </div>
  {/if}
</section>

<style lang="postcss">
  .feed {
      margin-bottom: 15px;
      border-radius: 10px;
      box-shadow: 0 0 10px var(--box-shadow-color-1);
      background-color: var(--bg-color-1);

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
      border-radius: 0 0 10px 10px;

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