<script lang="ts">
  import { agent, settings } from '$lib/stores';
  import { toast } from 'svelte-sonner';
  import { _ } from 'svelte-i18n';
  import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
  import {pulse, type pulseReaction} from "$lib/components/post/reactionPulse.svelte";

  interface Props {
    _agent?: any;
    cid: any;
    uri: any;
    count: any;
    repostViewer: any;
    showCounts?: boolean;
  }

  let {
    _agent = $agent,
    cid,
    uri,
    count,
    repostViewer,
    showCounts = true
  }: Props = $props();

  let isDialogRender = $state(false);
  let dialog = $state();

  let isProcessed: boolean = $state(false);
  let isTransition: boolean = $state(false);

  $effect(() => {
      handlePulse(pulse.repost);
  })

  function handlePulse(pulse: pulseReaction) {
      if (pulse?.uri !== uri) {
          return false;
      }

      const isSameDid = pulse.did === _agent.did();

      count = pulse.count;
      repostViewer = isSameDid ? pulse.viewer : repostViewer;
  }

  if ($settings.general?.repostConfirmSkip === undefined) {
      $settings.general.repostConfirmSkip = false;
  }

  export async function repost(cid: string, uri: string, repostViewer) {
      isProcessed = true;
      isTransition = true;

      try {
          const repost = await _agent.setRepost(cid, uri, repostViewer || '');
          repostViewer = repost?.uri || undefined;
          isProcessed = false;

          toast.success($_('success_to_repost_or_delete_repost'));
      } catch (e) {
          toast.error($_('failed_to_repost'));
          console.error(e);
          isProcessed = false;
      }

      pulse.repost = {
          viewer: repostViewer,
          did: _agent.did(),
          uri: uri,
          count: repostViewer ? count + 1 : count - 1,
          unique: Symbol(),
      }
  }

  function repostStep() {
      if ($settings.general.repostConfirmSkip) {
          repost(cid, uri, repostViewer);
      } else {
          isDialogRender = true;
      }
  }
</script>

<button
        class="timeline-reaction__item timeline-reaction__item--repost"
        class:timeline-reaction__item--transition={isTransition}
        class:timeline-reaction__item--active={repostViewer}
        disabled="{isProcessed}"
        onclick={repostStep}>
  <span class="timeline-reaction__icon" aria-label="リポスト">
     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--timeline-reaction-repost-icon-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat-2" onanimationend={() => {isTransition = false}}><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>
  </span>

  {#if showCounts && count}
    <span class="timeline-reaction__count">{ count || 0 }</span>
  {/if}
</button>

{#if (isDialogRender)}
  <ConfirmModal
      bind:this={dialog}
      on:ok={() => {repost(cid, uri, repostViewer)}}
      on:cancel={() => {isDialogRender = false}}
      confirmationName="repostConfirmSkip"
      yesText="{$_('repost')}"
      cancelText="{$_('cancel')}"
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
    .timeline-reaction__item {
        &:hover {
            @media (min-width: 768px) {
                color: var(--timeline-reaction-repost-icon-hover-color);

                .timeline-reaction__icon::after {
                    background-color: var(--timeline-reaction-repost-hover-bg-color);
                }

                path {
                    stroke: var(--timeline-reaction-repost-icon-hover-color);
                }
            }
        }

        &--active {
            svg {
                stroke: var(--timeline-reaction-reposted-icon-color);
            }
        }

        &--transition {
            svg {
                stroke: var(--timeline-reaction-reposted-icon-color);
                animation: cubic-bezier(0, 0, 0.09, 1) .5s s-XogTlpWZ1Mmo-repost-in forwards;
            }
        }

        &:active {
            svg {
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