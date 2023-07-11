<script lang="ts">
    import { agent, columns } from '$lib/stores';
    import spinner from '$lib/images/loading.svg';
    import Thread from './profile/[handle]/post/[id]/Thread.svelte';
    import {onMount} from "svelte";

    export let column;
    export let index;
    let feeds;

    async function getPostThread() {
        const uri = column.algorithm.algorithm;
        const raw = await $agent.agent.api.app.bsky.feed.getPostThread({uri: uri});
        feeds = [ raw.data.thread ];
    }

    function close() {
        const _columns = $columns.filter(_column => _column.id !== column.id);
        columns.set(_columns);
    }

    onMount(async () => {
        await getPostThread();
        console.log(feeds);
    })
</script>

<button aria-label="close this column" class="close-button" on:click={close}>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
</button>

<div class="timeline thread-wrap">
  {#if !feeds}
    <div class="thread-loading">
      <img src={spinner} alt="">
    </div>
  {:else}
    <Thread feeds={feeds} depth={0}></Thread>
  {/if}
</div>

<style lang="postcss">
    .thread-wrap {
        position: relative;
    }

    .thread-loading {
        text-align: center;

        img {
            width: 50px;
            height: 50px;
        }
    }
</style>