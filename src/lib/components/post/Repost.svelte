<script lang="ts">
    import { agent, timeline } from '$lib/stores';
    import toast from 'svelte-french-toast';
    import { _ } from 'svelte-i18n';
    import { createEventDispatcher } from 'svelte';
    import { AppBskyFeedDefs } from '@atproto/api';

    const dispatch = createEventDispatcher();

    export let cid;
    export let uri;
    export let count;
    export let repostViewer;

    let isProcessed: boolean = false;
    $: myRepostCheck = typeof repostViewer === 'string';

    const isReasonRepost = (reason: any): reason is AppBskyFeedDefs.ReasonRepost => {
        return !!(reason as AppBskyFeedDefs.ReasonRepost)?.by;
    }

    async function repost(cid: string, uri: string) {
        myRepostCheck = !myRepostCheck;
        isProcessed = true;

        if (myRepostCheck) {
            count = count + 1;
        } else {
            count = count - 1;
        }

        try {
            const repost = await $agent.setRepost(cid, uri, repostViewer || '');

            try {
                const latest = await $agent.getFeed(uri);

                isProcessed = false;
                count = latest.post.repostCount;
                repostViewer = repost?.uri || undefined;

                timeline.update(function (tl) {
                    tl.forEach(item => {
                        if (item.post.uri === uri) {
                            item.post.repostCount = latest.post.repostCount;
                            item.post.viewer.repost = repost?.uri || undefined;
                        }
                    });
                    return tl;
                });

                dispatch('repost', {
                    count: count,
                    repostViewer: repostViewer,
                });

                toast.success($_('success_to_repost_or_delete_repost'));
            } catch(e) {
                toast.error($_('failed_to_repost_after_reload'));
                console.log(e)
                isProcessed = false;
            }
        } catch (e) {
            toast.error($_('failed_to_repost'));
            console.error(e);
            myRepostCheck = !myRepostCheck;
            isProcessed = false;

            if (myRepostCheck) {
                count = count - 1;
            } else {
                count = count + 1;
            }
        }
    }
</script>

<div class="timeline-reaction__item timeline-reaction__item--repost">
  <button class="timeline-reaction__icon" disabled="{isProcessed}" on:click="{() => repost(cid, uri)}" aria-label="リポスト">
    {#if (myRepostCheck)}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="12" viewBox="0 0 20 12">
        <path id="retweet" d="M13.333,17.667A.342.342,0,0,1,13,18H3c-.385,0-.333-.406-.333-.667v-6h-2A.671.671,0,0,1,0,10.667a.638.638,0,0,1,.156-.427l3.333-4a.683.683,0,0,1,1.021,0l3.333,4A.636.636,0,0,1,8,10.667a.671.671,0,0,1-.667.667h-2v4h6a.356.356,0,0,1,.261.115l1.667,2A.42.42,0,0,1,13.333,17.667ZM20,13.333a.638.638,0,0,1-.156.427l-3.333,4a.664.664,0,0,1-1.021,0l-3.333-4A.636.636,0,0,1,12,13.333a.671.671,0,0,1,.667-.667h2v-4h-6a.332.332,0,0,1-.261-.125l-1.667-2a.357.357,0,0,1-.073-.209A.342.342,0,0,1,7,6H17c.385,0,.333.406.333.667v6h2A.671.671,0,0,1,20,13.333Z" transform="translate(0 -6)" fill="var(--primary-color)"/></svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="12" viewBox="0 0 20 12">
        <path id="retweet" d="M13.333,17.667A.342.342,0,0,1,13,18H3c-.385,0-.333-.406-.333-.667v-6h-2A.671.671,0,0,1,0,10.667a.638.638,0,0,1,.156-.427l3.333-4a.683.683,0,0,1,1.021,0l3.333,4A.636.636,0,0,1,8,10.667a.671.671,0,0,1-.667.667h-2v4h6a.356.356,0,0,1,.261.115l1.667,2A.42.42,0,0,1,13.333,17.667ZM20,13.333a.638.638,0,0,1-.156.427l-3.333,4a.664.664,0,0,1-1.021,0l-3.333-4A.636.636,0,0,1,12,13.333a.671.671,0,0,1,.667-.667h2v-4h-6a.332.332,0,0,1-.261-.125l-1.667-2a.357.357,0,0,1-.073-.209A.342.342,0,0,1,7,6H17c.385,0,.333.406.333.667v6h2A.671.671,0,0,1,20,13.333Z" transform="translate(0 -6)" fill="var(--border-color-1)"/></svg>
    {/if}
  </button>

  { count }
</div>