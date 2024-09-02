<script lang="ts">
    import {_} from "svelte-i18n";
    import {onDestroy} from "svelte";
    import QuotesModal from "$lib/components/thread/QuotesModal.svelte";

    export let uri;
    let isOpen = false;

    function handleClose() {
        isOpen = false;
    }

    $: {
        if (isOpen) {
            document.documentElement.classList.add('scroll-lock');
        } else {
            document.documentElement.classList.remove('scroll-lock');
        }
    }

    onDestroy(() => {
        document.documentElement.classList.remove('scroll-lock');
    })
</script>

<button class="likes-heading" on:click={() => {isOpen = true}}>
  <slot></slot>
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