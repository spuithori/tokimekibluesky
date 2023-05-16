<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { agent, replyRef } from '$lib/stores';
    import { fade, fly } from 'svelte/transition';
    import InfiniteLoading from 'svelte-infinite-loading';
    import TimelineItem from "../TimelineItem.svelte";

    let cursor = '';
    let reasonSubjects = [];
    let feeds = [];
    let rawFeeds = [];
    let il;

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        const res = await $agent.agent.api.app.bsky.notification.listNotifications({
            limit: 8,
            cursor: cursor,
        });
        cursor = res.data.cursor;

        if (cursor) {
            res.data.notifications.forEach((item, index) => {
                if (!item.author.viewer.muted) {
                    if (item.reason === 'reply' || item.reason === 'mention' || item.reason === 'quote') {
                        rawFeeds = [...rawFeeds, item];
                        reasonSubjects.push(item.uri);

                        if (item.record?.reply) {
                            reasonSubjects.push(item.record.reply.parent.uri);
                            reasonSubjects.push(item.record.reply.root.uri);
                        }
                    }
                }
            });

            reasonSubjects = [...new Set(reasonSubjects)];
            reasonSubjects = reasonSubjects.filter(v => v);

            if (reasonSubjects.length) {
                const postsRes = await $agent.agent.api.app.bsky.feed.getPosts({uris: reasonSubjects});
                const posts = postsRes.data.posts;

                reasonSubjects = [];

                rawFeeds.forEach(feed => {
                    let obj = {
                        post: posts.find(post => feed.uri === post.uri),
                    };

                    if (feed.record.reply) {
                        obj.reply = {
                            parent: posts.find(post => feed.record.reply.parent.uri === post.uri),
                            root: posts.find(post => feed.record.reply.root.uri === post.uri),
                        }
                    }

                    feeds.push(obj);
                });
                feeds = feeds;
            }

            rawFeeds = [];

            console.log(feeds);
            // complete();
            loaded();
        } else {
            complete();
        }
    }
</script>

<h1 class="page-nav-title" in:fly={{ x: 10, duration: 100, delay: 100 }}>{$_('mentions')}</h1>

<div class="timeline">
  {#each feeds as data, index (data)}
    <TimelineItem data={ data } index={index}></TimelineItem>
  {/each}

  <InfiniteLoading on:infinite={handleLoadMore} bind:this={il}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style lang="postcss">

</style>