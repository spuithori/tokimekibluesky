<script lang="ts">
    import {_} from "svelte-i18n";
    import RepostsModal from "$lib/components/thread/RepostsModal.svelte";

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

<button class="likes-heading" onclick={() => {isOpen = true}}>{$_('reposted_users')}</button>

{#if (isOpen)}
    <RepostsModal {uri} {_agent} on:close={handleClose}></RepostsModal>
{/if}

<style lang="postcss">
    .likes-heading {
        margin-top: 10px;

        &:hover {
            text-decoration: underline;
        }
    }
</style>