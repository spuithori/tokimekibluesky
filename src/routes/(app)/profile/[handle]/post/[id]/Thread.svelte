<script lang="ts">
  import TimelineItem from '../../../../TimelineItem.svelte';
  import TimelineItemNologin from '../../../../TimelineItemNologin.svelte';
  import { isLogin } from '$lib/stores';

  export let feeds = [];
  export let profile = {};
  export let handle = '';
</script>

<div class="thread">
  {#each feeds as data}
    {#if (data.parent)}
      <div class="thread-parent">
        <svelte:self feeds={[data.parent]}></svelte:self>
      </div>
    {/if}

    {#if ($isLogin)}
      <TimelineItem data={data}></TimelineItem>
    {:else}
      <TimelineItemNologin data={data} profile={profile} handle={handle}></TimelineItemNologin>
    {/if}

    {#if (data.replies?.length)}
      <div class="thread-replies">
        <svelte:self feeds={data.replies}></svelte:self>
      </div>
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
