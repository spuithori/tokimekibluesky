<script lang="ts">
  import TimelineItem from "../../../../TimelineItem.svelte";
  import { afterUpdate } from "svelte";

  export let feeds = [];
  export let depth = 0;
  let item;
  let scrolled = false;

  afterUpdate(() => {
      if (item && item.dataset.depth === '0') {
          scrollTo(0, item.scrollHeight);
          scrolled = true;
      }
  });
</script>

<div class="thread">
  {#each feeds as data (data)}
    {#if (!data.notFound)}
      {#if (data.parent)}
        <div class="thread-parent">
          <svelte:self feeds={[data.parent]} depth={depth + 1}></svelte:self>
        </div>
      {/if}

      <div class="thread-item" data-depth={depth} bind:this={item}>
        <TimelineItem data={data} isSingle={true}></TimelineItem>
      </div>

      {#if (data.replies?.length)}
        <div class="thread-replies">
          <svelte:self feeds={data.replies} depth={depth + 1}></svelte:self>
        </div>
      {/if}
    {/if}
  {/each}
</div>

<style lang="postcss">
  .thread {
      position: relative;
  }

  .thread-item {
      &[data-depth='0'] {
          margin-left: -20px;
          margin-right: -20px;
          padding-left: 20px;
          padding-right: 20px;
          background-color: var(--bg-color-2);
      }
  }

  .thread-replies {
      margin-left: 20px;
  }

  .thread-parent {
      position: relative;
  }

  .thread-parent::before {
      content: '';
      position: absolute;
      width: 2px;
      top: 20px;
      bottom: -20px;
      left: 29px;
      background-color: var(--border-color-1);
  }
</style>
