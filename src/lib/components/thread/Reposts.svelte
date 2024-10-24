<script lang="ts">
    import { run } from 'svelte/legacy';

    import {_} from "svelte-i18n";
    import {onDestroy} from "svelte";
    import RepostsModal from "$lib/components/thread/RepostsModal.svelte";

    let { uri } = $props();
    let isOpen = $state(false);

    function handleClose() {
        isOpen = false;
    }

    run(() => {
        if (isOpen) {
            document.body.classList.add('scroll-lock');
        } else {
            document.body.classList.remove('scroll-lock');
        }
    });

    onDestroy(() => {
        document.body.classList.remove('scroll-lock');
    })
</script>

<button class="likes-heading" onclick={() => {isOpen = true}}>{$_('reposted_users')}</button>

{#if (isOpen)}
    <RepostsModal {uri} on:close={handleClose}></RepostsModal>
{/if}

<style lang="postcss">
    .likes-heading {
        margin-top: 10px;

        &:hover {
            text-decoration: underline;
        }
    }
</style>