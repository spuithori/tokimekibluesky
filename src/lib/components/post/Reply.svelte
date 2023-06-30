<script lang="ts">
  export let post;
  export let reply;
  export let count;
</script>

<script lang="ts" context="module">
  import { replyRef } from '$lib/stores';

  export function replyFunc(post, reply) {
      replyRef.set({ parent: post, root: (reply ? reply.root : post) })
  }
</script>

<div class="timeline-reaction__item timeline-reaction__item--reply">
  <button class="timeline-reaction__icon" on:click={() => {$replyRef = { parent: post, root: (reply ? reply.root : post) }}} aria-label="返信">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--border-color-1)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-reply"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
  </button>

  <span class="timeline-reaction__count">{ count }</span>
</div>

<style lang="postcss">
    svg {
        margin-bottom: 2px;
    }

    .timeline-reaction__item {
        &:hover {
            @media (min-width: 768px) {
                background-color: var(--border-color-1);
                color: var(--bg-color-1);

                svg {
                    stroke: var(--bg-color-1);
                }
            }
        }
    }
</style>