<script lang="ts">
  import {agent, pulseLike, settings} from '$lib/stores';
  import { toast } from 'svelte-sonner';
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
  let isTransition: boolean = false;
  $: handleLikeChange($pulseLike);

  function handleLikeChange(data) {
      if (!data) {
          return false;
      }

      const isSameDid = data.did === _agent.did();

      if (uri === data.uri) {
          count = data.count;
          likeViewer = isSameDid ? data.viewer : likeViewer;

          dispatch('like', {
              count: data.count,
              viewer: likeViewer,
          });
      }
  }

  export async function vote(cid: string, uri: string, likeViewer) {
      isProcessed = true;
      isTransition = true;

      if (!likeViewer) {
          count = count + 1;
      } else {
          count = count - 1;
      }

      pulseLike.set({
          uri: uri,
          count: count,
          viewer: likeViewer,
          did: _agent.did() as string,
      })

      try {
          const like = await _agent.setVote(cid, uri, likeViewer || '');

          try {
              likeViewer = like?.uri || undefined;
              isProcessed = false;

              pulseLike.set({
                  uri: uri,
                  count: count,
                  viewer: likeViewer,
                  did: _agent.did() as string
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
              viewer: likeViewer,
              did: _agent.did() as string
          })
      }

      isTransition = false;
  }
</script>

<button
    class="timeline-reaction__item timeline-reaction__item--like"
    class:timeline-reaction__item--transition={isTransition}
    class:timeline-reaction__item--active={likeViewer}
    disabled="{isProcessed}"
    on:click="{() => vote(cid, uri, likeViewer)}"
>
  <span class="timeline-reaction__icon" aria-label="いいね">
    {#if ($settings?.design?.reactionMode === 'superstar')}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="var(--timeline-reaction-like-icon-color)" stroke="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="var(--timeline-reaction-like-icon-color)" stroke="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart" on:animationend={() => {isTransition = false}}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
    {/if}
  </span>

  {#if showCounts && count}
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

        &--active {
            svg {
                fill: var(--timeline-reaction-liked-icon-color);
            }
        }

        &--transition {
            svg {
                fill: var(--timeline-reaction-liked-icon-color);
                animation: ease-out .5s like-in forwards;
            }
        }

        &:active {
            svg {
                transform: scale(.85);
            }
        }
    }

    @keyframes like-in {
        0% {
            transform: scale(1.35);
        }

        100% {
            transform: scale(1);
        }
    }
</style>