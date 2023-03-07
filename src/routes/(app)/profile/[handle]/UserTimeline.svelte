<script>
    import { agent } from '$lib/stores';
    import {onMount} from "svelte";
    import TimelineItem from "../../TimelineItem.svelte";

    export let author = '';
    let feeds = [];

    onMount(async () => {
        feeds = await $agent.agent.api.app.bsky.feed.getAuthorFeed({author: author});
        feeds = feeds.data.feed;
    });
</script>

<div class="timeline">
  {#each feeds as data}
    <TimelineItem data={ data } isPrivate={ true }></TimelineItem>
  {/each}
</div>