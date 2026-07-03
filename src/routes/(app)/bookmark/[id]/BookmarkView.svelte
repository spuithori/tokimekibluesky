<script lang="ts">
    import {agent} from '$lib/stores';
    import {type JunkColumnDescriptor} from "$lib/junkColumn";
    import JunkColumn from "../../JunkColumn.svelte";

    let { _agent = $agent, id } = $props();

    const descriptor: JunkColumnDescriptor = $derived({
        id: 'bookmark_' + id,
        algorithm: { list: id, type: 'bookmark', name: '' },
        did: _agent.did(),
        handle: _agent.handle(),
    });
</script>

<JunkColumn {descriptor}></JunkColumn>
