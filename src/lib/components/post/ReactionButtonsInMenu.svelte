<script lang="ts">
    import Share2 from '@lucide/svelte/icons/share-2';
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

    let { post, _agent } = $props();

    function share() {
        const url = 'https://bsky.app/profile/' + post.author.handle + '/post/' + post.uri.split('/').slice(-1)[0];

        navigator.share({
            url: url,
            text: post.record.text,
            title: '',
        })
    }
</script>

<div class="timeline-reaction-in-menu timeline-reaction-in-menu--{$settings ? $settings.design.reactionButtons.shown.length : '5'}">
  {#if !$settings.design.reactionButtons.shown.includes('reply')}
    <Reply
        {post}
        reply={post.record.reply}
        count={post.replyCount || 0}
        showCounts={false}
        {_agent}
    ></Reply>
  {/if}

  {#if !$settings.design.reactionButtons.shown.includes('repost')}
    <Repost
        {post}
        {_agent}
        showCounts={false}
    ></Repost>
  {/if}

  {#if !$settings.design.reactionButtons.shown.includes('like')}
    <Like
        {post}
        {_agent}
        showCounts={false}
    ></Like>
  {/if}

  {#if !$settings.design.reactionButtons.shown.includes('quote')}
    <Quote {post}></Quote>
  {/if}

  {#if !$settings.design.reactionButtons.shown.includes('bookmark')}
    <Bookmark {post} {_agent}></Bookmark>
  {/if}

  <button class="timeline-share-button" onclick={share}>
    <Share2 size={18} color="var(--text-color-3)" />
  </button>
</div>

<style lang="postcss">
  .timeline-reaction-in-menu {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 0 12px 12px;
      border-bottom: 1px solid var(--border-color-2);
      margin-bottom: 4px;
  }

  .timeline-share-button {
      margin-left: auto;
      position: relative;
      z-index: 1;

      &::before {
          content: '';
          position: absolute;
          width: 30px;
          height: 30px;
          left: 50%;
          top: 50%;
          transform: translateY(-50%) translateX(-50%);
          background-color: transparent;
          transition: background-color .2s ease-in-out;
          border-radius: 50%;
          z-index: -1;
      }

      &:hover {
          &::before {
              background-color: var(--timeline-reaction-hover-bg-color);
          }
      }
  }
</style>