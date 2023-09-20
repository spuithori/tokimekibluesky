<script lang="ts">
  import {agent, pulseLike} from '$lib/stores';
  import toast from 'svelte-french-toast';
  import { _ } from 'svelte-i18n';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let _agent = $agent;
  export let cid;
  export let uri;
  export let count;
  export let likeViewer;
  export let showCounts = true;
  let timeoutId;

  let isProcessed: boolean = false;
  $: handleLikeChange($pulseLike);

  function handleLikeChange(data) {
      if (!data) {
          return false;
      }

      if (uri === data.uri) {
          count = data.count;
          likeViewer = data.viewer;

          dispatch('like', {
              count: data.count,
              viewer: data.viewer,
          });
      }
  }

  export async function vote(cid: string, uri: string, likeViewer) {
      isProcessed = true;

      if (!likeViewer) {
          count = count + 1;
      } else {
          count = count - 1;
      }

      pulseLike.set({
          uri: uri,
          count: count,
          viewer: likeViewer
      })

      try {
          const like = await _agent.setVote(cid, uri, likeViewer || '');

          try {
              isProcessed = false;
              likeViewer = like?.uri || undefined;

              pulseLike.set({
                  uri: uri,
                  count: count,
                  viewer: likeViewer
              });

              if (timeoutId) {
                  clearTimeout(timeoutId);
              }
              timeoutId = setTimeout(() => {
                  pulseLike.set(undefined);
              }, 1000)
          } catch(e) {
              toast.error($_('failed_to_like_after_reload'));
              console.log(e)
              isProcessed = false;
          }
      } catch (e) {
          toast.error($_('failed_to_like'));
          console.error(e);
          isProcessed = false;

          if (!likeViewer) {
              count = count - 1;
          } else {
              count = count + 1;
          }

          pulseLike.set({
              uri: uri,
              count: count,
              viewer: likeViewer
          })
      }
  }
</script>

<button class="timeline-reaction__item timeline-reaction__item--like" disabled="{isProcessed}" on:click="{() => vote(cid, uri, likeViewer)}">
  <span class="timeline-reaction__icon" aria-label="いいね">
    {#if (likeViewer)}
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="var(--primary-color)" stroke="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="var(--timeline-reaction-like-icon-color)" stroke="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
    {/if}
  </span>

  {#if showCounts}
    <span class="timeline-reaction__count">{ count || 0 }</span>
  {/if}
</button>

<style lang="postcss">
    .timeline-reaction__item {
        &:hover {
            @media (min-width: 768px) {
                color: var(--timeline-reaction-like-icon-hover-color);

                .timeline-reaction__icon::after {
                    background-color: var(--timeline-reaction-like-hover-bg-color);
                }

                svg {
                    fill: var(--timeline-reaction-like-icon-hover-color);
                }
            }
        }
    }
</style>