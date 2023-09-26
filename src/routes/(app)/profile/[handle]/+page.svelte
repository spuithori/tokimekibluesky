<script lang="ts">
import type { LayoutData } from './$types';
import {agent, isAfterReload, settings} from '$lib/stores';
import TimelineItem from "../../TimelineItem.svelte";
import {_} from 'svelte-i18n';
import type { Snapshot } from './$types';
import toast from "svelte-french-toast";
import InfiniteLoading from "svelte-infinite-loading";

export let data: LayoutData;

let feeds = [];
let cursor = '';
let scrollY = 0;
let isFiltered = false;

export const snapshot: Snapshot = {
    capture: () => [feeds, cursor, $settings.design.layout === 'decks' ? document.querySelector('.modal-page-content').scrollTop : document.querySelector(':root').scrollTop],
    restore: (value) => {
      if(!$isAfterReload) {
        [feeds, cursor, scrollY] = value;

        setTimeout(() => {
            if ($settings.design.layout === 'decks') {
                document.querySelector('.modal-page-content').scroll(0, scrollY);
            } else {
                document.querySelector(':root').scroll(0, scrollY);
            }
        }, 0)
      }

      isAfterReload.set(false);
    }
};

const handleLoadMore = async ({ detail: { loaded, complete } }) => {
    try {
        const raw = await $agent.agent.api.app.bsky.feed.getAuthorFeed({actor: data.params.handle, limit: 30, cursor: cursor});
        cursor = raw.data.cursor;

        if (cursor) {
            feeds = [...feeds, ...raw.data.feed];

            loaded();
        } else {
            complete();
        }
    } catch(e) {
        if (e.error === 'BlockedActor') {
            toast.error($_('error_get_posts_because_blocking'));
            complete();
        }

        if (e.error === 'BlockedByActor') {
            toast.error($_('error_get_posts_because_blocked'));
            complete();
        }
    }
}
</script>

<svelte:head>
  <title>{data.params.handle} - TOKIMEKI</title>
</svelte:head>

<div class="timeline">
  <dl class="profile-posts-nav">
    <dt class="profile-posts-nav__name">{$_('profile_posts_nav')}: </dt>
    <dd class="profile-posts-nav__content">
      <button class="profile-posts-nav__button" on:click={() => {isFiltered = false}} class:profile-posts-nav__button--active={!isFiltered}>{$_('profile_posts_nav_all')}</button>
      <button class="profile-posts-nav__button" on:click={() => {isFiltered = true}} class:profile-posts-nav__button--active={isFiltered}>{$_('profile_posts_nav_filtered')}</button>
    </dd>
  </dl>

  {#key isFiltered}
    {#each feeds as data, index}
      <TimelineItem
          data={data}
          isPrivate={true}
          isProfile={true}
          index={index}
          hideReply={isFiltered ? 'me' : 'all'}
          hideRepost={isFiltered ? 'none' : 'all'}
      ></TimelineItem>
    {/each}
  {/key}

  <InfiniteLoading on:infinite={handleLoadMore}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style lang="postcss">
  .profile-posts-nav {
      display: flex;
      align-items: center;
      color: var(--text-color-3);
      font-size: 14px;
      gap: 8px;
      margin-bottom: 16px;

      &__content {
          display: flex;
          gap: 4px;
      }

      &__button {
          display: flex;
          align-items: center;
          padding: 0 8px;
          border: 1px solid var(--primary-color);
          height: 28px;
          border-radius: 14px;
          font-size: 12px;
          color: var(--primary-color);

          &--active {
              background-color: var(--primary-color);
              color: var(--bg-color-1);
          }
      }
  }
</style>
