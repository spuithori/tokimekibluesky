<script lang="ts">
    import {agent, columns, cursors, notificationCount, settings, timelines} from "$lib/stores";
    import TimerEvent from "$lib/components/utils/TimerEvent.svelte";

    export let column;
    export let index;
    export let _agent = $agent;
    export let unique = Symbol();

    let isRefreshing = false;

    export async function refresh() {
        isRefreshing = true;
        if (column.algorithm.type === 'default' || column.algorithm.type === 'custom') {
            const res = await _agent.getTimeline({limit: 20, cursor: '', algorithm: column.algorithm});
            const newFeeds = res.data.feed.filter(feed => {
                return !$timelines[index].some(item => feed.reason ? item.post.uri === feed.post.uri && item.reason?.indexedAt === feed.reason.indexedAt : item.post.uri === feed.post.uri);
            });

            if (newFeeds.length === 20) {
                $timelines[index] = res.data.feed;
                $cursors[index] = res.data.cursor;
            } else {
                const el = $settings.design?.layout === 'decks' ? column.scrollElement : document.querySelector(':root');
                const elInitialPosition = el.scrollTop;
                const topEl = el.querySelector('.timeline > .timeline__item:first-child');

                await timelines.update(function (tls) {
                    return tls.map((tl, i) => {
                        if (i === index) {
                            return [...newFeeds, ...tl];
                        }
                        return tl;
                    })
                });

                if (elInitialPosition === 0) {
                    if (column.style !== 'media') {
                        const offset = $settings.design?.layout === 'decks' ? 73 : 68;
                        el.scrollTo(0, topEl.getBoundingClientRect().top - offset);
                    }
                }
            }

            /* if (_agent.did() === $agent.did()) {
                notificationCount.set(await _agent.getNotificationCount());
            } */
            refreshNotificationCount();
        } else if (column.algorithm.type === 'bookmark') {
            $timelines[index] = [];
            $cursors[index] = 0;
            unique = Symbol();
        } else if (column.algorithm.type === 'realtime') {
            return false;
        } else if (column.algorithm.type === 'notification') {
            unique = Symbol();
        } else {
            $timelines[index] = [];
            $cursors[index] = undefined;
            unique = Symbol();
        }

        isRefreshing = false;
    }

    async function refreshNotificationCount() {
        for (const column1 of $columns) {
            const index1 = $columns.indexOf(column1);
            if (column1.algorithm.type === 'notification' && column1.did === _agent.did()) {
                $columns[index1].unreadCount = await _agent.getNotificationCount();
            }
        }
    }

    function handleTimer() {
        refresh();
    }

    function handleKeydown(event: { key: string; }) {
        const activeElement = document.activeElement?.tagName;

        if (event.key === 'r' && (activeElement === 'BODY' || activeElement === 'BUTTON') && !isRefreshing) {
            refresh();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if (column.algorithm.type !== 'bookmark' && column.algorithm.type !== 'realtime')}
  <button
      class="refresh-button"
      class:refresh-button--decks={$settings.design.layout === 'decks'}
      class:is-refreshing={isRefreshing}
      aria-label="Refresh"
      on:click={() => {refresh()}}
      disabled={isRefreshing}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="22.855" viewBox="0 0 16 22.855">
      <path id="refresh" d="M11,3.428V5.714a5.714,5.714,0,0,0-4.045,9.759L5.343,17.084A8,8,0,0,1,11,3.428Zm5.657,2.343A8,8,0,0,1,11,19.427V17.141a5.714,5.714,0,0,0,4.045-9.759ZM11,22.855,6.428,18.284,11,13.713ZM11,9.142V0L15.57,4.571Z" transform="translate(-2.999)" fill="var(--primary-color)"/>
    </svg>
  </button>
{/if}

{#if (column.settings?.autoRefresh && column.settings?.autoRefresh > 0)}
  <TimerEvent delay={Number(column.settings.autoRefresh) * 1000} on:timer={handleTimer}></TimerEvent>
{/if}