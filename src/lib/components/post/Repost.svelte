<script lang="ts">
    import {agent, pulseRepost, settings} from '$lib/stores';
    import { toast } from 'svelte-sonner';
    import { _ } from 'svelte-i18n';
    import { createEventDispatcher } from 'svelte';
    import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";

    const dispatch = createEventDispatcher();

    export let _agent = $agent;
    export let cid;
    export let uri;
    export let count;
    export let repostViewer;
    export let showCounts = true;
    let isDialogRender = false;
    let timeoutId;
    let dialog;

    let isProcessed: boolean = false;
    let isTransition: boolean = false;
    $: handleLikeChange($pulseRepost);

    $: {
        if (dialog) {
            dialog.open();
        }
    }

    if ($settings.general?.repostConfirmSkip === undefined) {
        $settings.general.repostConfirmSkip = false;
    }

    function handleLikeChange(data) {
        if (!data) {
            return false;
        }

        const isSameDid = data.did === _agent.did();

        if (uri === data.uri) {
            count = data.count;
            repostViewer = isSameDid ? data.viewer : repostViewer;

            dispatch('repost', {
                count: data.count,
                viewer: repostViewer,
            });
        }
    }

    export async function repost(cid: string, uri: string, repostViewer) {
        isProcessed = true;
        isTransition = true;

        if (!repostViewer) {
            count = count + 1;
        } else {
            count = count - 1;
        }

        pulseRepost.set({
            uri: uri,
            count: count,
            viewer: repostViewer,
            did: _agent.did() as string
        })

        try {
            const repost = await _agent.setRepost(cid, uri, repostViewer || '');

            try {
                repostViewer = repost?.uri || undefined;
                isProcessed = false;

                pulseRepost.set({
                    uri: uri,
                    count: count,
                    viewer: repostViewer,
                    did: _agent.did() as string
                })

                toast.success($_('success_to_repost_or_delete_repost'));

                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                timeoutId = setTimeout(() => {
                    pulseRepost.set(undefined);
                }, 1000)
            } catch(e) {
                toast.error($_('failed_to_repost_after_reload'));
                console.log(e)
                isProcessed = false;
            }
        } catch (e) {
            toast.error($_('failed_to_repost'));
            console.error(e);
            isProcessed = false;

            if (!repostViewer) {
                count = count - 1;
            } else {
                count = count + 1;
            }

            pulseRepost.set({
                uri: uri,
                count: count,
                viewer: repostViewer,
                did: _agent.did() as string
            })
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
        on:click="{repostStep}">
  <span class="timeline-reaction__icon" aria-label="リポスト">
     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--timeline-reaction-repost-icon-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat-2" on:animationend={() => {isTransition = false}}><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>
  </span>

  {#if showCounts}
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