<script lang="ts">
    import { agent } from '$lib/stores';
    import {onMount} from "svelte";
    import type { PageData } from './$types';
    import TimelineItem from "../../TimelineItem.svelte";
    import Thread from "./Thread.svelte";

    export let data: PageData;
    let posts = [];
    let thread = Promise;
    let feeds = [];

    async function getParent(parent) {
        //feeds.unshift({feeds: parent})
    }

    async function getChild(replies) {
        for (const reply of replies) {
            //feeds.push({feeds: reply});
        }
    }

    onMount(async() => {
        const decodeUri = decodeURIComponent(data.params.uri)
        const raw = await $agent.agent.api.app.bsky.feed.getPostThread({uri: decodeUri})
        feeds = [ raw.data.thread ];

        if (raw.data.thread.parent) {
            getParent(raw.data.thread.parent);
        }

        if (raw.data.thread.replies) {
            getChild(raw.data.thread.replies);
        }
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