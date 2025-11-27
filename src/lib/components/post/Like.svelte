<script lang="ts">
  import { agent, settings } from '$lib/stores';
  import { toast } from 'svelte-sonner';
  import { _ } from 'svelte-i18n';
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {Heart, Star} from "lucide-svelte";
  import NumberFlow from '@number-flow/svelte';
  import { isReasonRepost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
  import {settingsState} from "$lib/classes/settingsState.svelte";
  import { createLongPress } from "$lib/longpress";
  import AvatarAgentsSelectorSkeleton from "$lib/components/acp/AvatarAgentsSelectorSkeleton.svelte";

  interface Props {
    _agent?: any;
    post: any;
    reason?: any;
    showCounts?: boolean;
    isTok?: boolean;
  }

  let {
    _agent = $agent,
    post,
    reason,
    showCounts = true,
    isTok = false,
  }: Props = $props();

  const columnState = getColumnState(false);
  const junkColumnState = getColumnState(true);
  let isProcessed: boolean = $state(false);
  let isNumberTransition: boolean = $state(false);
  let isAgentSelectorOpen = $state(false);
  let temporaryAgent;

  async function vote(cid: string, uri: string, viewer) {
      if (isAgentSelectorOpen) {
          return false;
      }

      const __agent = temporaryAgent || _agent;
      isProcessed = true;
      isNumberTransition = true;

      try {
          const via = isReasonRepost(reason) && !settingsState?.settings?.disableEmbedVia && reason.cid && reason.uri
              ? {
                  cid: reason.cid,
                  uri: reason.uri,
              }
              : undefined;
          const like = await __agent.setVote(cid, uri, viewer || '', via);
          const likeViewer = like?.uri || undefined;
          const pulse = {
              viewer: likeViewer,
              did: __agent.did(),
              uri: uri,
              count: likeViewer ? post.likeCount + 1 : post.likeCount - 1,
          };

          columnState.updateLike(pulse);
          junkColumnState.updateLike(pulse);
      } catch (e) {
          toast.error($_('failed_to_like'));
          console.error(e);
          isNumberTransition = false;
      }

      isProcessed = false;
      temporaryAgent = undefined;
  }

  function handleLongPress() {
      isAgentSelectorOpen = true;
  }

  async function handleLongPressSelect(agent) {
      isAgentSelectorOpen = false;
      temporaryAgent = agent;
      await vote(post.cid, post.uri, post.viewer?.like);
  }
</script>

<div class="timeline-reaction__wrap">
    <button
        class="timeline-reaction__item timeline-reaction__item--like"
        class:timeline-reaction__item--is-tok={isTok}
        class:timeline-reaction__item--active={post.viewer?.like}
        class:timeline-reaction__item--transition={isProcessed}
        disabled={isProcessed}
        onclick={() => vote(post.cid, post.uri, post.viewer?.like)}
        use:createLongPress={{callback: handleLongPress, duration: 500}}
    >
  <span class="timeline-reaction__icon" aria-label={$_('like')}>
    {#if ($settings?.design?.reactionMode === 'superstar')}
      <Star size="16" color="var(--timeline-reaction-like-icon-color)" fill="var(--timeline-reaction-like-fill-color, transparent)" absoluteStrokeWidth={true} strokeWidth="1.5"></Star>
    {:else}
      <Heart size="16" color="var(--timeline-reaction-like-icon-color)" fill="var(--timeline-reaction-like-fill-color, transparent)" absoluteStrokeWidth={true} strokeWidth="1.5"></Heart>
    {/if}
  </span>

        {#if showCounts && post.likeCount}
    <span class="timeline-reaction__count">
      {#if isNumberTransition}
        <NumberFlow value={post.likeCount} onanimationsfinish={() => {isNumberTransition = false}} format={{ useGrouping: false }}></NumberFlow>
      {:else}
        {post.likeCount}
      {/if}
    </span>
        {/if}
    </button>

    {#if isAgentSelectorOpen}
        <AvatarAgentsSelectorSkeleton
            onselect={handleLongPressSelect}
            onclose={() => {isAgentSelectorOpen = false}}
        ></AvatarAgentsSelectorSkeleton>
    {/if}
</div>

<style lang="postcss">
    .timeline-reaction__wrap {
        position: relative;
    }

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