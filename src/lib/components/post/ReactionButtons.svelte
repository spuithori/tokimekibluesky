<script lang="ts">
  import {settings} from "$lib/stores";
  import {defaultReactionButtons} from "$lib/defaultSettings";
  import Like from "$lib/components/post/Like.svelte";
  import Repost from "$lib/components/post/Repost.svelte";
  import Reply from "$lib/components/post/Reply.svelte";
  import Bookmark from "$lib/components/post/Bookmark.svelte";
  import Quote from "$lib/components/post/Quote.svelte";

  if (!$settings.design.reactionButtons) {
      $settings.design.reactionButtons = defaultReactionButtons;
  }

  interface Props {
    post: any;
    _agent: any;
    isMedia?: boolean;
  }

  let { post, _agent }: Props = $props();
</script>

<div class="timeline-reaction timeline-reaction--{$settings ? $settings.design.reactionButtons.shown.length : '5'}">
  {#if $settings.design.reactionButtons.shown.includes('reply')}
    <Reply
        {post}
        reply={post.record.reply}
        count={post.replyCount}
        showCounts={$settings.design?.reactionButtons.reply.showCounts}
        {_agent}
    ></Reply>
  {/if}

  {#if $settings.design.reactionButtons.shown.includes('repost')}
    <Repost
        cid={post.cid}
        uri={post.uri}
        bind:repostViewer={post.viewer.repost}
        bind:count={post.repostCount}
        showCounts={$settings.design?.reactionButtons.repost.showCounts}
        {_agent}
    ></Repost>
  {/if}

  {#if $settings.design.reactionButtons.shown.includes('like')}
    <Like
        cid={post.cid}
        uri={post.uri}
        bind:likeViewer={post.viewer.like}
        bind:count={post.likeCount}
        showCounts={$settings.design?.reactionButtons.like.showCounts}
        {_agent}
    ></Like>
  {/if}

  {#if $settings.design.reactionButtons.shown.includes('quote')}
    <Quote {post} embeddingDisabled={post.viewer?.embeddingDisabled}></Quote>
  {/if}

  {#if $settings.design.reactionButtons.shown.includes('bookmark')}
    <Bookmark {post} {_agent}></Bookmark>
  {/if}
</div>
