<script lang="ts">
    import {agent, columns, settings, workerTimer} from "$lib/stores";
    import {createEventDispatcher, onDestroy} from "svelte";
    const dispatch = createEventDispatcher();

    export let column;
    export let index;
    export let _agent = $agent;
    export let unique = Symbol();

    let isRefreshing = false;

    function isDuplicatePost(oldFeed, newFeed) {
        return newFeed.reason
            ? oldFeed.post.uri === newFeed.post.uri && oldFeed.reason?.indexedAt === newFeed.reason.indexedAt
            : oldFeed.post.uri === newFeed.post.uri;
    }

    export async function refresh() {
        isRefreshing = true;
        if (column.algorithm.type === 'default' || column.algorithm.type === 'custom' || column.algorithm.type === 'officialList') {
            const res = await _agent.getTimeline({limit: 20, cursor: '', algorithm: column.algorithm});

            const el = $settings.design?.layout === 'decks' ? column.scrollElement || document.querySelector(':root') : document.querySelector(':root');
            const elInitialPosition = el.scrollTop;
            const topEl = el.querySelector('.timeline__item');

            await columns.update(_columns => {
                const newFeed = res.data.feed.filter(feed => {
                    return !column.data.feed.some(item => isDuplicatePost(item, feed));
                }).map(feed => ({...feed, memoryCursor: res.data.cursor}));

                column.data.feed.forEach(feed => {
                    if (res.data.feed.some(item => isDuplicatePost(feed, item))) {
                        feed.memoryCursor = res.data.cursor;
                    }
                });

                _columns[index].data.feed = [...newFeed, ...column.data.feed];
                return _columns;
            })

            if (elInitialPosition === 0 && column.data.feed.length > 60) {
                const borderItem = column.data.feed[59];

                if (borderItem && borderItem.memoryCursor) {
                    const lastCursorIndex = column.data.feed.findLastIndex(item => item.memoryCursor === borderItem.memoryCursor);

                    if (lastCursorIndex !== -1) {
                        column.data.feed.splice(lastCursorIndex + 1);
                        column.data.feed = column.data.feed;
                        column.data.cursor = borderItem.memoryCursor;
                    }
                }
            }

            if (elInitialPosition === 0 && column.settings?.refreshToTop !== true) {
                if (column.style !== 'media') {
                    const offset = el.querySelector('.timeline').getBoundingClientRect().top + 16;
                    el.scrollTo(0, topEl.getBoundingClientRect().top - offset);
                }
            }
        } else if (column.algorithm.type === 'bookmark') {
            column.data.feed = [];
            column.data.cursor = 0;
            unique = Symbol();
        } else if (column.algorithm.type === 'realtime') {
            return false;
        } else if (column.algorithm.type === 'notification') {
            $columns[index].unreadCount !== 0
                ? $columns[index].unreadCount = 0
                : await _agent.getNotificationCount();
            column.data.feed = [];
            column.data.cursor = undefined;
            unique = Symbol();
            await _agent.agent.api.app.bsky.notification.updateSeen({seenAt: new Date().toISOString()});
        } else {
            column.data.feed = [];
            column.data.cursor = undefined;
            unique = Symbol();
        }

        isRefreshing = false;
    }

    function handleKeydown(event: { key: string; }) {
        const activeElement = document.activeElement?.tagName;

        if (event.key === 'r' && (activeElement === 'BODY' || activeElement === 'BUTTON') && !isRefreshing) {
            refresh();
        }
    }

    function handleTimer(e) {
        if (column.settings?.autoRefresh && column.settings?.autoRefresh > 0) {
            if (e.data % Number(column.settings.autoRefresh) === 0) {
                refresh();
            }
        }
    }
    $workerTimer.addEventListener('message', handleTimer);

    onDestroy(() => {
        $workerTimer.removeEventListener('message', handleTimer);
    })
</script>

<svelte:window on:keydown={handleKeydown} />

{#if (column.algorithm.type !== 'bookmark' && column.algorithm.type !== 'realtime' && column.algorithm.type !== 'thread')}
  <button
      class="refresh-button"
      class:refresh-button--decks={$settings.design.layout === 'decks'}
      class:is-refreshing={isRefreshing}
      aria-label="Refresh"
      on:click={refresh}
      disabled={isRefreshing}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="22.855" viewBox="0 0 16 22.855">
      <path id="refresh" d="M11,3.428V5.714a5.714,5.714,0,0,0-4.045,9.759L5.343,17.084A8,8,0,0,1,11,3.428Zm5.657,2.343A8,8,0,0,1,11,19.427V17.141a5.714,5.714,0,0,0,4.045-9.759ZM11,22.855,6.428,18.284,11,13.713ZM11,9.142V0L15.57,4.571Z" transform="translate(-2.999)" fill="var(--primary-color)"/>
    </svg>
  </button>
{/if}
