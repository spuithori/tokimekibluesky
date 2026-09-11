<script lang="ts">
  import ThreadPost from '$lib/components/thread/ThreadPost.svelte';
  import ThreadTombstone from '$lib/components/thread/ThreadTombstone.svelte';
  import ThreadFoldRow from '$lib/components/thread/ThreadFoldRow.svelte';
  import ThreadReadMoreRow from '$lib/components/thread/ThreadReadMoreRow.svelte';
  import ThreadShowOtherRow from '$lib/components/thread/ThreadShowOtherRow.svelte';
  import type {ThreadRow as ThreadRowModel, ThreadFoldRow as FoldRow, ThreadReadMoreRow as ReadMoreRow} from '$lib/components/thread/threadRows';

  let {
    row,
    column,
    feed,
    _agent,
    expanding,
    isOtherLoading = false,
    onfold,
    oncollapse,
    onreadmore,
    onopen,
    onshowother,
  }: {
    row: ThreadRowModel;
    column: any;
    feed: any[];
    _agent: any;
    expanding?: { has(uri: string): boolean };
    isOtherLoading?: boolean;
    onfold: (row: FoldRow) => void;
    oncollapse: (uri: string) => void;
    onreadmore: (row: ReadMoreRow) => void;
    onopen: (post: any) => void;
    onshowother: () => void;
  } = $props();
</script>

{#if row.kind === 'post'}
  <ThreadPost {row} {column} {feed} {_agent} {oncollapse}></ThreadPost>
{:else if row.kind === 'tombstone'}
  <ThreadTombstone {row} {oncollapse}></ThreadTombstone>
{:else if row.kind === 'fold'}
  <ThreadFoldRow {row} {onfold} {oncollapse}></ThreadFoldRow>
{:else if row.kind === 'readMore' || row.kind === 'readMoreUp'}
  <ThreadReadMoreRow {row} loading={row.kind === 'readMore' && !!expanding?.has(row.uri)} {onreadmore} {onopen} {oncollapse}></ThreadReadMoreRow>
{:else if row.kind === 'showOther'}
  <ThreadShowOtherRow {row} loading={isOtherLoading} {onshowother} {oncollapse}></ThreadShowOtherRow>
{/if}
