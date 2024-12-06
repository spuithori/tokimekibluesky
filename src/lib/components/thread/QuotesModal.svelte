<script>
    import {_} from "svelte-i18n";
    import { agent } from "$lib/stores";
    import InfiniteLoading from 'svelte-infinite-loading';
    import Modal from "$lib/components/ui/Modal.svelte";
    import TimelineItem from "../../../routes/(app)/TimelineItem.svelte";
    import {AppBskyEmbedRecord} from "@atproto/api";

    let { uri, _agent = $agent } = $props();
    let quotes = $state([]);
    let cursor;

    async function handleLoadMore({ detail: { loaded, complete } }) {
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

<Modal title="{$_('quote')}" on:close>
  <div class="quotes">
    {#each quotes as quote}
      {#if !(AppBskyEmbedRecord.isViewDetached(quote?.post?.embed?.record) || AppBskyEmbedRecord.isViewDetached(quote?.post?.embed?.record?.record))}
        <TimelineItem data={quote}></TimelineItem>
      {/if}
    {/each}
  </div>

  <InfiniteLoading on:infinite={handleLoadMore}>
    {#snippet noMore()}
      <p class="infinite-nomore"><span>{$_('no_more')}</span></p>
    {/snippet}
    {#snippet noResults()}
      <p class="infinite-nomore"><span>{$_('no_more')}</span></p>
    {/snippet}
  </InfiniteLoading>
</Modal>
