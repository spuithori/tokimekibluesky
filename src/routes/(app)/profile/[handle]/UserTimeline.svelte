<script>
    import { agent } from '$lib/stores';
    import {onMount} from "svelte";
    import TimelineItem from "../../TimelineItem.svelte";

    export let author = '';
    let feeds = [];

    console.log(author)

    onMount(async () => {
        feeds = await $agent.agent.api.app.bsky.feed.getAuthorFeed({author: author})
        feeds = feeds.data.feed
        console.log(feeds)
    });
</script>

<div class="timeline">
  {#each feeds as data}
    <TimelineItem data={ data }></TimelineItem>
  {/each}
</div>