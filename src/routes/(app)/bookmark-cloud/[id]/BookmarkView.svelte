<script lang="ts">
    import {agent} from '$lib/stores';
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import DeckRow from "../../DeckRow.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    let { _agent = $agent, id } = $props();
    const columnState = getColumnState(true);

    if (!columnState.hasColumn('cloud_bookmark_' + id)) {
        columnState.add({
            id: 'cloud_bookmark_' + id,
            algorithm: {
                algorithm: id,
                type: 'cloudBookmark',
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

<DeckRow index={columnState.getColumnIndex('cloud_bookmark_' + id)} isJunk={true}></DeckRow>