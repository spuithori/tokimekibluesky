<script lang="ts">
import UserTimeline from './UserTimeline.svelte';
import type { LayoutData } from './$types';
import {onMount} from 'svelte';
import { agent } from '$lib/stores';
import TimelineItem from "../../TimelineItem.svelte";
import {_} from 'svelte-i18n';

export let data: LayoutData;

let stickyPost;

onMount(async () => {
    const res = await $agent.agent.api.com.atproto.repo.getRecord({repo: data.params.handle, collection: 'app.bsky.actor.profile', rkey: 'self'});
    if (res.data.value?.stickyPost) {
        const record = await $agent.getFeed(res.data.value.stickyPost);
        stickyPost = record;
    }
})
</script>

<svelte:head>
  <title>{data.params.handle} - TOKIMEKI Bluesky</title>
</svelte:head>

<div class="user-timeline">
  {#if stickyPost}
    <div class="sticky">
      <p class="sticky-text">{$_('sticky_post')}</p>
      <TimelineItem data={ stickyPost } isPrivate={ true }></TimelineItem>
    </div>
  {/if}

  <UserTimeline author={data.params.handle}></UserTimeline>
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
          margin: 0 -20px 20px;
      }
  }

  .sticky-text {
      color: var(--text-color-3);
  }
</style>
