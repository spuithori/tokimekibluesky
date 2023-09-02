<script lang="ts">
import type { LayoutData } from './$types';
import {onMount} from 'svelte';
import {agent, columns, isAfterReload, settings} from '$lib/stores';
import TimelineItem from "../../TimelineItem.svelte";
import {_} from 'svelte-i18n';
import type { Snapshot } from './$types';
import toast from "svelte-french-toast";
import InfiniteLoading from "svelte-infinite-loading";

export let data: LayoutData;

let stickyPost;
let feeds = [];
let cursor = '';
let scrollY = 0;

export const snapshot: Snapshot = {
    capture: () => [feeds, cursor, $settings.design.layout === 'decks' ? document.querySelector('.modal-page-content').scrollTop : document.querySelector('.app').scrollTop],
    restore: (value) => {
      if(!$isAfterReload) {
        [feeds, cursor, scrollY] = value;

        setTimeout(() => {
            if ($settings.design.layout === 'decks') {
                document.querySelector('.modal-page-content').scroll(0, scrollY);
            } else {
                document.querySelector('.app').scroll(0, scrollY);
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

onMount(async () => {
    /* const res = await $agent.agent.api.com.atproto.repo.getRecord({repo: data.params.handle, collection: 'app.bsky.actor.profile', rkey: 'self'});
    if (res.data.value?.stickyPost) {
        const record = await $agent.getFeed(res.data.value.stickyPost);
        stickyPost = record;
    } */
})
</script>

<svelte:head>
  <title>{data.params.handle} - TOKIMEKI</title>
</svelte:head>

<div>
  {#if stickyPost}
    <!-- <div class="sticky">
      <p class="sticky-text">{$_('sticky_post')}</p>
      <TimelineItem data={ stickyPost } isPrivate={ true }></TimelineItem>
    </div> -->
  {/if}

  <div class="timeline">
    {#each feeds as data, index}
      <TimelineItem data={ data } isPrivate={ true } index={index}></TimelineItem>
    {/each}

    <InfiniteLoading on:infinite={handleLoadMore}>
      <p slot="noMore" class="infinite-nomore">もうないよ</p>
    </InfiniteLoading>
  </div>
</div>

<style lang="postcss">
  .sticky {
      background-color: var(--bg-color-1);
      box-shadow: 0 3px 6px rgba(0, 0, 0, .16);
      border: 2px solid var(--primary-color);
      padding: 20px 20px 10px;
      border-radius: 10px;
      margin-bottom: 20px;
      position: relative;

      @media (max-width: 767px) {
          margin: 0 -15px 20px;
      }
  }

  .sticky-text {
      color: var(--text-color-3);
  }
</style>
