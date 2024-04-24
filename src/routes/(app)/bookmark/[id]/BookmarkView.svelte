<script lang="ts">
    import {agent, junkColumns} from '$lib/stores';
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import DeckRow from "../../DeckRow.svelte";

    export let _agent = $agent;
    export let id;

    if ($junkColumns.findIndex(_column => _column.id === 'bookmark_' + id) === -1) {
        junkColumns.set([...$junkColumns, {
            id: 'bookmark_' + id,
            algorithm: {
                list: id,
                type: 'bookmark',
                name: '',
            },
            style: 'default',
            settings: defaultDeckSettings,
            did: _agent.did(),
            handle: _agent.handle(),
            data: {
                feed: [],
                cursor: '',
            }
        }]);
    }
</script>

<DeckRow column={$junkColumns[$junkColumns.findIndex(_column => _column.id === 'bookmark_' + id)]} isJunk={true}></DeckRow>