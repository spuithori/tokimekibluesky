<script lang="ts">
    import { agent, isLogin } from '$lib/stores';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import Thread from "./Thread.svelte";
    import {afterNavigate} from "$app/navigation";

    let thread = Promise;
    let feeds = [];
    let profile = {};
    $: recordId = $page.params.id;
    $: handle = $page.params.handle;

    if ($isLogin) {
        onMount(async() => {
            profile = await $agent.agent.api.app.bsky.actor.getProfile({actor: handle});
            const uri = 'at://' + profile.data.did + '/app.bsky.feed.post/' + recordId;
            const raw = await $agent.agent.api.app.bsky.feed.getPostThread({uri: uri});
            feeds = [ raw.data.thread ];
        })

        afterNavigate(async () => {
            profile = await $agent.agent.api.app.bsky.actor.getProfile({actor: handle});
            const uri = 'at://' + profile.data.did + '/app.bsky.feed.post/' + recordId;
            const raw = await $agent.agent.api.app.bsky.feed.getPostThread({uri: uri});
            feeds = [ raw.data.thread ];
        })
    } else {
        onMount(async() => {
            const profiles = await $agent.agent.api.com.atproto.repo.listRecords({user: handle, collection: 'app.bsky.actor.profile'});
            profile = profiles.data.records[0];
            const raw = await $agent.agent.api.com.atproto.repo.getRecord({user: handle, collection: 'app.bsky.feed.post', rkey: recordId});
            feeds = [raw.data];

            console.log(profiles)
            console.log(feeds)
        })

        afterNavigate(async () => {

        })
    }
</script>

<div class="timeline">
  <h1 class="thread-title">スレッド</h1>

  <Thread feeds={feeds} profile="{profile}" handle="{handle}"></Thread>
</div>

<style>
    .thread-title {
        text-align: center;
        margin-bottom: 20px;
    }
</style>