<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import { agent } from '$lib/stores';
    import InfiniteLoading from 'svelte-infinite-loading';
    import {AppBskyEmbedImages, AppBskyFeedDefs} from '@atproto/api';
    import MediaTimelineItem from '../../../MediaTimelineItem.svelte';
    import { toast } from "svelte-sonner";

    let feeds = [];
    let media = [];
    let cursor = '';

    const isReasonRepost = (reason: any): reason is AppBskyFeedDefs.ReasonRepost => {
        return !!(reason as AppBskyFeedDefs.ReasonRepost)?.by;
    }

    export let data: LayoutData;

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        try {
            const res = await $agent.agent.api.app.bsky.feed.getAuthorFeed({actor: data.params.handle, limit: 30, cursor: cursor, filter: 'posts_with_media'});
            cursor = res.data.cursor;
            for (const item of res.data.feed) {
                if (AppBskyEmbedImages.isView(item.post?.embed) || AppBskyEmbedImages.isView(item.post?.embed?.media)) {
                    feeds.push(item);
                }
            }
            feeds = feeds;

            if (cursor) {
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
  <title>{data.params.handle} {$_('page_title_media')} - TOKIMEKI</title>
</svelte:head>

<div class="hide-repost">
  <div class="media-list">
    {#each feeds as data}
      <MediaTimelineItem data={data} isProfile={true}></MediaTimelineItem>
    {/each}
  </div>

  <InfiniteLoading on:infinite={handleLoadMore}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style lang="postcss">
    .media-list {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2px;

        @media (max-width: 767px) {
            grid-template-columns: repeat(2, 1fr);
        }
    }
</style>