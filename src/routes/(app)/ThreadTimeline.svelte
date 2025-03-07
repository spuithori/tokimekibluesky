<script lang="ts">
  import {settings} from '$lib/stores';
  import spinner from '$lib/images/loading.svg';
  import Thread from './profile/[handle]/post/[id]/Thread.svelte';
  import {onMount} from "svelte";
  import {_} from "svelte-i18n";
  import VirtualThreadList from "$lib/components/thread/VirtualThreadList.svelte";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";

  interface Props {
    column: any;
    index: any;
    _agent?: any;
    isRefreshing: any;
    isJunk?: boolean;
  }

  let {
    column = $bindable(),
    index,
    _agent,
    isRefreshing = $bindable(),
    isJunk = false
  }: Props = $props();

  let scrollTop: undefined | Number = $state(undefined);
  let rootClientHeight = $state(0);
  let rootIndex = $state();

  let isMuted: boolean = $state(false);
  let isMuteDisplay: boolean = $state(false);

  function isMutedIncludes(feed) {
      isMuted = feed.post?.author?.viewer?.muted;

      if (feed.parent && !isMuted) {
          isMutedIncludes(feed.parent);
      }

      if (feed.replies?.length && !isMuted) {
          isMutedIncludes(feed.replies[0]);
      }
  }

  async function getPostThread() {
      isRefreshing = true;
      const uri = column.algorithm.algorithm;

      try {
          const raw = await _agent.agent.api.app.bsky.feed.getPostThread({uri: uri});
          column.data.feed = [ raw.data.thread ];

          column.data.feed.forEach(feed => {
              if (!feed.blocked) {
                  isMutedIncludes(feed);
              }
          });

          if (isJunk) {
              scrollTop = $settings.design.layout === 'decks' ? document.querySelector('.modal-page-content').scrollTop : document.querySelector(':root').scrollTop;
          }
      } catch (e) {
          column.data.feed = 'NotFound';
      }

      isRefreshing = false;
  }

  async function getFlatThread() {
      const uri = column.algorithm.algorithm;

      try {
          const raw = await _agent.agent.api.app.bsky.feed.getPostThread({uri: uri});
          const authorDid = raw.data.thread?.post?.author?.did;
          const transFormThread = transformThreadView(raw.data.thread);
          const sortedThread = sortThreadView(transFormThread, authorDid);

          column.data.feed = sortedThread.flat(Infinity);
          column.data.feed.forEach(feed => {
              if (!feed.blocked) {
                  isMutedIncludes(feed);
              }
          });
          rootIndex = sortedThread.flat(Infinity).findIndex(feed => feed.depth === 0);
      } catch (e) {
          console.error(e);
          column.data.feed = 'NotFound';
      }
  }

  function transformThreadView(threadView) {
    const result = [];

    function processPost(postObject, depth = 0, isRoot = false) {
      if (!postObject || !postObject.post) {
        return;
      }

      const post = postObject.post;

      if (postObject.parent && isRoot) {
        processPost(postObject.parent, depth - 1, true);
      }

      result.push({ depth: depth, post: post });

      if (postObject.replies && postObject.replies.length > 0) {
        result.push(processReplies(postObject.replies, depth + 1));
      }
    }

    function processReplies(repliesArray, depth) {
      const nestedReplies = [];

      for (const replyObject of repliesArray) {
        if (!replyObject || !replyObject.post) {
          continue;
        }

        const currentReply = [{ depth: depth, post: replyObject.post }];
        nestedReplies.push(currentReply);

        if (replyObject.replies && replyObject.replies.length > 0) {
          currentReply.push(processReplies(replyObject.replies, depth + 1));
        }
      }

      return nestedReplies;
    }

    processPost(threadView, 0, true);
    return result;
  }

  function sortThreadView(threadViewArray, authorDid) {
    function comparePosts(a, b, depth) {
      function getPost(item) {
        if (Array.isArray(item)) {
          return item[0]?.post;
        }
        return item.post;
      }

      const postA = getPost(a);
      const postB = getPost(b);

      if (!postA || !postB) {
        return 0;
      }

      if (depth >= 1) {
        const aIsRootAuthor = postA.author.did === authorDid;
        const bIsRootAuthor = postB.author.did === authorDid;

        if (aIsRootAuthor && !bIsRootAuthor) {
          return -1;
        } else if (!aIsRootAuthor && bIsRootAuthor) {
          return 1;
        }
      }

      if (depth >= 1) {
        const dateA = new Date(postA.record.createdAt);
        const dateB = new Date(postB.record.createdAt);
        return dateB.getTime() - dateA.getTime();
      }

      return 0;
    }

    function recursiveSort(array, depth) {
      if (!Array.isArray(array)) {
        return array;
      }

      if (depth <= 0) {
        const newArray = [];
        for (const item of array) {
          if (Array.isArray(item)) {
            newArray.push(recursiveSort(item, depth + 1));
          } else {
            newArray.push(item);
          }
        }
        return newArray;

      } else {
        const elementsToCompare = [];
        const newArray = [];

        for (const item of array) {
          if (Array.isArray(item)) {
            const sortedInnerArray = recursiveSort(item, depth + 1);
            elementsToCompare.push(sortedInnerArray);
            newArray.push(sortedInnerArray);
          } else {
            elementsToCompare.push(item);
            newArray.push(item);
          }
        }

        elementsToCompare.sort((a, b) => comparePosts(a, b, depth));

        const finalSortedArray = [];

        for(const sortedItem of elementsToCompare) {
          const originalIndex = newArray.findIndex(originalItem => {

            if(Array.isArray(sortedItem) && Array.isArray(originalItem)){
              return sortedItem[0]?.post?.cid === originalItem[0]?.post?.cid;
            } else if (!Array.isArray(sortedItem) && !Array.isArray(originalItem)) {
              return sortedItem.post.cid === originalItem.post.cid
            }
            return false;
          })

          if(originalIndex !== -1) {
            finalSortedArray.push(newArray[originalIndex]);
            newArray.splice(originalIndex, 1);
          }
        }

        return finalSortedArray;
      }
    }

    return recursiveSort(threadViewArray, 0);
  }

  onMount(async () => {
      if (isJunk) {
          await getFlatThread();
      } else {
          await getPostThread();
      }
  })
</script>

{#if (isMuted && !isMuteDisplay)}
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
  {#if (isJunk)}
    <VirtualThreadList {_agent} {column} {rootIndex}></VirtualThreadList>
  {:else}
    <div class="timeline thread-wrap" style="--root-client-height: {rootClientHeight}px" >
      <Thread feeds={column.data.feed} depth={0} column={column} {_agent} bind:rootClientHeight={rootClientHeight} scrollTop={scrollTop}></Thread>
    </div>
  {/if}
{/if}

<style lang="postcss">
    .thread-wrap {
        padding-bottom: calc(94vh - 120px - var(--root-client-height, 0px));

        @media (max-width: 767px) {
            padding-bottom: calc(100vh - 120px - var(--root-client-height, 0px));
        }
    }

    .thread-loading {
        text-align: center;

        img {
            width: 50px;
            height: 50px;
        }
    }
</style>