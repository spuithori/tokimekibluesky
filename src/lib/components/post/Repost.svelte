<script lang="ts">
    import {agent, timelines} from '$lib/stores';
    import toast from 'svelte-french-toast';
    import { _ } from 'svelte-i18n';
    import { createEventDispatcher } from 'svelte';
    import { AppBskyFeedDefs } from '@atproto/api';

    const dispatch = createEventDispatcher();

    export let _agent = $agent;
    export let cid;
    export let uri;
    export let count;
    export let repostViewer;

    let isProcessed: boolean = false;
    $: myRepostCheck = typeof repostViewer === 'string';

    const isReasonRepost = (reason: any): reason is AppBskyFeedDefs.ReasonRepost => {
        return !!(reason as AppBskyFeedDefs.ReasonRepost)?.by;
    }

    export async function repost(cid: string, uri: string, repostViewer) {
        myRepostCheck = !myRepostCheck;
        isProcessed = true;

        if (myRepostCheck) {
            count = count + 1;
        } else {
            count = count - 1;
        }

        try {
            const repost = await _agent.setRepost(cid, uri, repostViewer || '');

            try {
                // const latest = await _agent.getFeed(uri);

                isProcessed = false;
                // count = latest.post.repostCount;
                repostViewer = repost?.uri || undefined;

                timelines.update(function (tls) {
                    return tls.map(tl => {
                        tl.forEach(item => {
                            if (item.post.uri === uri) {
                                item.post.repostCount = count;
                                item.post.viewer.repost = repost?.uri || undefined;
                            }
                        });
                        return tl;
                    });
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
  <button class="timeline-reaction__icon" disabled="{isProcessed}" on:click="{() => repost(cid, uri, repostViewer)}" aria-label="リポスト">
    {#if (myRepostCheck)}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat-2"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--timeline-reaction-repost-icon-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat-2"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>
    {/if}
  </button>

  <span class="timeline-reaction__count">{ count || 0 }</span>
</div>

<style lang="postcss">
    .timeline-reaction__item {
        &:hover {
            @media (min-width: 768px) {
                background-color: var(--timeline-reaction-repost-hover-bg-color);
                color: var(--timeline-reaction-repost-icon-hover-color);

                path {
                    stroke: var(--timeline-reaction-repost-icon-hover-color);
                }
            }
        }
    }
</style>