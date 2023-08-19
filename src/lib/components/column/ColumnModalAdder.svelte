<script lang="ts">
    import {bookmarkModal, feedsModal, listModal} from "$lib/stores";
    import {_} from "svelte-i18n";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
</script>

<div class="column-add-buttons">
  <button class="column-add-button" on:click={() => {listModal.set({open: true, data: undefined })}}>{$_('create_list')}</button>
  <button class="column-add-button" on:click={() => {bookmarkModal.set({open: true, data: undefined})}}>{$_('create_bookmark')}</button>
  <button class="column-add-button" on:click={() => {$feedsModal.open = true}}>{$_('open_feed_store')}</button>
  <!-- <button class="column-add-button" on:click={addEmptyRealtimeSearch}>{$_('add_realtime_search')}</button> -->
</div>

<style lang="postcss">
    .column-add-buttons {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        margin-top: 15px;

        @media (max-width: 767px) {
            gap: 10px;
        }
    }

    .column-add-button {
        display: grid;
        place-content: center;
        height: 40px;
        width: 100%;
        background-color: var(--bg-color-1);
        box-shadow: 0 0 10px var(--box-shadow-color-1);
        border-radius: 6px;
        font-weight: 600;
        color: var(--text-color-1);

        @media (max-width: 767px) {
            font-size: 12px;
            letter-spacing: -.05em;
        }
    }
</style>