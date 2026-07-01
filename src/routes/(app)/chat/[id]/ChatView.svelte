<script lang="ts">
    import {agent} from '$lib/stores';
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import DeckSlot from "../../DeckSlot.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    let { _agent = $agent, id } = $props();
    const columnState = getColumnState(true);

    if (!columnState.hasColumn('chat_' + id)) {
        columnState.add({
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
        });
    } else {
        const index = columnState.getColumnIndex('chat_' + id);
        columnState.columns[index].data = {
            feed: [],
            cursor: '',
        };
    }
</script>

<DeckSlot index={columnState.getColumnIndex('chat_' + id)} isJunk={true}></DeckSlot>