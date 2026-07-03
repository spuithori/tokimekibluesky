<script lang="ts">
    import NotificationTimeline from "./NotificationTimeline.svelte";
    import ThreadTimeline from "./ThreadTimeline.svelte";
    import ChatTimeline from "./ChatTimeline.svelte";
    import ChatListTimeline from "./ChatListTimeline.svelte";
    import ListTimeline from "./ListTimeline.svelte";
    import BookmarkTimeline from "./BookmarkTimeline.svelte";
    import MochottTimeline from "./MochottTimeline.svelte";
    import Timeline from "./Timeline.svelte";
    import PublishColumn from "./PublishColumn.svelte";
    import SettingsColumn from "./SettingsColumn.svelte";
    import ColumnAgentMissing from "$lib/components/column/ColumnAgentMissing.svelte";
    import { getScopedColumnState } from "$lib/classes/columnState.svelte";

    interface Props {
        index: number;
        _agent: any;
        unique?: symbol;
        isSplit?: boolean;
        isTopScrolling?: boolean;
        onrefresh?: (event?: any) => void;
    }

    let {
        index,
        _agent,
        unique,
        isSplit = false,
        isTopScrolling = false,
        onrefresh,
    }: Props = $props();

    const columnState = getScopedColumnState();
    const column = $derived(columnState.getColumn(index));
</script>

{#if column?.algorithm?.type === 'publish'}
    <PublishColumn {index}></PublishColumn>
{:else if column?.algorithm?.type === 'settings'}
    <SettingsColumn {index}></SettingsColumn>
{:else if _agent}
    {#if column?.algorithm?.type === 'notification'}
        <NotificationTimeline {index} {_agent} {unique} {isSplit}></NotificationTimeline>
    {:else if column?.algorithm?.type === 'thread'}
        {#key unique}
            <ThreadTimeline {index} {_agent}></ThreadTimeline>
        {/key}
    {:else if column?.algorithm?.type === 'chat'}
        <ChatTimeline {index} {_agent} {unique} {onrefresh} {isSplit}></ChatTimeline>
    {:else if column?.algorithm?.type === 'chatList'}
        <ChatListTimeline {index} {_agent} {unique} {onrefresh} {isSplit}></ChatListTimeline>
    {:else if column?.algorithm?.type === 'list'}
        {#key unique}
            <ListTimeline {index} {_agent} {unique} {isSplit}></ListTimeline>
        {/key}
    {:else if column?.algorithm?.type === 'bookmark'}
        <BookmarkTimeline {index} {_agent} {unique} {isSplit}></BookmarkTimeline>
    {:else if column?.algorithm?.type === 'mochottTimeline' || column?.algorithm?.type === 'networkFeed'}
        <MochottTimeline {index} {_agent} {unique} {isSplit}></MochottTimeline>
    {:else}
        <Timeline {index} {_agent} {unique} {isSplit} {isTopScrolling}></Timeline>
    {/if}
{:else}
    <ColumnAgentMissing {column}></ColumnAgentMissing>
{/if}
