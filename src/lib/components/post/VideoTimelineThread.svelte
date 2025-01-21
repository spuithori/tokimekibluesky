<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {MessageSquareText, X} from "lucide-svelte";
  import { fly } from 'svelte/transition';
  import ThreadView from "../../../routes/(app)/profile/[handle]/post/[id]/ThreadView.svelte";

  let { children, post, _agent } = $props();
  let isOpen = $state(false);
  let el = $state();

  const rkey = $derived(post.uri.split('/').slice(-1)[0]);
  const did = $derived(post.uri.split('/')[2]);

  function handleToggle() {
    isOpen = !isOpen;

    if (isOpen) {
      el.showPopover();
    } else {
      el.hidePopover();
    }
  }
</script>

<button class="video-thread-toggle" onclick={handleToggle}>
  <MessageSquareText color="#fff" size="20"></MessageSquareText>
</button>

<div class="video-thread" popover="manual" bind:this={el}>
  {#if isOpen}
    <div class="video-thread__content" transition:fly="{{ y: 0, duration: 250 }}">
      <div class="video-thread__heading">
        <p class="video-thread__title">{$_('title_thread')}</p>
        <button class="video-thread__close" onclick={handleToggle}>
          <X color="var(--text-color-1)"></X>
        </button>
      </div>

      <ThreadView id={rkey} handle={did} {_agent}></ThreadView>
    </div>
  {/if}
</div>

<style lang="postcss">
  .video-thread-toggle {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      background-color: rgba(255, 255, 255, .1);
      border-radius: 50%;

      @media (max-width: 767px) {
          background-color: rgba(0, 0, 0, .5);
      }
  }

  .video-thread {
      height: 100%;
      width: 350px;
      border: none;
      background-color: transparent;
      overflow: hidden;
      margin-left: auto;
      color: var(--text-color-1);

      &__content {
          background-color: var(--bg-color-1);
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
      }

      &__heading {
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px 0 16px;
          flex-shrink: 0;
      }

      &__title {
          font-weight: bold;
      }

      &__close {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
      }
  }
</style>