<script lang="ts">
  import type {LayoutData, Snapshot} from './$types';
  import {agent, isAfterReload, junkColumns, settings} from '$lib/stores';
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import DeckRow from "../../DeckRow.svelte";
  import TimelineItem from "../../TimelineItem.svelte";
  import {onMount} from "svelte";

  export let data: LayoutData;
  let scrollY = 0;
  let pinnedPost;

  if ($junkColumns.findIndex(_column => _column.id === 'profile_' + data.params.handle) === -1) {
      junkColumns.set([...$junkColumns, {
          id: 'profile_' + data.params.handle,
          algorithm: {
              algorithm: data.params.handle,
              type: 'author',
              name: '@' + data.params.handle,
          },
          style: 'default',
          settings: defaultDeckSettings,
          did: $agent.did(),
          handle: $agent.handle(),
          data: {
              feed: [],
              cursor: '',
          }
      }]);
  }

  export const snapshot: Snapshot = {
      capture: () => [$settings.design.layout === 'decks' ? document.querySelector('.modal-page-content').scrollTop : document.querySelector(':root').scrollTop, pinnedPost],
      restore: (value) => {
        if(!$isAfterReload) {
          [scrollY, pinnedPost] = value;

          setTimeout(() => {
              if ($settings.design.layout === 'decks') {
                  document.querySelector('.modal-page-content').scroll(0, scrollY);
              } else {
                  document.querySelector(':root').scroll(0, scrollY);
              }
          }, 0)
        }

        isAfterReload.set(false);
      }
  };

  async function getPinnedPost() {
      const res = await $agent.agent.api.com.atproto.repo.getRecord({repo: data.params.handle, collection: 'app.bsky.actor.profile', rkey: 'self'});
      if (res.data.value?.pinnedPost) {
          const record = await $agent.getFeed(res.data.value.pinnedPost);
          if (record.post.author.handle === data.params.handle) {
              pinnedPost = record;
          }
      }
  }

  onMount(async () => {
      try {
          await getPinnedPost();
      } catch (e) {
          //
      }
  })
</script>

<svelte:head>
  <title>{data.params.handle} - TOKIMEKI</title>
</svelte:head>

{#if pinnedPost}
  <div class="timeline sticky-post">
    <TimelineItem data={pinnedPost} isPinned={true} isSingle={true}></TimelineItem>
  </div>
{/if}

{#if ($junkColumns.findIndex(_column => _column.id === 'profile_' + data.params.handle) !== -1)}
  <DeckRow column={$junkColumns[$junkColumns.findIndex(_column => _column.id === 'profile_' + data.params.handle)]}
           isJunk={true}></DeckRow>
{/if}
