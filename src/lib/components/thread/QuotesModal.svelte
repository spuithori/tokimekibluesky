<script>
    import {_} from "svelte-i18n";
    import { agent } from "$lib/stores";
    import Modal from "$lib/components/ui/Modal.svelte";
    import TimelineItem from "../../../routes/(app)/TimelineItem.svelte";
    import {AppBskyEmbedRecord} from "@atproto/api";
    import Infinite from "$lib/components/utils/Infinite.svelte";

    let { uri, _agent = $agent, onclose } = $props();
    let quotes = $state([]);
    let cursor;

    async function handleLoadMore(loaded, complete) {
        try {
            const res = await _agent.agent.api.app.bsky.feed.getQuotes({uri: uri, cursor: cursor});
            cursor = res.data.cursor;
            const wrapRes = res.data.posts.map(post => {
                return {
                    post: post,
                }
            });
            quotes = [...quotes, ...wrapRes];

            if (cursor) {
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            console.error(e);
            complete();
        }
    }
</script>

<Modal title={$_('quote')} size="small" {onclose}>
  <div class="quotes">
    {#each quotes as quote}
      {#if !(AppBskyEmbedRecord.isViewDetached(quote?.post?.embed?.record) || AppBskyEmbedRecord.isViewDetached(quote?.post?.embed?.record?.record))}
        <TimelineItem data={quote}></TimelineItem>
      {/if}
    {/each}
  </div>

  <Infinite oninfinite={handleLoadMore}></Infinite>
</Modal>
