<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { settingsStore } from '$lib/settings/settings.svelte';
</script>

<div class="icons-radio-group">
    <div class="icons-radio">
        <input type="radio" bind:group={settingsStore.design.postsImageLayout} id="postsImageLayoutDefault" name="posts_image_layout" value={'default'} />
        <label for="postsImageLayoutDefault"><span class="icons-radio__ui"><svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75"><g data-name="グループ 119" transform="translate(-663 -536)"><g class="icons-radio__g" data-name="長方形 142" transform="translate(663 536)" fill="var(--bg-color-1)" stroke="var(--border-color-1)"><rect width="75" height="75" rx="4" stroke="none"/><rect x=".5" y=".5" width="74" height="74" rx="3.5" fill="none"/></g><rect class="icons-radio__r" data-name="長方形 144" width="26" height="26" rx="4" transform="translate(672 545)" fill="var(--border-color-2)"/><rect class="icons-radio__r" data-name="長方形 147" width="26" height="26" rx="4" transform="translate(672 576)" fill="var(--border-color-2)"/><rect class="icons-radio__r" data-name="長方形 145" width="26" height="26" rx="4" transform="translate(703 545)" fill="var(--border-color-2)"/><rect class="icons-radio__r" data-name="長方形 146" width="26" height="26" rx="4" transform="translate(703 576)" fill="var(--border-color-2)"/></g></svg></span>{$_('default')}</label>
    </div>

    <div class="icons-radio">
        <input type="radio" bind:group={settingsStore.design.postsImageLayout} id="postsImageLayoutCompact" name="posts_image_layout" value={'compact'} />
        <label for="postsImageLayoutCompact"><span class="icons-radio__ui"><svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75"><g data-name="グループ 120"><g class="icons-radio__g" data-name="長方形 148" fill="var(--bg-color-1)" stroke="var(--border-color-1)"><rect width="75" height="75" rx="4" stroke="none"/><rect x=".5" y=".5" width="74" height="74" rx="3.5" fill="none"/></g><g data-name="グループ 115" transform="translate(-756 -516)" fill="var(--border-color-2)"><rect class="icons-radio__r" data-name="長方形 151" width="14" height="14" rx="2" transform="translate(763 547)"/><rect class="icons-radio__r" data-name="長方形 152" width="14" height="14" rx="2" transform="translate(779 547)"/><rect class="icons-radio__r" data-name="長方形 153" width="14" height="14" rx="2" transform="translate(795 547)"/><rect class="icons-radio__r" data-name="長方形 154" width="14" height="14" rx="2" transform="translate(811 547)"/></g></g></svg></span>{$_('compact')}</label>
    </div>

    <div class="icons-radio">
        <input type="radio" bind:group={settingsStore.design.postsImageLayout} id="postsImageLayoutMinimum" name="posts_image_layout" value={'folding'} />
        <label for="postsImageLayoutMinimum"><span class="icons-radio__ui"><svg xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 75 75"><g data-name="グループ 121"><g class="icons-radio__g" data-name="長方形 148" fill="var(--bg-color-1)" stroke="var(--border-color-1)"><rect width="75" height="75" rx="4" stroke="none"/><rect x=".5" y=".5" width="74" height="74" rx="3.5" fill="none"/></g><g data-name="グループ 115" transform="translate(-737 -520)"><rect class="icons-radio__r" data-name="長方形 151" width="24" height="6" rx="2" transform="translate(763 555)" fill="var(--border-color-2)"/></g></g></svg></span>{$_('folding')}</label>
    </div>
</div>
