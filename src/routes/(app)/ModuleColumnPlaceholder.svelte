<script lang="ts">
    import Puzzle from '@lucide/svelte/icons/puzzle';
    import { _ } from 'svelte-i18n';
    import { getScopedColumnState } from '$lib/classes/columnState.svelte';

    interface Props {
        index: number;
    }

    let { index }: Props = $props();

    const columnState = getScopedColumnState();
    const column = $derived(columnState.getColumn(index));
</script>

<div class="module-column-placeholder">
    <Puzzle size={32} color="var(--text-color-3)"></Puzzle>
    <p class="module-column-placeholder__name">{column?.algorithm?.name ?? column?.algorithm?.type}</p>
    <p class="module-column-placeholder__text">{$_('module_column_disabled')}</p>
</div>

<style>
    .module-column-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 100%;
        min-height: 200px;
        padding: 16px;
        text-align: center;
    }

    .module-column-placeholder__name {
        font-weight: bold;
        color: var(--text-color-2);
    }

    .module-column-placeholder__text {
        font-size: 13px;
        color: var(--text-color-3);
    }
</style>
