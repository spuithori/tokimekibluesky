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

    let { post = $bindable(), _agent } = $props();

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
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-share-2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
  </button>
</div>

<style lang="postcss">
  .timeline-reaction-in-menu {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 0 5px 8px;
      border-bottom: 1px solid var(--border-color-2);
      margin-bottom: 4px;
      margin-right: 4px;
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