<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import { page } from '$app/stores';
    import FeedPreview from "./FeedPreview.svelte";
    import PageModal from "$lib/components/ui/PageModal.svelte";
    import type { Snapshot } from './$types';
    import {agent} from "$lib/stores";
    import {onMount} from "svelte";
    import FeedHeading from "$lib/components/feeds/FeedHeading.svelte";
    import {getDidByHandle, isDid} from "$lib/util";
    import {feedHintState} from "$lib/classes/feedHintState.svelte";

    let _agent = $state($agent);
    let feed = $state();
    let did = $state('');

    export const snapshot: Snapshot = {
        capture: () => [feed, did],
        restore: (value) => {
          [feed, did] = value;
        }
    };

    onMount(async () => {
      try {
        if (feedHintState.hasFeed($page.params.id, $page.params.handle)) {
          feed = $state.snapshot(feedHintState.view);
          did = feedHintState.view.creator.did;
          feedHintState.clear();
        }

        if (!did) {
          if (isDid($page.params.handle)) {
            did = $page.params.handle;
          } else {
            did = await getDidByHandle($page.params.handle, _agent);
          }
        }

        const res = await _agent.xrpc.get('app.bsky.feed.getFeedGenerator', {feed: 'at://' + did + '/app.bsky.feed.generator/' + $page.params.id});
        feed = res.view;
      } catch (e) {
      }
    });
</script>

<PageModal>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <ArrowLeft color="var(--text-color-1)" />
      </button>
    </div>

    {#if feed}
      <FeedHeading {_agent} {feed} {did}></FeedHeading>
    {/if}

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <X color="var(--text-color-1)" />
      </a>
    </div>
  </div>

  {#if feed}
    {#key $page.params.id}
      <FeedPreview id={$page.params.id} {did} title={feed?.displayName} {_agent} contentMode={feed?.contentMode}></FeedPreview>
    {/key}
  {/if}
</PageModal>