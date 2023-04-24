<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import { agent } from '$lib/stores';
    import InfiniteLoading from 'svelte-infinite-loading';
    import {AppBskyEmbedImages, AppBskyFeedDefs} from '@atproto/api';
    import MediaTimelineItem from '../../../MediaTimelineItem.svelte';

    let feeds = [];
    let media = [];
    let cursor = '';

    const isReasonRepost = (reason: any): reason is AppBskyFeedDefs.ReasonRepost => {
        return !!(reason as AppBskyFeedDefs.ReasonRepost)?.by;
    }

    export let data: LayoutData;

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        const res = await $agent.agent.api.app.bsky.feed.getAuthorFeed({actor: data.params.handle, limit: 30, cursor: cursor});
        cursor = res.data.cursor;

        if (cursor) {
            for (const item of res.data.feed) {
                feeds.push(item);
            }
            feeds = feeds;

            for (const feed of feeds) {
                if (feed.post.embed && AppBskyEmbedImages.isView(feed.post.embed)) {
                    feed.post.embed.images.forEach(image => {
                        image.pageUrl = '/profile/' + feed.post.author.handle + '/post/' + feed.post.uri.split('/').slice(-1)[0];

                        image.feed = feed;

                        if (isReasonRepost(feed.reason)) {
                            image.isRepost = true;
                        }
                    })

                    if ((!isReasonRepost(feed.reason) && data.params.handle !== $agent.agent.session.handle) || (data.params.handle === $agent.agent.session.handle)) {
                        media = [...media, ...feed.post.embed.images];
                    }
                }
            }

            console.log(media)
            feeds = [];
            loaded();
        } else {
            complete();
        }
    }
</script>

<div class="timeline">
  <div class="media-list">
    {#each media as item}
      <MediaTimelineItem item={item}></MediaTimelineItem>
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