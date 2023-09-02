<script lang="ts">
  import {agent} from "$lib/stores";
  import {createEventDispatcher, onMount} from "svelte";
  import {_} from "svelte-i18n";
  import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";
  import InfiniteLoading from "svelte-infinite-loading";
  const dispatch = createEventDispatcher();

  export let _agent = $agent;
  let popularFeeds = [];
  let savedFeeds = [];
  let cursor = undefined;

  async function getSavedFeeds () {
      const preferenceRes = await _agent.agent.api.app.bsky.actor.getPreferences()
      const preference = preferenceRes.data.preferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')
      savedFeeds = preference[0]?.saved || [];
  }

  function isSaved(feed) {
      const uri = feed.uri;
      return savedFeeds.includes(uri);
  }

  const handleLoadMore = async ({ detail: { loaded, complete } }) => {
      if (_agent.agent.service.host === 'bsky.social') {
          const res = await _agent.agent.api.app.bsky.unspecced.getPopularFeedGenerators({limit: 20, cursor: cursor});
          cursor = res.data.cursor;

          if (cursor) {
              popularFeeds = [...popularFeeds, ...res.data.feeds]

              loaded();
          } else {
              complete();
          }
      }
  }

  onMount(async () => {
      await getSavedFeeds();
  })
</script>

<div class="feeds-store-wrap">
  {#if (_agent.agent.service.host === 'bsky.social')}
    <div class="feeds-group">
      <h3 class="feeds-group-title">{$_('popular_feeds')}</h3>

      <div class="feeds-list">
        {#each popularFeeds as feed}
          <FeedsItem feed={feed} subscribed={isSaved(feed)} {_agent} on:close></FeedsItem>
        {/each}
      </div>

      <InfiniteLoading on:infinite={handleLoadMore}>
        <p slot="noMore" class="infinite-nomore">もうないよ</p>
      </InfiniteLoading>
    </div>
  {/if}
</div>

<style lang="postcss">
    .feeds-list {

    }

    .feeds-group-title {
        margin-bottom: 15px;
    }

    .feeds-group {
        margin-top: 30px;

        &:first-child {
            margin-top: 0;
        }
    }
</style>