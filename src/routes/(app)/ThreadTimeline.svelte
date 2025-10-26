<script lang="ts">
  import {onMount} from "svelte";
  import {_} from "svelte-i18n";
  import VirtualThreadList from "$lib/components/thread/VirtualThreadList.svelte";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";

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

  let rootIndex = $state<number>();
  let isMuted = $state(false);
  let isMuteDisplay = $state(false);

  let shouldShowMuteNotice = $derived(isMuted && !isMuteDisplay);

  function checkMutedStatus(feed: any): boolean {
    if (!feed) {
      return false;
    }

    if (feed.post?.author?.viewer?.muted) {
      return true;
    }

    if (feed.parent && checkMutedStatus(feed.parent)) {
      return true;
    }

    if (feed.replies?.length && checkMutedStatus(feed.replies[0])) {
      return true;
    }

    return false;
  }

  async function getFlatThread() {
    const uri = column.algorithm.algorithm;

    try {
      const raw = await _agent.agent.api.app.bsky.feed.getPostThread({uri: uri});
      const authorDid = raw.data.thread?.post?.author?.did;
      const transFormThread = transformThreadView(raw.data.thread);
      const sortedThread = sortThreadView(transFormThread, authorDid);
      const flatThread = sortedThread.flat(Infinity);

      column.data.feed = flatThread;
      isMuted = flatThread.some(feed => !feed.blocked && checkMutedStatus(feed));
      rootIndex = flatThread.findIndex(feed => feed.depth === 0);
    } catch (e) {
      console.error(e);
      column.data.feed = 'NotFound';
    }
  }

  function transformThreadView(threadView: any) {
    const result: any[] = [];

    function processPost(postObject: any, depth = 0, isRoot = false) {
      if (!postObject?.post) return;

      if (postObject.parent && isRoot) {
        processPost(postObject.parent, depth - 1, true);
      }

      result.push({depth, post: postObject.post});

      if (postObject.replies?.length > 0) {
        result.push(processReplies(postObject.replies, depth + 1));
      }
    }

    function processReplies(repliesArray: any[], depth: number) {
      const nestedReplies: any[] = [];

      for (const replyObject of repliesArray) {
        if (!replyObject?.post) continue;

        const currentReply = [{depth, post: replyObject.post}];
        nestedReplies.push(currentReply);

        if (replyObject.replies?.length > 0) {
          currentReply.push(processReplies(replyObject.replies, depth + 1));
        }
      }

      return nestedReplies;
    }

    processPost(threadView, 0, true);
    return result;
  }

  function createPostComparator(authorDid: string, depth: number) {
    return (a: any, b: any) => {
      function getPost(item: any) {
        return Array.isArray(item) ? item[0]?.post : item.post;
      }

      const postA = getPost(a);
      const postB = getPost(b);

      if (!postA || !postB) {
        return 0;
      }

      if (depth >= 1) {
        const aIsRootAuthor = postA.author.did === authorDid;
        const bIsRootAuthor = postB.author.did === authorDid;

        if (aIsRootAuthor !== bIsRootAuthor) {
          return aIsRootAuthor ? -1 : 1;
        }

        const dateA = new Date(postA.record.createdAt).getTime();
        const dateB = new Date(postB.record.createdAt).getTime();
        return dateB - dateA;
      }

      return 0;
    };
  }

  function sortThreadView(threadViewArray: any[], authorDid: string) {
    function recursiveSort(array: any, depth: number): any {
      if (!Array.isArray(array)) return array;

      if (depth <= 0) {
        return array.map(item =>
          Array.isArray(item) ? recursiveSort(item, depth + 1) : item
        );
      }

      const sorted = array.map(item =>
        Array.isArray(item) ? recursiveSort(item, depth + 1) : item
      );

      sorted.sort(createPostComparator(authorDid, depth));
      return sorted;
    }

    return recursiveSort(threadViewArray, 0);
  }

  function handleChangeProfile(did: string, handle: string) {
    column.did = did;
    column.handle = handle;
  }

  onMount(async () => {
    await getFlatThread();
  });
</script>

{#if shouldShowMuteNotice}
  <div class="thread-notice">
    <p class="thread-notice__text">{$_('muted_user_thread')}</p>

    <button class="button button--sm" onclick={() => {isMuteDisplay = true}}>{$_('show_button')}</button>
  </div>
{/if}

{#if !column.data.feed.length}
  <LoadingSpinner></LoadingSpinner>
{:else if (column.data.feed === 'NotFound')}
  <p class="thread-error">{$_('error_thread_notfound')}</p>
{:else}
  <VirtualThreadList {_agent} {column} {rootIndex} onchangeprofile={handleChangeProfile} {isJunk}></VirtualThreadList>
{/if}
