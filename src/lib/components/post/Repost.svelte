<script lang="ts">
    import Quote from '@lucide/svelte/icons/quote';
  import { agent, settings } from '$lib/stores';
  import { toast } from 'svelte-sonner';
  import { _ } from 'tokimeki-i18n';
  import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import Repeat from '@lucide/svelte/icons/repeat';
  import NumberFlow from '@number-flow/svelte';
  import { isReasonRepost } from "$lib/atproto-guards";
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
          const res = await _agent.xrpc.get('app.bsky.feed.getPostThread', {uri: post.uri});
          return res?.thread?.post?.viewer?.repost;
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
        temporaryAgent = undefined;
      }, 500);
  }

  function repostStep() {
      if (isAgentSelectorOpen) {
          return false;
      }

      if ($settings.general.repostConfirmSkip) {
          repost(post.cid, post.uri);
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
      on:ok={() => {repost(post.cid, post.uri)}}
      on:cancel={() => {isDialogRender = false; temporaryAgent = undefined;}}
      confirmationName="repostConfirmSkip"
      yesText={$_('repost')}
      cancelText={$_('cancel')}
  >
    <h3 class="modal-title modal-title--smaller modal-title--center">{$_('repost_confirm_title')}</h3>
    <p class="modal-text modal-text--flex">
      {$_('repost_confirm_text_1')}
      <Quote size={20} color="none" />
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