<script lang="ts">
    import { agent } from '$lib/stores';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import Thread from "./Thread.svelte";
    import {afterNavigate} from "$app/navigation";

    let thread = Promise;
    let feeds = [];
    $: decodeUri = decodeURIComponent($page.params.uri);

    onMount(async() => {
        const raw = await $agent.agent.api.app.bsky.feed.getPostThread({uri: decodeUri});
        feeds = [ raw.data.thread ];
    })

    afterNavigate(async () => {
        console.log(decodeUri)
        const raw = await $agent.agent.api.app.bsky.feed.getPostThread({uri: decodeUri});
        feeds = [ raw.data.thread ];
    })
</script>

<div class="timeline">
  <h1 class="thread-title">スレッド</h1>

  <Thread feeds={feeds}></Thread>
</div>

<style>
    .thread-title {
        text-align: center;
        margin-bottom: 20px;
    }
</style>