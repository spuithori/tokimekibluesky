<script lang="ts">
    import NotificationTimeline from "./NotificationTimeline.svelte";
    import ThreadTimeline from "./ThreadTimeline.svelte";
    import ChatTimeline from "./ChatTimeline.svelte";
    import ChatListTimeline from "./ChatListTimeline.svelte";
    import ListTimeline from "./ListTimeline.svelte";
    import BookmarkTimeline from "./BookmarkTimeline.svelte";
    import MochottTimeline from "./MochottTimeline.svelte";
    import Timeline from "./Timeline.svelte";
    import ColumnAgentMissing from "$lib/components/column/ColumnAgentMissing.svelte";
    import { getColumnState } from "$lib/classes/columnState.svelte";

    interface Props {
        index: number;
        _agent: any;
        isJunk?: boolean;
        unique?: symbol;
        isSplit?: boolean;
        isTopScrolling?: boolean;
        onrefresh?: (event?: any) => void;
    }

    let {
        index,
        _agent,
        isJunk = false,
        unique,
        isSplit = false,
        isTopScrolling = false,
        onrefresh,
    }: Props = $props();

    const columnState = getColumnState(isJunk);
    const column = $derived(columnState.getColumn(index));
</script>

{#if _agent}
    {#if column?.algorithm?.type === 'notification'}
        <NotificationTimeline {index} {isJunk} {_agent} {unique} {isSplit}></NotificationTimeline>
    {:else if column?.algorithm?.type === 'thread'}
        {#key unique}
            <ThreadTimeline {index} {_agent} {isJunk}></ThreadTimeline>
        {/key}
    {:else if column?.algorithm?.type === 'chat'}
        <ChatTimeline {index} {_agent} {unique} {isJunk} {onrefresh} {isSplit}></ChatTimeline>
    {:else if column?.algorithm?.type === 'chatList'}
        <ChatListTimeline {index} {_agent} {unique} {isJunk} {onrefresh} {isSplit}></ChatListTimeline>
    {:else if column?.algorithm?.type === 'list'}
        {#key unique}
            <ListTimeline {index} {_agent} {isJunk} {unique} {isSplit}></ListTimeline>
        {/key}
    {:else if column?.algorithm?.type === 'bookmark'}
        <BookmarkTimeline {index} {_agent} {isJunk} {unique} {isSplit}></BookmarkTimeline>
    {:else if column?.algorithm?.type === 'mochottTimeline' || column?.algorithm?.type === 'networkFeed'}
        <MochottTimeline {index} {_agent} {isJunk} {unique} {isSplit}></MochottTimeline>
    {:else}
        <Timeline {index} {_agent} {isJunk} {unique} {isSplit} {isTopScrolling}></Timeline>
    {/if}
{:else}
    <ColumnAgentMissing {column}></ColumnAgentMissing>
{/if}
