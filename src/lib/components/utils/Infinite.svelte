<script lang="ts">
  import { useIntersectionObserver } from "runed";
  import {_} from "svelte-i18n";
  import {Annoyed} from "lucide-svelte";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";

  let { oninfinite, children } = $props();
  let el = $state<HTMLElement | undefined>();
  let isIntersecting = $state(false);
  let retryCount = $state(0);
  let intervalId: ReturnType<typeof setTimeout>;
  let isComplete = $state(false);
  let isLoading = $state(false);
  let isRetryLimit = $derived(retryCount >= 5);

  useIntersectionObserver(
    () => el,
    (entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      isIntersecting = entry.isIntersecting;

      if (!isIntersecting) {
        retryCount = 0;
        isLoading = false;
        clearTimeout(intervalId);
      } else {
        if (!isComplete) {
          handleIntersect();
        }
      }
    },
    {
      root: () => {getScrollElement(el)},
      threshold: 0.25,
    }
  );

  async function handleIntersect() {
    isLoading = true;
    await oninfinite(loaded, complete);

    if (isRetryLimit) {
      clearTimeout(intervalId);
      isLoading = false;
      return false;
    }

    if (isComplete) {
      return false;
    }

    if (!isIntersecting) {
      return false;
    }

    clearTimeout(intervalId);

    intervalId = setTimeout(() => {
      handleIntersect();
    }, 500);
  }

  function loaded() {
    retryCount = retryCount + 1;
  }

  function complete() {
    clearTimeout(intervalId);
    isComplete = true;
    isLoading = false;
  }

  function getScrollElement(element) {
    if (!element) {
      return null;
    }

    if (element === document.body || element === document.documentElement) {
      return window;
    }

    const style = window.getComputedStyle(element);
    const overflow = style.getPropertyValue('overflow');
    const overflowY = style.getPropertyValue('overflow-y');

    const hasScroll = overflowY === 'auto' || overflowY === 'scroll' || overflow === 'auto' || overflow === 'scroll';

    if (hasScroll && element.scrollHeight > element.clientHeight) {
      return element;
    }

    return getScrollElement(element.parentElement);
  }

  function handleResetLimit() {
    isRetryLimit = false;
    retryCount = 0;
    handleIntersect();
  }

  $effect(() => {
    return () => {
      clearTimeout(intervalId);
    }
  })
</script>

<div class="infinite-loading" bind:this={el}>
  {#if isLoading}
    <LoadingSpinner padding={0}></LoadingSpinner>
  {/if}

  {#if isComplete}
    {#if children}
      {@render children?.()}
    {:else}
      <p class="infinite-nomore"><span>{$_('no_more')}</span></p>
    {/if}
  {/if}

  {#if isRetryLimit}
    <button onclick={handleResetLimit}>
      <Annoyed color="var(--danger-color)"></Annoyed>
    </button>
  {/if}
</div>

<style lang="postcss">
    .infinite-loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 56px;
    }
</style>