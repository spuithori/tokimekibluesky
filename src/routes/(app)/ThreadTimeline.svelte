<script lang="ts">
  import {agent, settings} from '$lib/stores';
  import spinner from '$lib/images/loading.svg';
  import Thread from './profile/[handle]/post/[id]/Thread.svelte';
  import {onMount} from "svelte";
  import {_} from "svelte-i18n";
  import VirtualThreadList from "$lib/components/thread/VirtualThreadList.svelte";

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
    _agent = $agent,
    isRefreshing = $bindable(),
    isJunk = false
  }: Props = $props();

  let scrollTop: undefined | Number = $state(undefined);
  let rootClientHeight = $state(0);
  let rootIndex = $state();
  let rootDid;

  let isMuted: boolean = $state(false);
  let isMuteDisplay: boolean = $state(false);

  let flatThread = [];

  function isMutedIncludes(feed) {
      isMuted = feed.post.author?.viewer.muted;

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
          const thread = [ raw.data.thread ];

          if (thread.length) {
              flatPost(thread);
          }

          //flatThread = flatThread.filter(feed => feed.position !== 'authorChild');
          flatThread = sortThread(flatThread);
          column.data.feed = flatThread;
          column.data.feed.forEach(feed => {
              if (!feed.blocked) {
                  isMutedIncludes(feed);
              }
          });
          rootIndex = flatThread.findIndex(feed => feed.depth === 0);
      } catch (e) {
          console.error(e);
          column.data.feed = 'NotFound';
      }
  }

  function flatPost(thread, depth = 0, position: 'root' | 'parent' | 'child' | 'author' | 'authorChild' | undefined = 'root', beforeDid = undefined) {
      thread.forEach((feed, index) => {
          if (feed.parent) {
              flatPost([feed.parent], depth - 1, 'parent');
          }

          if (depth === 0) {
              rootDid = feed.post.author.did;
          }

          const _feed = {
              ...feed,
              depth,
              position: beforeDid === feed.post.author.did && rootDid === feed.post.author.did && depth !== 0 ? 'author' : position,
          }
          flatThread = [...flatThread, _feed];

          if (feed.replies?.length) {
              flatPost(feed.replies, depth + 1, _feed.position === 'author' || _feed.position === 'authorChild' ? 'authorChild' : 'child', feed.post.author.did);
          }
      })
  }

  function sortThread(arr) {
      const result = [];
      const authorElements = [];
      const otherElements = [];

      for (const item of arr) {
          if (item.depth <= 0) {
              result.push(item);
          } else if (item.position === 'author') {
              authorElements.push(item);
          } else {
              otherElements.push(item);
          }
      }

      return [...result, ...authorElements, ...otherElements];
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
  <div class="thread-loading">
    <img src={spinner} alt="">
  </div>
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