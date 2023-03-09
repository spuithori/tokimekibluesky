<script lang="ts">
    import { agent } from '$lib/stores';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import Thread from "./Thread.svelte";
    import {afterNavigate} from "$app/navigation";

    let thread = Promise;
    let feeds = [];
    $: recordId = $page.params.id;
    $: handle = $page.params.handle;

    onMount(async() => {
        let profile = await $agent.agent.api.app.bsky.actor.getProfile({actor: handle});
        const uri = 'at://' + profile.data.did + '/app.bsky.feed.post/' + recordId;
        const raw = await $agent.agent.api.app.bsky.feed.getPostThread({uri: uri});
        feeds = [ raw.data.thread ];
    })

    afterNavigate(async () => {
        let profile = await $agent.agent.api.app.bsky.actor.getProfile({actor: handle});
        const uri = 'at://' + profile.data.did + '/app.bsky.feed.post/' + recordId;
        const raw = await $agent.agent.api.app.bsky.feed.getPostThread({uri: uri});
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