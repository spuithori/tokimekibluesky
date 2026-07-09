<script lang="ts">
    import { agent } from '$lib/stores';
    import { appState } from '$lib/classes/appState.svelte';
    import { getColumnState } from '$lib/classes/columnState.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { syncPinnedFeedTabs } from '$lib/feedTabsSync';

    const columnState = getColumnState();
    let reconciled: string | null = null;

    $effect(() => {
        const want = riceState.compiled.layout?.feedTabs ?? null;
        if (!want) {
            reconciled = null;
            return;
        }
        if (!appState.ready || !$agent || !columnState.isColumnsLoaded) return;
        const key = `${appState.profile.current}:${want}`;
        const node = columnState.findPinnedFeedTabs();
        if (node) {
            if (reconciled !== key) {
                reconciled = key;
                syncPinnedFeedTabs(columnState, node, $agent);
            }
            return;
        }
        if (reconciled === key) return;
        reconciled = key;
        runCommand('column.feedtabs');
    });
</script>
