<script lang="ts">
  import { agent, settings } from '$lib/stores';
  import { toast } from 'svelte-sonner';
  import { m } from "$lib/paraglide/messages.js";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {Heart, Star} from "lucide-svelte";
  import NumberFlow from '@number-flow/svelte';
  import { isReasonRepost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
  import {settingsState} from "$lib/classes/settingsState.svelte";

  interface Props {
    _agent?: any;
    post: any;
    reason?: any;
    showCounts?: boolean;
    isModal?: boolean;
    isTok?: boolean;
  }

  let {
    _agent = $agent,
    post,
    reason,
    showCounts = true,
    isModal = false,
    isTok = false,
  }: Props = $props();

  const columnState = getColumnState(false);
  const junkColumnState = getColumnState(true);
  let isProcessed: boolean = $state(false);
  let isNumberTransition: boolean = $state(false);

  export async function vote(cid: string, uri: string, viewer) {
      isProcessed = true;
      isNumberTransition = true;

      try {
          const via = isReasonRepost(reason) && !settingsState?.settings?.disableEmbedVia && reason.cid && reason.uri
              ? {
                  cid: reason.cid,
                  uri: reason.uri,
              }
              : undefined;
          const like = await _agent.setVote(cid, uri, viewer || '', via);
          const likeViewer = like?.uri || undefined;
          const pulse = {
              viewer: likeViewer,
              did: _agent.did(),
              uri: uri,
              count: likeViewer ? post.likeCount + 1 : post.likeCount - 1,
              unique: Symbol(),
          };

          columnState.updateLike(pulse);
          junkColumnState.updateLike(pulse);

          if (isModal) {
              post.likeCount = pulse.count;
              post.viewer.like = pulse.viewer;
          }
      } catch (e) {
          toast.error(m.failed_to_like());
          console.error(e);
          isNumberTransition = false;
      }

      isProcessed = false;
  }
</script>

<button
    class="timeline-reaction__item timeline-reaction__item--like"
    class:timeline-reaction__item--is-tok={isTok}
    class:timeline-reaction__item--active={post.viewer?.like}
    class:timeline-reaction__item--transition={isProcessed}
    disabled={isProcessed}
    onclick={() => vote(post.cid, post.uri, post.viewer?.like)}
>
  <span class="timeline-reaction__icon" aria-label="いいね">
    {#if ($settings?.design?.reactionMode === 'superstar')}
      <Star size="16" color="var(--timeline-reaction-like-icon-color)" fill="var(--timeline-reaction-like-fill-color, transparent)" absoluteStrokeWidth={true} strokeWidth="1.5"></Star>
    {:else}
      <Heart size="16" color="var(--timeline-reaction-like-icon-color)" fill="var(--timeline-reaction-like-fill-color, transparent)" absoluteStrokeWidth={true} strokeWidth="1.5"></Heart>
    {/if}
  </span>

  {#if showCounts && post.likeCount}
    <span class="timeline-reaction__count">
      {#if isNumberTransition}
        <NumberFlow value={post.likeCount} onanimationsfinish={() => {isNumberTransition = false}}></NumberFlow>
      {:else}
        {post.likeCount}
      {/if}
    </span>
  {/if}
</button>

<style lang="postcss">
    .timeline-reaction__item {
        &:hover {
            @media (min-width: 768px) {
                --timeline-reaction-like-icon-color: var(--timeline-reaction-like-icon-hover-color);

                .timeline-reaction__icon::after {
                    background-color: var(--timeline-reaction-like-hover-bg-color);
                }
            }
        }

        &--active {
            --timeline-reaction-like-icon-color: var(--timeline-reaction-liked-icon-color);
            --timeline-reaction-like-fill-color: var(--timeline-reaction-liked-icon-color);
        }

        &--transition {
            --timeline-reaction-like-icon-color: var(--timeline-reaction-liked-icon-color);
            --timeline-reaction-like-fill-color: var(--timeline-reaction-liked-icon-color);

            .timeline-reaction__icon {
                animation: ease-out .5s like-in forwards;
            }
        }

        &--is-tok {
            flex-direction: column;
            gap: 1px;
            font-size: 10px;

            @media (max-width: 767px) {
                .timeline-reaction__count {
                    font-size: 10px;
                }
            }
        }

        &:active {
            .timeline-reaction__icon {
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