<script lang="ts">
    import {_} from "svelte-i18n";
    import { page } from '$app/stores';
    import FeedPreview from "./FeedPreview.svelte";
    import PageModal from "$lib/components/ui/PageModal.svelte";
    import type { Snapshot } from './$types';
    import {isAfterReload, settings, agent} from "$lib/stores";
    import {onMount, tick} from "svelte";
    import FeedHeading from "$lib/components/feeds/FeedHeading.svelte";

    let title = $state('');
    let _agent = $state($agent);
    let feed = $state();

    export const snapshot: Snapshot = {
        capture: () => [$settings.design.layout === 'decks' ? document.querySelector('.modal-page-content').scrollTop : document.querySelector(':root').scrollTop],
        restore: (value) => {
            if(!$isAfterReload) {
                [scrollY] = value;

                tick().then(() => {
                    if ($settings.design.layout === 'decks') {
                        document.querySelector('.modal-page-content').scroll(0, scrollY);
                    } else {
                        document.querySelector(':root').scroll(0, scrollY);
                    }
                });
            }

            isAfterReload.set(false);
        }
    };

    onMount(async () => {
      try {
        const res = await _agent.agent.api.app.bsky.feed.getFeedGenerator({feed: 'at://' + $page.params.handle + '/app.bsky.feed.generator/' + $page.params.id});
        feed = res.data.view;
      } catch (e) {
        //
      }
    });
</script>

<PageModal>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    {#if feed}
      <FeedHeading {_agent} {feed}></FeedHeading>
    {/if}

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  {#if feed}
    {#key $page.params.id}
      <FeedPreview id={$page.params.id} handle={$page.params.handle} title={feed?.displayName} {_agent} contentMode={feed?.contentMode}></FeedPreview>
    {/key}
  {/if}
</PageModal>