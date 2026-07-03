<script lang="ts">
    import {agent} from "$lib/stores";
    import {onMount} from "svelte";
    import {getDidByHandle, isDid} from "$lib/util";
    import {type JunkColumnDescriptor} from "$lib/junkColumn";
    import JunkColumn from "../../../../JunkColumn.svelte";

    interface Props {
      id: any;
      handle: any;
      title?: string;
      _agent?: any;
    }

    let { id, handle = $bindable(), title = '', _agent = $agent }: Props = $props();
    let ready = $state(false);

    onMount(async () => {
        if (!isDid(handle)) {
            handle = await getDidByHandle(handle, _agent);
        }
        ready = true;
    });

    const descriptor: JunkColumnDescriptor = $derived({
        id: `thread_${id}`,
        algorithm: {
            algorithm: 'at://' + handle + '/app.bsky.feed.post/' + id,
            type: 'thread',
            name: 'Thread',
        },
        did: _agent.did(),
        handle: _agent.handle(),
    });
</script>

{#if ready}
  {#key _agent}
    <JunkColumn {descriptor} name={title} {_agent}></JunkColumn>
  {/key}
{/if}
