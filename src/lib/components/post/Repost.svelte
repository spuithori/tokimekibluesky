<script lang="ts">
  import { agent, settings } from '$lib/stores';
  import { toast } from 'svelte-sonner';
  import { _ } from 'svelte-i18n';
  import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {Repeat} from "lucide-svelte";
  import NumberFlow from '@number-flow/svelte';
  import { isReasonRepost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
  import {settingsState} from "$lib/classes/settingsState.svelte";
  import { createLongPress } from "$lib/longpress";
  import AvatarAgentsSelectorSkeleton from "$lib/components/acp/AvatarAgentsSelectorSkeleton.svelte";
  import type {Agent} from "$lib/agent";

  interface Props {
    _agent?: any;
    post: any;
    reason?: any;
    showCounts?: boolean;
  }

  let {
    _agent = $agent,
    post,
    reason,
    showCounts = true,
  }: Props = $props();

  const columnState = getColumnState(false);
  const junkColumnState = getColumnState(true);
  let isDialogRender = $state(false);
  let isProcessed: boolean = $state(false);
  let isNumberTransition: boolean = $state(false);
  let isAgentSelectorOpen = $state(false);
  let temporaryAgent;

  if ($settings.general?.repostConfirmSkip === undefined) {
      $settings.general.repostConfirmSkip = false;
  }

  async function getPostRepostViewer(_agent: Agent) {
      try {
          const { data } = await _agent.agent.api.app.bsky.feed.getPostThread({uri: post.uri});
          return data?.thread?.post?.viewer?.repost;
      } catch (e) {
          throw new Error('Failed to get post repost viewer');
      }
  }

  async function repost(cid: string, uri: string) {
      if (isAgentSelectorOpen) {
          return false;
      }

      try {
          const __agent = temporaryAgent || _agent;
          const viewer = temporaryAgent ? await getPostRepostViewer(__agent) : post?.viewer?.repost;
          isProcessed = true;
          isNumberTransition = true;

          const via = isReasonRepost(reason) && !settingsState?.settings?.disableEmbedVia && reason.cid && reason.uri
              ? {
                  cid: reason.cid,
                  uri: reason.uri,
              }
              : undefined;
          const repost = await __agent.setRepost(cid, uri, viewer || '', via);
          const repostViewer = repost?.uri || undefined;
          const pulse = {
              viewer: repostViewer,
              did: __agent.did(),
              uri: uri,
              count: repostViewer ? post.repostCount + 1 : post.repostCount - 1,
          };

          columnState.updateRepost(pulse);
          junkColumnState.updateRepost(pulse);
      } catch (e) {
          toast.error($_('failed_to_repost'));
          console.error(e);
          isNumberTransition = false;
      }

      setTimeout(() => {
        isProcessed = false;
      }, 500);
  }

  function repostStep() {
      if (isAgentSelectorOpen) {
          return false;
      }

      if ($settings.general.repostConfirmSkip) {
          repost(post.cid, post.uri, post.viewer?.repost);
      } else {
          isDialogRender = true;
      }
  }

  function handleLongPress() {
      isAgentSelectorOpen = true;
  }

  async function handleLongPressSelect(agent) {
      isAgentSelectorOpen = false;
      temporaryAgent = agent;
      repostStep();
  }
</script>

<div class="timeline-reaction__wrap">
    <button
        class="timeline-reaction__item timeline-reaction__item--repost"
        class:timeline-reaction__item--active={post.viewer?.repost}
        class:timeline-reaction__item--transition={isProcessed}
        disabled={isProcessed}
        onclick={repostStep}
        use:createLongPress={{callback: handleLongPress, duration: 500}}
    >
        <span class="timeline-reaction__icon" aria-label={$_('repost')}>
            <Repeat size="16" color="var(--timeline-reaction-repost-icon-color)" absoluteStrokeWidth={true} strokeWidth="1.5"></Repeat>
        </span>

        {#if showCounts && post.repostCount}
            <span class="timeline-reaction__count">
                {#if isNumberTransition}
                    <NumberFlow value={post.repostCount} onanimationsfinish={() => {isNumberTransition = false}} format={{ useGrouping: false }}></NumberFlow>
                {:else}
                    {post.repostCount}
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

{#if (isDialogRender)}
  <ConfirmModal
      on:ok={() => {repost(post.cid, post.uri, post.viewer?.repost)}}
      on:cancel={() => {isDialogRender = false}}
      confirmationName="repostConfirmSkip"
      yesText={$_('repost')}
      cancelText={$_('cancel')}
  >
    <h3 class="modal-title modal-title--smaller modal-title--center">{$_('repost_confirm_title')}</h3>
    <p class="modal-text modal-text--flex">
      {$_('repost_confirm_text_1')}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="var(--text-color-3)" stroke="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-quote"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
      {$_('repost_confirm_text_2')}
    </p>
  </ConfirmModal>
{/if}

<style lang="postcss">
    .timeline-reaction__wrap {
        position: relative;
    }

    .timeline-reaction__item {
        &:hover {
            @media (min-width: 768px) {
                --timeline-reaction-repost-icon-color: var(--timeline-reaction-repost-icon-hover-color);

                .timeline-reaction__icon::after {
                    background-color: var(--timeline-reaction-repost-hover-bg-color);
                }
            }
        }

        &--active {
            --timeline-reaction-repost-icon-color: var(--timeline-reaction-reposted-icon-color);
        }

        &--transition {
            --timeline-reaction-repost-icon-color: var(--timeline-reaction-reposted-icon-color);

            .timeline-reaction__icon {
                animation: cubic-bezier(0, 0, 0.09, 1) .5s repost-in forwards;
            }
        }

        &:active {
            .timeline-reaction__icon {
                transform: scale(.85);
            }
        }
    }

    @keyframes repost-in {
        0% {
            transform: rotate(0deg);
        }

        100% {
            transform: rotate(180deg);
        }
    }
</style>