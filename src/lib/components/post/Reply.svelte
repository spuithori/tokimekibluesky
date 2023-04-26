<script lang="ts">
    import { replyRef } from '$lib/stores';

    export let post;
    export let reply;
    export let count;
</script>

<div class="timeline-reaction__item timeline-reaction__item--reply">
  <button class="timeline-reaction__icon" on:click={() => {$replyRef = { parent: post, root: (reply ? reply.root : post) }}} aria-label="返信"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="14" viewBox="0 0 15 14">
    <path id="reply" d="M77,110v-2.99s0-.006,0-.01a4,4,0,0,0-4-4H70v5l-6-6,6-6v5h3a6,6,0,0,1,6,6h0v3Z" transform="translate(-64 -96)" fill="var(--border-color-1)"/>
  </svg>
  </button>

  { count }
</div>