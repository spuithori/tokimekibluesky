<script lang="ts">
    import {_} from "svelte-i18n";
    import {type JunkColumnDescriptor} from "$lib/junkColumn";
    import JunkColumn from "../../../routes/(app)/JunkColumn.svelte";
    import {agent} from "$lib/stores";

    interface Props {
        _agent?: any;
    }

    let { _agent = $agent }: Props = $props();

    const descriptor: JunkColumnDescriptor = $derived({
        id: `notifications_${_agent.did()}`,
        algorithm: {
            type: 'notification',
            name: $_('notifications'),
        },
        did: _agent.did(),
        handle: _agent.handle(),
    });
</script>

<JunkColumn {descriptor} {_agent} removeOnDestroy={true}></JunkColumn>
