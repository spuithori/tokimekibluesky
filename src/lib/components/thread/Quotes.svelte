<script lang="ts">
  import {_} from "svelte-i18n";
  import QuotesModal from "$lib/components/thread/QuotesModal.svelte";

  let { uri, _agent, children } = $props();
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

<button class="likes-heading" onclick={() => {isOpen = true}}>
  {@render children?.()}
  {$_('quote')}
</button>

{#if (isOpen)}
  <QuotesModal {uri} {_agent} onclose={handleClose}></QuotesModal>
{/if}

<style lang="postcss">
    .likes-heading {
        margin-top: 10px;

        &:hover {
            text-decoration: underline;
        }
    }
</style>