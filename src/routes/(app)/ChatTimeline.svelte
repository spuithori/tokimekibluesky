<script lang="ts">
    import {agent} from '$lib/stores';
    import ChatItem from "$lib/components/chat/ChatItem.svelte";
    import ChatPublish from "$lib/components/chat/ChatPublish.svelte";
    import {tick} from "svelte";
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import Infinite from "$lib/components/utils/Infinite.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {settingsState} from "$lib/classes/settingsState.svelte";

    let { index, _agent = $agent, onrefresh, unique, isJunk } = $props();
    let firstLoad = true;

    const columnState = getColumnState(isJunk);
    const column = columnState.getColumn(index);

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

            column.data.feed = [...feed, ...column.data.feed];

            if (firstLoad) {
                await tick();
                const scrollEl = isJunk ? document.querySelector('.settings-content') : column.scrollElement as HTMLElement;
                const scrollY = scrollEl?.scrollHeight;
                scrollEl?.scrollTo(0, scrollY || 0);
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

    function handleUpdateReaction(message) {
        column.data.feed = column.data.feed.map(item => {
            if (item.id === message.id) {
                return message;
            }
            return item;
        });
    }
</script>

<div class="chat">
  {#key unique}
      {#if settingsState.pdsRequestReady}
          <Infinite oninfinite={handleLoadMore}></Infinite>
      {/if}
  {/key}

  {#each column.data.feed as data (data)}
    <ChatItem message={data} {_agent} convoId={column.algorithm.id} updateReaction={handleUpdateReaction}></ChatItem>
  {/each}

  <div class="chat-anchor"></div>

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

  .chat-anchor {
      overflow-anchor: auto;
      height: 1px;
  }
</style>