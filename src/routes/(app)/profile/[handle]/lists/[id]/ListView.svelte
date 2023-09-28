<script lang="ts">
  import {agent} from "$lib/stores";
  import TimelineItem from "../../../../TimelineItem.svelte";
  import InfiniteLoading from "svelte-infinite-loading";
  import OfficialListItem from "$lib/components/list/OfficialListItem.svelte";
  import {isDid} from "$lib/util";

  export let id;
  export let handle;
  export let title = '';

  let timeline = [];
  let cursor = undefined;
  let feed;
  let did = '';

  if (isDid(handle)) {
      did = handle;
  } else {
      $agent.agent.api.com.atproto.identity.resolveHandle({handle: handle})
          .then(value => {
              did = value.data.did;
          })
          .catch(e => {
              console.log(e);
          });
  }

  const handleLoadMore = async ({ detail: { loaded, complete } }) => {
      const uri = 'at://' + did + '/app.bsky.graph.list/' + id;
      const res = await $agent.getTimeline({limit: 20, cursor: cursor, algorithm: {
              type: 'officialList',
              algorithm: uri,
          }});
      cursor = res.data.cursor;

      if (cursor) {
          timeline = [...timeline, ...res.data.feed]

          loaded();
      } else {
          complete();
      }
  }
</script>

{#if did}
  <div class="list-view-list-item">
    <OfficialListItem uri={'at://' + did + '/app.bsky.graph.list/' + id} bind:title={title}></OfficialListItem>
  </div>

  <div class="timeline timeline--main">
    {#each timeline as data, index (data)}
      <TimelineItem data={ data } index={index}></TimelineItem>
    {/each}

    <InfiniteLoading on:infinite={handleLoadMore}>
      <p slot="noMore" class="infinite-nomore">もうないよ</p>
    </InfiniteLoading>
  </div>
{/if}

<style lang="postcss">
  .list-view-list-item {
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color-2);
  }
</style>