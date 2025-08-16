<script lang="ts">
  import { m } from "$lib/paraglide/messages.js";
  import LikesModal from "$lib/components/thread/LikesModal.svelte";

  let { uri, _agent } = $props();
  let isOpen = $state(false);

  function handleClose() {
      isOpen = false;
  }

  $effect(() => {
      if (isOpen) {
          document.documentElement.classList.add('scroll-lock');
      } else {
          document.documentElement.classList.remove('scroll-lock');
      }

      return () => {
          document.documentElement.classList.remove('scroll-lock');
      };
  });
</script>

<button class="likes-heading" onclick={() => {isOpen = true}}>{m.liked_users()}</button>

{#if (isOpen)}
  <LikesModal {uri} {_agent} onclose={handleClose}></LikesModal>
{/if}

<style lang="postcss">
  .likes-heading {
      margin-top: 10px;

      &:hover {
          text-decoration: underline;
      }
  }
</style>