<script lang="ts">
  import { run } from 'svelte/legacy';

    import {_} from "svelte-i18n";
    import {onDestroy} from "svelte";
    import QuotesModal from "$lib/components/thread/QuotesModal.svelte";

  let { uri, children } = $props();
    let isOpen = $state(false);

    function handleClose() {
        isOpen = false;
    }

    run(() => {
        if (isOpen) {
            document.documentElement.classList.add('scroll-lock');
        } else {
            document.documentElement.classList.remove('scroll-lock');
        }
    });

    onDestroy(() => {
        document.documentElement.classList.remove('scroll-lock');
    })
</script>

<button class="likes-heading" onclick={() => {isOpen = true}}>
  {@render children?.()}
  {$_('quote')}
</button>

{#if (isOpen)}
  <QuotesModal {uri} on:close={handleClose}></QuotesModal>
{/if}

<style lang="postcss">
    .likes-heading {
        margin-top: 10px;

        &:hover {
            text-decoration: underline;
        }
    }
</style>