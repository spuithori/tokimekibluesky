<script lang="ts">
  import {agent} from '$lib/stores';
  import {postState} from "$lib/classes/postState.svelte";
  import {publishState} from "$lib/classes/publishState.svelte";
  import {modalState} from "$lib/classes/modalState.svelte";
  import {MessageSquare} from "lucide-svelte";

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
      publishState.show = true;
      modalState.isVideoModalOpen = false;
      modalState.isMediaModalOpen = false;
  }
</script>

<button class="timeline-reaction__item timeline-reaction__item--reply" onclick={handleClick} disabled={post?.viewer?.replyDisabled} aria-label="Reply">
  <span class="timeline-reaction__icon">
    <MessageSquare size="18" color="var(--timeline-reaction-reply-icon-color)" strokeWidth="2.25"></MessageSquare>
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
                    --timeline-reaction-reply-icon-color: var(--timeline-reaction-reply-icon-hover-color);

                    .timeline-reaction__icon::after {
                        background-color: var(--timeline-reaction-reply-hover-bg-color);
                    }
                }
            }
        }

        &:disabled {
            opacity: .4;
        }
    }
</style>