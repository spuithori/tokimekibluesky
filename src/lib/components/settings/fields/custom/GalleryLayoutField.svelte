<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { settingsStore } from '$lib/settings/settings.svelte';
</script>

<div class="icons-radio-group">
    <div class="icons-radio">
        <input type="radio" bind:group={settingsStore.design.galleryLayout} id="galleryLayoutGrid" name="gallery_layout" value={'grid'} />
        <label for="galleryLayoutGrid"><span class="icons-radio__ui"><svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75"><g class="icons-radio__g" fill="var(--bg-color-1)" stroke="var(--border-color-1)"><rect width="75" height="75" rx="4" stroke="none"/><rect x=".5" y=".5" width="74" height="74" rx="3.5" fill="none"/></g><g fill="var(--border-color-2)"><rect class="icons-radio__r" width="26" height="18" rx="3" transform="translate(11 12)"/><rect class="icons-radio__r" width="26" height="18" rx="3" transform="translate(40 12)"/><rect class="icons-radio__r" width="26" height="18" rx="3" transform="translate(11 33)"/><rect class="icons-radio__r" width="26" height="18" rx="3" transform="translate(40 33)"/><rect class="icons-radio__r" width="26" height="18" rx="3" transform="translate(11 54)"/><rect class="icons-radio__r" width="26" height="18" rx="3" transform="translate(40 54)"/></g></svg></span>{$_('gallery_layout_grid')}</label>
    </div>

    <div class="icons-radio">
        <input type="radio" bind:group={settingsStore.design.galleryLayout} id="galleryLayoutCarousel" name="gallery_layout" value={'carousel'} />
        <label for="galleryLayoutCarousel"><span class="icons-radio__ui"><svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75"><g class="icons-radio__g" fill="var(--bg-color-1)" stroke="var(--border-color-1)"><rect width="75" height="75" rx="4" stroke="none"/><rect x=".5" y=".5" width="74" height="74" rx="3.5" fill="none"/></g><g fill="var(--border-color-2)"><rect class="icons-radio__r" width="44" height="34" rx="3" transform="translate(15 16)"/><circle class="icons-radio__r" cx="29" cy="60" r="3"/><circle class="icons-radio__r" cx="37.5" cy="60" r="3"/><circle class="icons-radio__r" cx="46" cy="60" r="3"/></g></svg></span>{$_('gallery_layout_carousel')}</label>
    </div>
</div>
