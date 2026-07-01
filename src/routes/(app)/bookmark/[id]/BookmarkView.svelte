<script lang="ts">
    import {agent} from '$lib/stores';
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import DeckSlot from "../../DeckSlot.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    let { _agent = $agent, id } = $props();
    const columnState = getColumnState(true);

    if (!columnState.hasColumn('bookmark_' + id)) {
        columnState.add( {
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
        });
    }
</script>

<DeckSlot index={columnState.getColumnIndex('bookmark_' + id)} isJunk={true}></DeckSlot>