<script lang="ts">
  import UserItem from '../../../routes/(app)/profile/[handle]/UserItem.svelte';
  import { slide } from 'svelte/transition';
  import { _ } from 'svelte-i18n';
  import FeedSubscribeButton from "$lib/components/feeds/FeedSubscribeButton.svelte";
  import { createEventDispatcher } from 'svelte';
  import {agent} from "$lib/stores";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import { toast } from "svelte-sonner";
  import Menu from "$lib/components/ui/Menu.svelte";
  import {goto} from "$app/navigation";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {getPostState} from "$lib/classes/postState.svelte";
  const dispatch = createEventDispatcher();
  const columnState = getColumnState();
  const postState = getPostState();

  interface Props {
    _agent?: any;
    feed: any;
    subscribed?: boolean;
    layout?: string;
  }

  let {
    _agent = $agent,
    feed,
    subscribed = false,
    layout = 'default'
  }: Props = $props();
  let isCreatorOpen = $state(false);
  let isColumnAdded = $state(false);
  let isMenuOpen = $state(false);

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
          data: {
              feed: [],
              cursor: '',
          }
      }

      try {
          columnState.add(_column);

          dispatch('add');
          toast.success($_('column_added'));
          isColumnAdded = true;
      } catch (e) {
          console.error(e);
          toast.error('Error: ' + e);
      }
  }

  function handleEmbedClick() {
      postState.posts[postState.index].quotePost = feed;
      postState.pulse = true;
      goto('/');
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
        {#if (layout !== 'embed' && layout !== 'publish')}
          <FeedSubscribeButton feed={feed} subscribed={subscribed} {_agent}></FeedSubscribeButton>
        {/if}

        {#if (layout === 'default' || layout === 'embed')}
          <button class="button button--ss" onclick={addColumn} disabled={isColumnAdded}>{$_('feed_quick_add')}</button>

          <a href="/profile/{feed.creator.did}/feed/{feed.uri.split('/').slice(-1)[0]}" onclick={setCurrentFeed} class="button button--border button--ss">{$_('feed_show_button')}</a>
        {/if}
      </div>
    </div>
  </div>

  {#if (layout !== 'publish')}
    <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="timeline-menu-toggle timeline-menu-toggle--feed">
        {#snippet content()}
            <ul class="timeline-menu-list" >
              <li class="timeline-menu-list__item">
                  <a class="timeline-menu-list__button" href="https://bsky.app/profile/{feed.creator.did}/feed/{feed.uri.split('/').slice(-1)[0]}" target="_blank">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                      <span>{$_('open_social_app')}</span>
                  </a>
              </li>

              <li class="timeline-menu-list__item">
                <button class="timeline-menu-list__button" onclick={handleEmbedClick}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-quote"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
                  <span>{$_('embed_feed_button')}</span>
                </button>
              </li>
          </ul>
          {/snippet}
    </Menu>
  {/if}

  {#if (layout !== 'embed' && layout !== 'publish')}
    <button class="feed-creator-toggle" onclick={() => {isCreatorOpen = !isCreatorOpen}}><svg xmlns="http://www.w3.org/2000/svg" width="11.599" height="7.421" viewBox="0 0 11.599 7.421">
      <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l4.389,5.01,4.388-5.01" transform="translate(-4391.997 -793.447)" fill="none" stroke="var(--text-color-3)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
    </svg>{$_('feeds_toggle_creator')}</button>

    {#if isCreatorOpen}
      <div class="feed-creator" transition:slide={{ duration: 200 }}>
        <UserItem user={feed.creator} layout={'noborder'} {_agent}></UserItem>
      </div>
    {/if}
  {/if}
</section>

<style lang="postcss">
  .feed {
      margin-bottom: 15px;
      border-radius: 10px;
      box-shadow: 0 0 10px var(--box-shadow-color-1);
      background-color: var(--bg-color-1);
      position: relative;

      &__column {
          display: grid;
          grid-template-columns: 46px 1fr;
          gap: 8px;
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

      &--embed {
          margin-top: 8px;

          .feed__column {
              grid-template-columns: 40px 1fr;
          }

          @container timeline-item (max-width: 345px) {
              margin-left: calc((var(--avatar-size) + var(--avatar-gap)) * -1);
          }
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