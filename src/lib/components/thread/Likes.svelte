<script lang="ts">
  import {_} from "svelte-i18n";
  import LikesModal from "$lib/components/thread/LikesModal.svelte";

  export let uri;
  let isOpen = false;

  function handleClose() {
      isOpen = false;
  }

  $: {
      if (isOpen) {
          document.body.classList.add('scroll-lock');
      } else {
          document.body.classList.remove('scroll-lock');
      }
  }
</script>

<button class="likes-heading" on:click={() => {isOpen = true}}>{$_('liked_users')}</button>

{#if (isOpen)}
  <LikesModal {uri} on:close={handleClose}></LikesModal>
{/if}

<style lang="postcss">
  .likes-heading {
      margin-top: 10px;

      &:hover {
          text-decoration: underline;
      }
  }
</style>