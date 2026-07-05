<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { settingsStore } from '$lib/settings/settings.svelte';
</script>

<div class="icons-radio-group">
    <div class="icons-radio">
        <input type="radio" bind:group={settingsStore.design.externalLayout} id="externalLayoutDefault" name="external_layout" value={'normal'} />
        <label for="externalLayoutDefault"><span class="icons-radio__ui">
        <svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75"><g id="グループ_119" data-name="グループ 119" transform="translate(-663 -536)"><g class="icons-radio__g" id="長方形_142" data-name="長方形 142" transform="translate(663 536)" fill="var(--bg-color-1)" stroke="var(--border-color-1)" stroke-width="1"><rect width="75" height="75" rx="4" stroke="none"/><rect x="0.5" y="0.5" width="74" height="74" rx="3.5" fill="none"/></g><rect class="icons-radio__r" id="長方形_144" data-name="長方形 144" width="57" height="31" rx="4" transform="translate(672 545)" fill="var(--border-color-2)"/><rect class="icons-radio__r" id="長方形_144-2" data-name="長方形 144" width="57" height="7" rx="3.5" transform="translate(672 580)" fill="var(--border-color-2)"/><rect class="icons-radio__r" id="長方形_144-3" data-name="長方形 144" width="57" height="3" rx="1.5" transform="translate(672 591)" fill="var(--border-color-2)"/><rect class="icons-radio__r" id="長方形_144-4" data-name="長方形 144" width="57" height="3" rx="1.5" transform="translate(672 598)" fill="var(--border-color-2)"/></g></svg></span>{$_('default')}</label>
    </div>

    <div class="icons-radio">
        <input type="radio" bind:group={settingsStore.design.externalLayout} id="externalLayoutCompact" name="external_layout" value={'compact'} />
        <label for="externalLayoutCompact"><span class="icons-radio__ui">
        <svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75"><g id="グループ_119" data-name="グループ 119" transform="translate(-663 -536)"><g class="icons-radio__g" id="長方形_142" data-name="長方形 142" transform="translate(663 536)" fill="var(--bg-color-1)" stroke="var(--border-color-1)" stroke-width="1"><rect width="75" height="75" rx="4" stroke="none"/><rect x="0.5" y="0.5" width="74" height="74" rx="3.5" fill="none"/></g><rect class="icons-radio__r" id="長方形_144" data-name="長方形 144" width="57" height="7" rx="3.5" transform="translate(672 563)" fill="var(--border-color-2)"/><rect class="icons-radio__r" id="長方形_144-2" data-name="長方形 144" width="57" height="3" rx="1.5" transform="translate(672 574)" fill="var(--border-color-2)"/><rect class="icons-radio__r" id="長方形_144-3" data-name="長方形 144" width="57" height="3" rx="1.5" transform="translate(672 581)" fill="var(--border-color-2)"/></g></svg></span>{$_('compact')}</label>
    </div>
</div>
