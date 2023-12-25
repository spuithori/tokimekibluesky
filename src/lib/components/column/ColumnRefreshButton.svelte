<script lang="ts">
    import {agent, columns, settings, workerTimer, isRealtimeListenersModalOpen} from "$lib/stores";
    import {createEventDispatcher, onDestroy} from "svelte";
    import {getNotifications, mergeNotifications} from "$lib/components/notification/notificationUtil";
    import {playSound} from "$lib/sounds";
    const dispatch = createEventDispatcher();

    export let column;
    export let index;
    export let _agent = $agent;
    export let unique = Symbol();

    let isRefreshing = false;

    $: releasePosts(column.data.feed);

    function isDuplicatePost(oldFeed, newFeed) {
        return newFeed.reason
            ? oldFeed.post.uri === newFeed.post.uri && oldFeed.reason?.indexedAt === newFeed.reason.indexedAt
            : oldFeed.post.uri === newFeed.post.uri;
    }

    export async function refresh(isAutoRefresh: boolean = false) {
        isRefreshing = true;
        const el = $settings.design?.layout === 'decks' ? column.scrollElement || document.querySelector(':root') : document.querySelector(':root');
        const elInitialPosition = el.scrollTop;

        if (column.algorithm.type === 'default' || column.algorithm.type === 'custom' || column.algorithm.type === 'officialList') {
            const res = await _agent.getTimeline({limit: 20, cursor: '', algorithm: column.algorithm});
            const topEl = el.querySelector('.timeline__item');

            await columns.update(_columns => {
                const newFeed = res.data.feed.filter(feed => {
                    return !column.data.feed.some(item => isDuplicatePost(item, feed));
                }).map(feed => ({...feed, memoryCursor: res.data.cursor}));

                if (newFeed.length === 20 && column.data.feed.length !== 0) {
                    const dividerPost = newFeed.slice(-1)[0];
                    dividerPost.isDivider = true;
                }

                column.data.feed.forEach(feed => {
                    if (res.data.feed.some(item => isDuplicatePost(feed, item))) {
                        feed.memoryCursor = res.data.cursor;
                    }
                });

                if (column.data.feed.length === 0) {
                    _columns[index].data.cursor = res.data.cursor;
                }

                _columns[index].data.feed = [...newFeed, ...column.data.feed];
                return _columns;
            });

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
            const res = await _agent.agent.api.app.bsky.notification.listNotifications({
                limit: 25,
                cursor: '',
            });
            let resNotifications = column.settings?.onlyShowUnread
                    ? res.data.notifications.filter(notification => !notification.isRead)
                    : res.data.notifications;

            if (!isAutoRefresh && column.settings?.onlyShowUnread) {
                resNotifications = resNotifications.filter(notification => !column.data.feed.some(_notification => notification.uri === _notification.uri));
            }

            const notifications = mergeNotifications(column.settings?.onlyShowUnread ? [...resNotifications] : [...resNotifications, ...column.data.feed], !isAutoRefresh);

            const { notifications: notificationGroup, feedPool: newFeedPool } = await getNotifications(notifications, true, _agent, column.data.feedPool || []);

            await columns.update(_columns => {
                _columns[index].data.feed = notifications;
                _columns[index].data.notificationGroup = notificationGroup;
                _columns[index].data.feedPool = newFeedPool;

                return _columns;
            });

            if (column.settings?.onlyShowUnread) {
                unique = Symbol();
            }

            el.scrollTo(0, 0);

            if (!isAutoRefresh) {
                $columns[index].unreadCount !== 0
                    ? $columns[index].unreadCount = 0
                    : await _agent.getNotificationCount();

                await _agent.agent.api.app.bsky.notification.updateSeen({seenAt: new Date().toISOString()});
            }
        } else {
            column.data.feed = [];
            column.data.cursor = undefined;
            unique = Symbol();
        }

        if (column.settings?.playSound) {
            playSound(column.algorithm.type === 'notification' ? column.data?.feed[0]?.indexedAt : column.data?.feed[0]?.post.indexedAt, column.lastRefresh, column.settings.playSound)
        }

        $columns[index].lastRefresh = new Date().toISOString();
        isRefreshing = false;
    }

    function releasePosts(feed) {
        const scrollTop = getScrollTop();

        if (column.style === 'media') {
            return false;
        }

        if (scrollTop === 0 && feed.length > 40) {
            const borderItem = feed[39];

            if (borderItem && borderItem.memoryCursor) {
                const lastCursorIndex = feed.findLastIndex(item => item.memoryCursor === borderItem.memoryCursor);

                if (lastCursorIndex !== -1) {
                    column.data.feed.splice(lastCursorIndex + 1);
                    column.data.feed = column.data.feed;
                    column.data.cursor = borderItem.memoryCursor;
                }
            }
        }
    }

    function getScrollTop() {
        const el = $settings.design?.layout === 'decks' ? column.scrollElement || document.querySelector(':root') : document.querySelector(':root');
        return el.scrollTop;
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
                refresh(true);
            }
        }
    }
    $workerTimer.addEventListener('message', handleTimer);

    onDestroy(() => {
        $workerTimer.removeEventListener('message', handleTimer);
    })
</script>

<svelte:window on:keydown={handleKeydown} />

{#if (column.algorithm.type !== 'bookmark' && column.algorithm.type !== 'thread')}
  {#if (column.settings?.autoRefresh !== -1 && column.algorithm.type !== 'realtime')}
    <button
        class="refresh-button"
        class:refresh-button--decks={$settings.design.layout === 'decks'}
        class:is-refreshing={isRefreshing}
        aria-label="Refresh"
        on:click={() => {refresh(false)}}
        disabled={isRefreshing}
    >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="22.855" viewBox="0 0 16 22.855">
          <path id="refresh" d="M11,3.428V5.714a5.714,5.714,0,0,0-4.045,9.759L5.343,17.084A8,8,0,0,1,11,3.428Zm5.657,2.343A8,8,0,0,1,11,19.427V17.141a5.714,5.714,0,0,0,4.045-9.759ZM11,22.855,6.428,18.284,11,13.713ZM11,9.142V0L15.57,4.571Z" transform="translate(-2.999)" fill="var(--primary-color)"/>
        </svg>
    </button>
  {:else}
    <button
        class="refresh-button refresh-button--realtime refresh-button--decks"
        aria-label="Realtime Connecting"
        on:click={() => {$isRealtimeListenersModalOpen = true}}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-radio"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>
    </button>
  {/if}
{/if}
