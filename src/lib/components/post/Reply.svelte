<script lang="ts">
  import {agent} from '$lib/stores';
  import {publishState} from "$lib/classes/publishState.svelte";
  import {modalState} from "$lib/classes/modalState.svelte";
  import {MessageSquare} from "lucide-svelte";
  import {getPostState} from "$lib/classes/postState.svelte";

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
  const postState = getPostState();

  function handleClick() {
      postState.posts[postState.index].replyRef = { did: _agent.agent.session.did, data: { parent: post, root: (reply ? reply.root : post) } };
      postState.pulse = true;
      publishState.show = true;
      modalState.isVideoModalOpen = false;
      modalState.isMediaModalOpen = false;
  }
</script>

<button class="timeline-reaction__item timeline-reaction__item--reply" onclick={handleClick} disabled={post?.viewer?.replyDisabled || postState.posts.length > 1} aria-label="Reply">
  <span class="timeline-reaction__icon">
    <MessageSquare size="16" color="var(--timeline-reaction-reply-icon-color)" absoluteStrokeWidth={true} strokeWidth="1.5"></MessageSquare>
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