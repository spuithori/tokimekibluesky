<script lang="ts">
    import {agent} from '$lib/stores';
    import {type JunkColumnDescriptor} from "$lib/junkColumn";
    import JunkColumn from "../../JunkColumn.svelte";

    let { _agent = $agent, id } = $props();

    const descriptor: JunkColumnDescriptor = $derived({
        id: 'cloud_bookmark_' + id,
        algorithm: { algorithm: id, type: 'cloudBookmark', name: '' },
        did: _agent.did(),
        handle: _agent.handle(),
    });
</script>

<JunkColumn {descriptor}></JunkColumn>
