<script lang="ts">
    import {_} from "svelte-i18n";
    import {onDestroy, onMount} from "svelte";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import DeckRow from "../../../routes/(app)/DeckRow.svelte";
    import {agent} from "$lib/stores";

    let { _agent = $agent }: Props = $props();

    const columnState = getColumnState(true);
    let columnId = $derived(`notifications_${_agent.did()}`);

    onMount(async () => {
        if (!columnState.hasColumn(columnId)) {
            columnState.add({
                id: columnId,
                algorithm: {
                    type: 'notification',
                    name: $_('notifications'),
                },
                style: 'default',
                settings: defaultDeckSettings,
                did: _agent.did(),
                handle: _agent.handle(),
                data: {
                    feed: [],
                    cursor: '',
                }
            });
        }
    });

    onDestroy(() => {
        columnState.remove(columnId);
    });
</script>

{#if (columnState.hasColumn(columnId))}
  <DeckRow index={columnState.getColumnIndex(columnId)} isJunk={true} {_agent}></DeckRow>
{/if}