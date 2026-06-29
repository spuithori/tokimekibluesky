<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import Columns3 from '@lucide/svelte/icons/columns-3';
    import RectangleVertical from '@lucide/svelte/icons/rectangle-vertical';
</script>

<div class="layout-radio-group">
    <div class="layout-radio" class:layout-radio--current={settingsStore.design.layout === 'decks'}>
        <input type="radio" bind:group={settingsStore.design.layout} id="layoutDecks" name="layout" value={'decks'} />
        <label for="layoutDecks">
            <Columns3 size="22" color="var(--radio-current-color)"></Columns3>
            {$_('layout_decks')}
        </label>
    </div>

    <div class="layout-radio" class:layout-radio--current={settingsStore.design.layout === 'default'}>
        <input type="radio" bind:group={settingsStore.design.layout} id="layoutDefault" name="layout" value={'default'} />
        <label for="layoutDefault">
            <RectangleVertical size="22" color="var(--radio-current-color)"></RectangleVertical>
            {$_('layout_single')}
        </label>
    </div>
</div>
