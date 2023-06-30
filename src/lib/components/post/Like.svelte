<script lang="ts">
  import { agent, timelines } from '$lib/stores';
  import toast from 'svelte-french-toast';
  import { _ } from 'svelte-i18n';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let cid;
  export let uri;
  export let count;
  export let likeViewer;

  let isProcessed: boolean = false;
  $: myVoteCheck = typeof likeViewer === 'string';

  export async function vote(cid: string, uri: string, likeViewer) {
      myVoteCheck = !myVoteCheck;
      isProcessed = true;

      if (myVoteCheck) {
          count = count + 1;
      } else {
          count = count - 1;
      }

      try {
          const like = await $agent.setVote(cid, uri, likeViewer || '');

          try {
              const latest = await $agent.getFeed(uri);

              isProcessed = false;
              count = latest.post.likeCount;
              likeViewer = like?.uri || undefined;

              timelines.update(function (tls) {
                  return tls.map(tl => {
                      tl.forEach(item => {
                          if (item.post.uri === uri) {
                              item.post.likeCount = latest.post.likeCount;
                              item.post.viewer.like = like?.uri || undefined;
                          }
                      });
                      return tl;
                  });
              });

              dispatch('like', {
                  count: count,
                  likeViewer: likeViewer,
              });
          } catch(e) {
              toast.error($_('failed_to_like_after_reload'));
              console.log(e)
              isProcessed = false;
          }
      } catch (e) {
          toast.error($_('failed_to_like'));
          console.error(e);
          myVoteCheck = !myVoteCheck;
          isProcessed = false;

          if (myVoteCheck) {
              count = count - 1;
          } else {
              count = count + 1;
          }
      }
  }
</script>

<div class="timeline-reaction__item timeline-reaction__item--like">
  <button class="timeline-reaction__icon" disabled="{isProcessed}" on:click="{() => vote(cid, uri, likeViewer)}" aria-label="いいね">
    {#if (myVoteCheck)}
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="var(--primary-color)" stroke="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="var(--border-color-1)" stroke="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
    {/if}
  </button>

  <span class="timeline-reaction__count">{ count }</span>
</div>

<style lang="postcss">
    .timeline-reaction__item {
        &:hover {
            @media (min-width: 768px) {
                background-color: var(--border-color-1);
                color: var(--bg-color-1);

                svg {
                    fill: var(--bg-color-1);
                }
            }
        }
    }
</style>