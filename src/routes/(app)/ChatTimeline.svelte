<script lang="ts">
    import {agent} from '$lib/stores';
    import ChatItem from "$lib/components/chat/ChatItem.svelte";
    import ChatPublish from "$lib/components/chat/ChatPublish.svelte";
    import {tick} from "svelte";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import Infinite from "$lib/components/utils/Infinite.svelte";

    let { column = $bindable(), index, _agent = $agent, onrefresh, unique } = $props();
    let firstLoad = true;

    function isDuplicateMessage(oldFeed, newFeed) {
        return oldFeed.id === newFeed.id;
    }

    const handleLoadMore = async (loaded, complete) => {
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
                tick().then(() => {
                    column.scrollElement.scrollTo(0, column.scrollElement.scrollHeight);
                });
            }

            if (column.data.cursor && res.data.messages.length) {
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

    $effect(() => {
        tick().then(() => {
            column.scrollElement.scrollTo(0, column.scrollElement.scrollHeight);
        })
    });
</script>

<div class="chat">
  {#key unique}
    <Infinite oninfinite={handleLoadMore}></Infinite>
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