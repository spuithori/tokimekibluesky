<script lang="ts">
  import { agent, settings } from '$lib/stores';
  import { toast } from 'svelte-sonner';
  import { _ } from 'svelte-i18n';
  import {pulse, type pulseReaction} from "$lib/components/post/reactionPulse.svelte";

  interface Props {
    _agent?: any;
    cid: any;
    uri: any;
    count: any;
    likeViewer: any;
    showCounts?: boolean;
  }

  let {
    _agent = $agent,
    cid,
    uri,
    count,
    likeViewer,
    showCounts = true
  }: Props = $props();

  let isProcessed: boolean = $state(false);

  $effect(() => {
      handlePulse(pulse.like);
  })

  function handlePulse(pulse: pulseReaction) {
      if (pulse?.uri !== uri) {
          return false;
      }

      console.log(pulse);

      const isSameDid = pulse.did === _agent.did();

      count = pulse.count;
      likeViewer = isSameDid ? pulse.viewer : likeViewer;
  }

  export async function vote(cid: string, uri: string, likeViewer) {
      isProcessed = true;

      try {
          const like = await _agent.setVote(cid, uri, likeViewer || '');
          likeViewer = like?.uri || undefined;
      } catch (e) {
          toast.error($_('failed_to_like'));
          console.error(e);
      }

      pulse.like = {
          viewer: likeViewer,
          did: _agent.did(),
          uri: uri,
          count: likeViewer ? count + 1 : count - 1,
          unique: Symbol(),
      }

      isProcessed = false;
  }
</script>

<button
    class="timeline-reaction__item timeline-reaction__item--like"
    class:timeline-reaction__item--active={likeViewer}
    class:timeline-reaction__item--transition={isProcessed}
    disabled="{isProcessed}"
    onclick={() => vote(cid, uri, likeViewer)}
>
  <span class="timeline-reaction__icon" aria-label="いいね">
    {#if ($settings?.design?.reactionMode === 'superstar')}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="var(--timeline-reaction-like-icon-color)" stroke="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="var(--timeline-reaction-like-icon-color)" stroke="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
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