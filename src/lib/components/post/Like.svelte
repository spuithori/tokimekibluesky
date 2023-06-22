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
      <svg xmlns="http://www.w3.org/2000/svg" width="15.78" height="14.101" viewBox="0 0 15.78 14.101">
        <path id="heart" d="M8,2.792l-.487-.479a4.388,4.388,0,0,0-6.206,6.2l0,0L8,15.206,14.7,8.5a4.388,4.388,0,0,0-6.21-6.2l0,0L8,2.792Z" transform="translate(-0.111 -1.105)" fill="var(--primary-color)"/>
      </svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="15.78" height="14.101" viewBox="0 0 15.78 14.101">
        <path id="heart" d="M8,2.792l-.487-.479a4.388,4.388,0,0,0-6.206,6.2l0,0L8,15.206,14.7,8.5a4.388,4.388,0,0,0-6.21-6.2l0,0L8,2.792Z" transform="translate(-0.111 -1.105)" fill="var(--border-color-1)"/>
      </svg>
    {/if}
  </button>

  { count }
</div>
