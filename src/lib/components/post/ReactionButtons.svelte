<script lang="ts">
  import {settings} from "$lib/stores";
  import {defaultReactionButtons} from "$lib/defaultSettings";
  import Like from "$lib/components/post/Like.svelte";
  import Repost from "$lib/components/post/Repost.svelte";
  import Reply from "$lib/components/post/Reply.svelte";
  import Bookmark from "$lib/components/post/Bookmark.svelte";
  import {createEventDispatcher} from "svelte";
  import Quote from "$lib/components/post/Quote.svelte";
  const dispatch = createEventDispatcher();

  if (!$settings.design.reactionButtons) {
      $settings.design.reactionButtons = defaultReactionButtons;
  }

  export let data;
  export let _agent;
  export let isMedia = false;

  let repostFunc;
  let likeFunc;
</script>

<div class="timeline-reaction timeline-reaction--{$settings ? $settings.design.reactionButtons.shown.length : '5'}">
  {#if $settings.design.reactionButtons.shown.includes('reply')}
    <Reply
        post={data.post}
        reply={data.post.record.reply}
        count={data.post.replyCount}
        showCounts={$settings.design?.reactionButtons.reply.showCounts}
        {_agent}
    ></Reply>
  {/if}

  {#if $settings.design.reactionButtons.shown.includes('repost')}
    <Repost
        cid={data.post.cid}
        uri={data.post.uri}
        repostViewer={data.post.viewer?.repost}
        count={data.post.repostCount}
        on:repost
        bind:repost={repostFunc}
        showCounts={$settings.design?.reactionButtons.repost.showCounts}
        {_agent}
    ></Repost>
  {/if}

  {#if $settings.design.reactionButtons.shown.includes('like')}
    <Like
        cid={data.post.cid}
        uri={data.post.uri}
        likeViewer={data.post.viewer?.like}
        count={data.post.likeCount}
        on:like
        bind:vote={likeFunc}
        showCounts={$settings.design?.reactionButtons.like.showCounts}
        {_agent}
    ></Like>
  {/if}

  {#if $settings.design.reactionButtons.shown.includes('quote')}
    <Quote {data} embeddingDisabled={data.post.viewer?.embeddingDisabled}></Quote>
  {/if}

  {#if $settings.design.reactionButtons.shown.includes('bookmark')}
    <Bookmark post={data.post} bookmarkId={data?.bookmarkId} {_agent}></Bookmark>
  {/if}
</div>
