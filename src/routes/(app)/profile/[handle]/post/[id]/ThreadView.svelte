<script lang="ts">
    import {agent, didHint, junkColumns} from "$lib/stores";
    import {onMount} from "svelte";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import DeckRow from "../../../../DeckRow.svelte";
    import {getDidByHandle, isDid} from "$lib/util";

    export let id;
    export let handle;
    export let title = '';

    let feed;

    onMount(async () => {
        if ($didHint) {
            const _did = $didHint;
            didHint.set('');
            handle = _did;
        }

        if (!isDid(handle)) {
            handle = await getDidByHandle(handle, $agent);
        }

        if ($junkColumns.findIndex(_column => _column.id === 'thread_' + id) === -1) {
            junkColumns.set([...$junkColumns, {
                id: 'thread_' + id,
                algorithm: {
                    algorithm: 'at://' + handle + '/app.bsky.feed.post/' + id,
                    type: 'thread',
                    name: 'Thread',
                },
                style: 'default',
                settings: defaultDeckSettings,
                did: $agent.did(),
                handle: $agent.handle(),
                data: {
                    feed: [],
                    cursor: '',
                }
            }]);

            console.log($junkColumns);
        }
    })
</script>

{#if ($junkColumns.findIndex(_column => _column.id === 'thread_' + id) !== -1)}
  <DeckRow column={$junkColumns[$junkColumns.findIndex(_column => _column.id === 'thread_' + id)]} isJunk={true} name={title}></DeckRow>
{/if}
