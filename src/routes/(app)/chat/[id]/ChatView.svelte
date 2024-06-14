<script lang="ts">
    import {agent, junkColumns} from '$lib/stores';
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import DeckRow from "../../DeckRow.svelte";

    export let _agent = $agent;
    export let id;
    export let name;

    if ($junkColumns.findIndex(_column => _column.id === 'chat_' + id) === -1) {
        junkColumns.set([...$junkColumns, {
            id: 'chat_' + id,
            algorithm: {
                id: id,
                type: 'chat',
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
    } else {
        $junkColumns[$junkColumns.findIndex(_column => _column.id === 'chat_' + id)].data = {
            feed: [],
            cursor: '',
        };
        name = $junkColumns[$junkColumns.findIndex(_column => _column.id === 'chat_' + id)].algorithm.name;
    }
</script>

<DeckRow column={$junkColumns[$junkColumns.findIndex(_column => _column.id === 'chat_' + id)]} isJunk={true}></DeckRow>