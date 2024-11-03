<script lang="ts">
  import {agent, isPublishInstantFloat, sideState} from '$lib/stores';
  import {postState} from "$lib/classes/postState.svelte";

  interface Props {
    _agent?: any;
    post: any;
    reply: any;
    count: any;
    showCounts?: boolean;
  }

  let {
    _agent = $agent,
    post,
    reply,
    count,
    showCounts = true
  }: Props = $props();

  function handleClick() {
      postState.reply = { did: _agent.agent.session.did, data: { parent: post, root: (reply ? reply.root : post) } }
      postState.replyPulse = Symbol();
      $sideState = 'publish';
      $isPublishInstantFloat = true;
  }
</script>

<button class="timeline-reaction__item timeline-reaction__item--reply" onclick={handleClick} disabled={post?.viewer?.replyDisabled}>
  <span class="timeline-reaction__icon" aria-label="返信">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--timeline-reaction-reply-icon-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-reply"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
  </span>

  {#if showCounts && count}
    <span class="timeline-reaction__count">{ count || 0 }</span>
  {/if}
</button>

<style lang="postcss">
    svg {
        margin-bottom: 2px;
    }

    .timeline-reaction__item {
        &:not(:disabled) {
            &:hover {
                @media (min-width: 768px) {
                    color: var(--timeline-reaction-reply-icon-hover-color);

                    .timeline-reaction__icon::after {
                        background-color: var(--timeline-reaction-reply-hover-bg-color);
                    }

                    svg {
                        stroke: var(--timeline-reaction-reply-icon-hover-color);
                    }
                }
            }
        }

        &:disabled {
            opacity: .5;
        }
    }
</style>