<script lang="ts">
    import {agent} from '$lib/stores';
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {type JunkColumnDescriptor} from "$lib/junkColumn";
    import JunkColumn from "../../JunkColumn.svelte";

    let { _agent = $agent, id } = $props();
    const junkState = getColumnState(true);

    if (junkState.hasColumn('chat_' + id)) {
        const index = junkState.getColumnIndex('chat_' + id);
        junkState.columns[index].data = {
            feed: [],
            cursor: '',
        };
    }

    const descriptor: JunkColumnDescriptor = $derived({
        id: 'chat_' + id,
        algorithm: { id: id, type: 'chat', name: '' },
        did: _agent.did(),
        handle: _agent.handle(),
    });
</script>

<JunkColumn {descriptor}></JunkColumn>
