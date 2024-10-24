<script lang="ts">
    import {agent, didHint} from "$lib/stores";
    import {onMount} from "svelte";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import DeckRow from "../../../../DeckRow.svelte";
    import {getDidByHandle, isDid} from "$lib/util";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    interface Props {
      id: any;
      handle: any;
      title?: string;
    }

    let { id, handle = $bindable(), title = '' }: Props = $props();
    const columnState = getColumnState(true);

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

        if (!columnState.hasColumn('thread_' + id)) {
            columnState.add({
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
            });
        }
    })
</script>

<DeckRow index={columnState.getColumnIndex('thread_' + id)} isJunk={true} name={title}></DeckRow>
