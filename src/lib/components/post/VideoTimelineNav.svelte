<script lang="ts">
  import Like from "$lib/components/post/Like.svelte";
  import Avatar from "../../../routes/(app)/Avatar.svelte";
  import VideoTimelineThread from "$lib/components/post/VideoTimelineThread.svelte";

  let { _agent, post, children } = $props();
</script>

<div class="video-timeline-nav">
  <div class="video-timeline-nav__top">
    {@render children?.()}
  </div>

  <div class="video-timeline-nav__item">
    <Like post={post} {_agent} isTok={true}></Like>
  </div>

  <VideoTimelineThread {post} {_agent}></VideoTimelineThread>

  <div class="video-timeline-nav__item">
    <Avatar href="/profile/{ post.author.handle !== 'handle.invalid' ? post.author.handle : post.author.did }" avatar={post.author.avatar} profile={post.author} handle={post.author.handle} {_agent}></Avatar>
  </div>
</div>

<style lang="postcss">
  .video-timeline-nav {
      position: absolute;
      top: 0;
      bottom: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      --timeline-reaction-like-hover-bg-color: transparent;
      --timeline-reaction-like-icon-hover-color: var(--timeline-reaction-like-icon-color);

      @media (max-width: 767px) {
          top: 8px;
          bottom: 64px;
          right: 8px;
      }

      &__top {
          margin-bottom: auto;
      }

      &__item {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          background-color: rgba(255, 255, 255, .1);
          border-radius: 50%;
      }
  }
</style>