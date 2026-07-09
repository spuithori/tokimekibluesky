<script lang="ts">
    import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
    import { _ } from 'tokimeki-i18n';

    let { id }: { id: string } = $props();
</script>

<span class="rice-bar-item-error" data-testid="rice-bar-item-error" data-item={id} title={$_('rice_bar_item_error', { id })}>
    <TriangleAlert size={16} color="var(--danger-color)"></TriangleAlert>
</span>

<style>
    .rice-bar-item-error {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 2px;
    }
</style>
