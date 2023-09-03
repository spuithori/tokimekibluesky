<script lang="ts">
    import { agent } from '$lib/stores';
    import {createEventDispatcher} from 'svelte';
    import toast from 'svelte-french-toast';
    import { _ } from 'svelte-i18n';
    import FeedsStoreIndex from "$lib/components/feeds/FeedsStoreIndex.svelte";
    const dispatch = createEventDispatcher();

    export let _agent = $agent;

    async function save () {
        try {
            dispatch('close', {
                clear: false,
            });
        } catch (e) {
            toast.error('Error: ' + e);
        }
    }
</script>

<div class="modal">
  <div class="modal-contents">
    <h2 class="modal-title">{$_('feeds_add_management')}</h2>

    <FeedsStoreIndex on:close={save}></FeedsStoreIndex>

    <div class="feeds-modal-close">
      <button class="button button--sm" on:click={save}>{$_('close_button')}</button>
    </div>
  </div>

  <button class="modal-background-close" aria-hidden="true" on:click={save}></button>
</div>

<style lang="postcss">
    .feeds-modal-close {
        text-align: center;
        margin-top: 20px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
    }
</style>