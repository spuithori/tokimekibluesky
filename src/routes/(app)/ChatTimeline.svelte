<script lang="ts">
    import {agent, chatPulse, latestRevMap} from '$lib/stores';
    import InfiniteLoading from 'svelte-infinite-loading';
    import ChatItem from "$lib/components/chat/ChatItem.svelte";
    import ChatPublish from "$lib/components/chat/ChatPublish.svelte";
    import {tick} from "svelte";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";

    let { column = $bindable(), index, _agent = $agent, onrefresh, unique } = $props();
    let firstLoad = true;
    let retryCount = 0;

    $effect(() => {
        handleUpdate($chatPulse);
    })

    function isDuplicateMessage(oldFeed, newFeed) {
        return oldFeed.id === newFeed.id;
    }

    async function handleUpdate(logs) {
        if (!logs.length) {
            return false;
        }

        if (logs.some(log => log.convoId === column.algorithm.id)) {
            onrefresh();
        }
    }

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        try {
            const res = await _agent.agent.api.chat.bsky.convo.getMessages({cursor: column.data.cursor, limit: 50, convoId: column.algorithm.id}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });

            if (res?.data?.cursor) {
                column.data.cursor = res.data.cursor;
            }

            const feed = res.data.messages.filter(feed => {
                return !column.data.feed.some(item => isDuplicateMessage(item, feed));
            }).reverse();

            if (column.data.feed.length !== 0) {
                firstLoad = false;
            }

            column.data.feed = [...feed, ...column.data.feed];

            if (firstLoad) {
                if (res.data.messages.length) {
                    $latestRevMap.set(_agent.did(), res.data.messages[0].rev);
                }

                tick().then(() => {
                    column.scrollElement.scrollTo(0, column.scrollElement.scrollHeight);
                });
            }

            if (column.data.cursor && res.data.messages.length) {
                if (retryCount > 5) {
                    throw new Error('Retry limit exceeded');
                }

                if (!res.data.messages.length) {
                    retryCount = retryCount + 1;
                } else {
                    retryCount = 0;
                }

                firstLoad = false;
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            if (e.message === 'XRPC Not Supported') {
                setTimeout(() => {
                    console.log('retry');
                    loaded();
                }, 1000)
            } else {
                console.error(e);
                complete();
            }
        }
    }

    $effect.pre(() => {
        tick().then(() => {
            column.scrollElement.scrollTo(0, column.scrollElement.scrollHeight);
        })
    });
</script>

<div class="chat">
  {#key unique}
    <InfiniteLoading on:infinite={handleLoadMore} direction="top">
      {#snippet noMore()}
          <p  class="infinite-nomore"></p>
        {/snippet}
      {#snippet noResults()}
          <p  class="infinite-nomore"></p>
        {/snippet}
    </InfiniteLoading>
  {/key}

  {#each column.data.feed as data, index (data)}
    <div>
      <ChatItem message={data} {_agent}></ChatItem>
    </div>
  {/each}

  <ChatPublish id={column.algorithm.id} {column} {_agent} {onrefresh}></ChatPublish>
</div>

<style lang="postcss">
  .chat {
      padding: 16px 16px calc(env(keyboard-inset-height, 0px) + var(--safe-area-bottom));
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      cursor: initial;
  }
</style>