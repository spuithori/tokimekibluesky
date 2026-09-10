<script lang="ts">
  import {onDestroy, onMount} from "svelte";
  import {SvelteMap, SvelteSet} from "svelte/reactivity";
  import {_} from "tokimeki-i18n";
  import ThreadList from "$lib/components/thread/ThreadList.svelte";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {settings} from "$lib/stores";
  import {createThreadOpener} from "$lib/components/thread/threadNav";
  import {
    flattenThreadV2,
    normalizeThreadSort,
    spliceThreadReplies,
    THREAD_BELOW,
    THREAD_BRANCHING_FACTOR,
  } from "$lib/components/thread/threadV2";
  import {buildThreadRows, type FoldMode, type ThreadFoldRow, type ThreadReadMoreRow} from "$lib/components/thread/threadRows";

  interface Props {
    index: any;
    _agent?: any;
    isJunk?: boolean;
  }

  let {
    index,
    _agent,
    isJunk = false,
  }: Props = $props();

  const columnState = getColumnState(isJunk);
  const column = columnState.getColumn(index);
  const openThread = createThreadOpener();

  let hasOtherReplies = $state(false);
  let isOtherShown = $state(false);
  let isOtherLoading = $state(false);
  const expanding = new SvelteSet<string>();
  const folds = new SvelteMap<string, FoldMode>();

  const view = $derived($settings.design?.threaded ? 'tree' : 'linear');
  const built = $derived(buildThreadRows(
    columnState.getFeed(column.id),
    { folds, hasOtherReplies, otherShown: isOtherShown },
    view,
  ));

  const abort = new AbortController();

  onDestroy(() => {
    abort.abort();
  });

  function sort() {
    return normalizeThreadSort($settings.timeline?.threadSort);
  }

  async function getFlatThread() {
    const columnId = column.id;
    columnState.clearFeedStatus(columnId);

    try {
      const res = await _agent.xrpc.get('app.bsky.unspecced.getPostThreadV2', {
        anchor: column.algorithm.algorithm,
        above: true,
        below: THREAD_BELOW,
        branchingFactor: THREAD_BRANCHING_FACTOR,
        sort: sort(),
      }, { signal: abort.signal });

      if (abort.signal.aborted) {
        return;
      }

      const flatThread = flattenThreadV2(res.thread);

      if (!flatThread.some(item => item.post)) {
        columnState.setFeedStatus(columnId, 'NotFound');
        return;
      }

      columnState.setFeed(columnId, flatThread);
      hasOtherReplies = res.hasOtherReplies === true;
    } catch (e) {
      if (abort.signal.aborted) {
        return;
      }

      console.error(e);
      columnState.setFeedStatus(columnId, 'NotFound');
    }
  }

  async function showOtherReplies() {
    if (isOtherLoading || isOtherShown) {
      return;
    }

    const columnId = column.id;
    isOtherLoading = true;

    try {
      const res = await _agent.xrpc.get('app.bsky.unspecced.getPostThreadOtherV2', {
        anchor: column.algorithm.algorithm,
      }, { signal: abort.signal });

      if (abort.signal.aborted) {
        return;
      }

      const feed = columnState.getFeed(columnId);
      const known = new Set(feed.map(item => item.uri));
      const others = flattenThreadV2(res.thread).filter(item => !known.has(item.uri));

      if (others.length) {
        columnState.setFeed(columnId, feed.concat(others));
      }

      isOtherShown = true;
    } catch (e) {
      if (!abort.signal.aborted) {
        console.error(e);
      }
    } finally {
      isOtherLoading = false;
    }
  }

  async function expandReplies(row: ThreadReadMoreRow) {
    if (expanding.has(row.uri)) {
      return;
    }

    const columnId = column.id;
    expanding.add(row.uri);

    try {
      const res = await _agent.xrpc.get('app.bsky.unspecced.getPostThreadV2', {
        anchor: row.uri,
        above: false,
        below: row.depth < THREAD_BELOW ? THREAD_BELOW - row.depth : THREAD_BELOW,
        branchingFactor: THREAD_BRANCHING_FACTOR,
        sort: sort(),
      }, { signal: abort.signal });

      if (abort.signal.aborted) {
        return;
      }

      const replies = flattenThreadV2(res.thread, { depthOffset: row.depth, skipAnchor: true });
      columnState.setFeed(columnId, spliceThreadReplies(columnState.getFeed(columnId), row.uri, replies));
    } catch (e) {
      if (!abort.signal.aborted) {
        console.error(e);
      }
    } finally {
      expanding.delete(row.uri);
    }
  }

  function handleFold(row: ThreadFoldRow) {
    if (row.mode === 'side') {
      folds.set(row.uri, 'none');
    } else if (row.mode === 'open') {
      folds.set(row.uri, 'side');
    } else {
      folds.delete(row.uri);
    }
  }

  function handleCollapse(uri: string) {
    folds.set(uri, 'all');
  }

  function handleOpen(post: any) {
    openThread({post}, _agent);
  }

  onMount(async () => {
    column.did = _agent.did();
    column.handle = _agent.handle();
    await getFlatThread();
  });
</script>

{#if columnState.getFeedStatus(column.id) === 'NotFound'}
  <p class="thread-error">{$_('error_thread_notfound')}</p>
{:else if !built.rows.length}
  <LoadingSpinner></LoadingSpinner>
{:else}
  <ThreadList
      rows={built.rows}
      anchorIndex={built.anchorIndex}
      {column}
      feed={columnState.getFeed(column.id)}
      {_agent}
      {isJunk}
      {expanding}
      {isOtherLoading}
      onfold={handleFold}
      oncollapse={handleCollapse}
      onreadmore={expandReplies}
      onopen={handleOpen}
      onshowother={showOtherReplies}
  ></ThreadList>
{/if}
