<script lang="ts">
  import TimelineItem from "../../../../TimelineItem.svelte";

  export let feeds = [];
</script>

<div class="thread">
  {#each feeds as data (data)}
    {#if (!data.notFound)}
      {#if (data.parent)}
        <div class="thread-parent">
          <svelte:self feeds={[data.parent]}></svelte:self>
        </div>
      {/if}

      <TimelineItem data={data}></TimelineItem>

      {#if (data.replies?.length)}
        <div class="thread-replies">
          <svelte:self feeds={data.replies}></svelte:self>
        </div>
      {/if}
    {/if}
  {/each}
</div>

<style>
  .thread {
      position: relative;
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
