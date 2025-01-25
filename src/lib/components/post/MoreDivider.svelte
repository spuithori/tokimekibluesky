<script lang="ts">
  import {ArrowUpFromDot, MoreHorizontal} from "lucide-svelte";
  import {untrack, tick} from "svelte";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";

  let { onDividerClick, onDividerUp, column } = $props();
  let el = $state();
  let isLoading = $state(false);

  function handleClick() {
      const posFromBottom = window.innerHeight - el.getBoundingClientRect().bottom;
      onDividerClick(posFromBottom);
  }

  function handleUp() {
      isLoading = true;
      onDividerUp();
  }

  $effect(() => {
    if (el) {
      untrack(() => {
        tick().then(() => {
          const posFromTop = el.offsetTop;

          if (posFromTop) {
            column.scrollElement.scrollTo(0, posFromTop);
          }
        })
      })
    }
  })
</script>

<div class="more-divider-wrap" bind:this={el}>
  {#if (!isLoading)}
    <button class="more-divider-up" onclick={handleUp}>
      <ArrowUpFromDot color="var(--text-color-3)" size="20"></ArrowUpFromDot>
    </button>

    <button class="more-divider" onclick={handleClick} aria-label="Road More...">
      <MoreHorizontal color="var(--text-color-3)"></MoreHorizontal>
    </button>
  {:else}
    <div class="more-loading">
      <LoadingSpinner padding="0"></LoadingSpinner>
    </div>
  {/if}
</div>

<style lang="postcss">
    .more-divider-wrap {
        position: relative;
    }

    .more-divider {
        width: 100%;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-bottom: var(--timeline-border-width) solid var(--timeline-border-color);
    }

    .more-divider-up {
        position: absolute;
        left: 8px;
        top: 0;
        bottom: 0;
        margin: auto;
        width: 36px;
        height: 36px;
        display: grid;
        place-content: center;
        border-radius: 50%;
        background-color: var(--bg-color-2);
    }

    .more-loading {
        display: grid;
        place-content: center;
        height: 48px;
    }
</style>