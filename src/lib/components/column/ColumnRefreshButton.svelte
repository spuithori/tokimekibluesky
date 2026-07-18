<script lang="ts">
    import Radio from '@lucide/svelte/icons/radio';
    import {agent, settings, workerTimer, isRealtimeListenersModalOpen, pauseColumn, realtimeStatuses} from "$lib/stores";
    import {isVirtualTimelineEnabled} from "$lib/components/timeline/virtualGate";
    import {trimFeedAtBorder} from "$lib/components/timeline/feedTrim";
    import {onDestroy, tick, untrack} from "svelte";
    import {refreshSignal} from "$lib/refreshSignal.svelte";
    import { watch } from "runed";
    import {claimNotificationChime, clearNotificationBadgesForDid, markNotificationsSeen, refreshNotificationColumn} from "$lib/components/notification/notificationPipeline";
    import {instantPlaySound, playSound} from "$lib/sounds";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import { fly } from 'svelte/transition';
    import {CHAT_PROXY} from "$lib/components/chat/chatConst";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    interface Props {
        index: any;
        _agent?: any;
        unique?: any;
        isJunk?: boolean;
        isRefreshing?: boolean | string;
        isSplit?: boolean;
        column?: any;
    }

    let {
        index,
        _agent = $agent,
        unique = $bindable(Symbol()),
        isJunk = false,
        isRefreshing = $bindable(false),
        isSplit = false,
        column: columnProp = undefined
    }: Props = $props();

    const columnState = getColumnState(isJunk);
    const fixedColumnState = getColumnState(false);
    let column = columnProp ?? columnState.getColumn(index);
    let currentRefresh: Promise<unknown> | null = null;

    function getScrollElement(): HTMLElement {
        if ($settings.design?.layout !== 'decks') {
            return document.documentElement;
        }
        if (isJunk && column.scrollElement) {
            return (column.scrollElement.closest('.modal-page-content') as HTMLElement) ?? column.scrollElement;
        }
        return column.scrollElement || document.documentElement;
    }

    function getServiceHost(): string {
        try {
            const serviceUrl = _agent.service();
            if (serviceUrl) {
                const url = new URL(serviceUrl);
                return url.host;
            }
        } catch (e) {

        }
        return 'bsky.social';
    }

    const serviceHost = getServiceHost();
    const host = serviceHost === 'bsky.social' ? 'Jetstream (us-east2)' : serviceHost;

    watch(() => column.unreadCount, (curr, prev) => {
      if (curr && curr > (prev ?? 0) && column.data.cursor) {
        refresh(true).catch((e) => console.error(e));
      }
    }, { lazy: true })

    function getPostKey(feed) {
        if (!feed?.post?.uri) return '';
        return feed.reason?.indexedAt
            ? `${feed.post.uri}|${feed.reason.indexedAt}`
            : feed.post.uri;
    }

    export async function refresh(isAutoRefresh: boolean = false) {
        if ($pauseColumn) {
            return false;
        }

        if (isRefreshing) {
            if (!isAutoRefresh && column.algorithm.type === 'notification') {
                await currentRefresh;
                await markNotificationsSeen({ column, columnState, _agent });
                clearNotificationBadgesForDid(fixedColumnState.columns, column.did);
            }
            return false;
        }

        if (column.settings?.autoRefresh === -1) {
            return false;
        }

        isRefreshing = isAutoRefresh ? 'auto' : true;
        currentRefresh = doRefresh(isAutoRefresh);

        try {
            return await currentRefresh;
        } finally {
            isRefreshing = false;
            currentRefresh = null;
        }
    }

    async function doRefresh(isAutoRefresh: boolean) {
        if (column.style === 'video') {
            columnState.clearFeed(column.id);
            column.data.cursor = undefined;
            unique = Symbol();
        }

        const el = getScrollElement();
        const elInitialPosition = el.scrollTop;
        let notificationNewestIndexedAt: string | undefined;

        if (column.algorithm.type !== 'notification') {
            column.unreadCount = 0
        }

        if (column.algorithm.type === 'default' || column.algorithm.type === 'custom' || column.algorithm.type === 'officialList' || column.algorithm.type === 'myPost' || column.algorithm.type === 'myMedia') {
            const shouldMaintainPosition = !column.settings?.refreshToTop;
            const scrollEl: HTMLElement = getScrollElement();

            const res = await _agent.getTimeline({limit: 20, cursor: '', algorithm: column.algorithm});

            if (!res) {
                return false;
            }

            const currentFeed = columnState.getFeed(column.id);
            const existingKeys = new Set(currentFeed.map(getPostKey));
            const newFeed = res.feed
                .filter(feed => !existingKeys.has(getPostKey(feed)))
                .map(feed => ({...feed, memoryCursor: res.cursor}));

            if (newFeed.length === res.feed.length && currentFeed.length !== 0) {
                const dividerPost = newFeed.slice(-1)[0];
                dividerPost.isDivider = true;
            }

            const newKeys = new Set(res.feed.map(getPostKey));
            columnState.replaceFeed(column.id, f => f.map(feed => {
                if (newKeys.has(getPostKey(feed))) {
                    feed.memoryCursor = res.cursor;
                }
                return feed;
            }));

            if (columnState.getFeed(column.id).length === 0) {
                column.data.cursor = res.cursor;
            }

            const useVirtualTimeline = isVirtualTimelineEnabled(column);

            let distanceFromBottom = 0;
            if (!useVirtualTimeline && shouldMaintainPosition && newFeed.length > 0 && columnState.getFeed(column.id).length > 0) {
                const scrollTop = scrollEl.scrollTop;
                const scrollHeight = scrollEl.scrollHeight;
                const clientHeight = scrollEl.clientHeight;
                distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            }

            columnState.updateFeed(column.id, f => { f.unshift(...newFeed); });

            if (distanceFromBottom > 0) {
                await tick();
                const newScrollHeight = scrollEl.scrollHeight;
                const clientHeight = scrollEl.clientHeight;
                scrollEl.scrollTop = newScrollHeight - distanceFromBottom - clientHeight;
            }
        } else if (column.algorithm.type === 'bookmark') {
            columnState.clearFeed(column.id);
            column.data.cursor = 0;
            unique = Symbol();
        } else if (column.algorithm.type === 'realtime') {
            return false;
        } else if (column.algorithm.type === 'notification') {
            const { newestIndexedAt, pruned } = await refreshNotificationColumn(
                { column, columnState, _agent },
                {
                    markAsRead: !isAutoRefresh,
                    allowPrune: !isAutoRefresh && elInitialPosition === 0,
                },
            );
            notificationNewestIndexedAt = newestIndexedAt;

            if (column.settings?.onlyShowUnread || pruned) {
                unique = Symbol();
            }

            if (elInitialPosition === 0) {
                el.scrollTo(0, 0);
            }

            if (!isAutoRefresh) {
                await markNotificationsSeen({ column, columnState, _agent });
                clearNotificationBadgesForDid(fixedColumnState.columns, column.did);
            }
        } else if (column.algorithm.type === 'chat') {
            const res = await _agent.xrpc.get('chat.bsky.convo.getMessages', {cursor: '', limit: 50, convoId: column.algorithm.id}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });

            if (!res) {
                return false;
            }

            const chatFeed = columnState.getFeed(column.id);
            const existingMessageIds = new Set(chatFeed.map(m => m.id));
            const newFeed = res.messages
                .filter(feed => !existingMessageIds.has(feed.id))
                .reverse();

            if (chatFeed.length === 0) {
                column.data.cursor = res.cursor;
            }

            columnState.replaceFeed(column.id, f => [...f, ...newFeed]);

            if (!isAutoRefresh) {
              await _agent.xrpc.post('chat.bsky.convo.updateRead', {convoId: column.algorithm.id}, {
                headers: {
                  'atproto-proxy': CHAT_PROXY,
                }
              });
              await _agent.getChatLogs();
            }
        } else if (column.algorithm.type === 'chatList') {
            if (column.algorithm.id) {
                const res = await _agent.xrpc.get('chat.bsky.convo.getMessages', {cursor: '', limit: 50, convoId: column.algorithm.id}, {
                    headers: {
                        'atproto-proxy': CHAT_PROXY,
                    }
                });

                if (!res) {
                    return false;
                }

                const chatListFeed = columnState.getFeed(column.id);
                const existingMessageIds = new Set(chatListFeed.map(m => m.id));
                const newFeed = res.messages
                    .filter(feed => !existingMessageIds.has(feed.id))
                    .reverse();

                if (chatListFeed.length === 0) {
                    column.data.cursor = res.cursor;
                }

                columnState.replaceFeed(column.id, f => [...f, ...newFeed]);

                if (!isAutoRefresh) {
                    await _agent.xrpc.post('chat.bsky.convo.updateRead', {convoId: column.algorithm.id}, {
                        headers: {
                            'atproto-proxy': CHAT_PROXY,
                        }
                    });
                    await _agent.getChatLogs();
                }
            } else {
                unique = Symbol();
            }
        } else if (column.algorithm.type === 'thread') {
            columnState.clearFeed(column.id);
            unique = Symbol();
        } else {
            columnState.clearFeed(column.id);
            column.data.cursor = undefined;
            unique = Symbol();
        }

        try {
            if (column.algorithm.type === 'notification') {
                if (claimNotificationChime(column.id, notificationNewestIndexedAt) && column.settings?.playSound) {
                    instantPlaySound(column.settings.playSound);
                }
            } else if (column.settings?.playSound) {
                const soundFeed = columnState.getFeed(column.id);
                if (column.algorithm.type === 'chat') {
                    if (soundFeed.slice(-1)[0]?.sender?.did !== _agent.did()) {
                        playSound(soundFeed.slice(-1)[0]?.sentAt, column.lastRefresh, column.settings.playSound)
                    }
                } else {
                    playSound(soundFeed[0]?.post?.indexedAt, column.lastRefresh, column.settings.playSound)
                }
            }
        } catch (e) {
            console.error(e);
        }

        releasePosts(columnState.getFeed(column.id));
        column.lastRefresh = new Date().toISOString();
        return true;
    }

    function releasePosts(feed) {
        const scrollTop = getScrollTop();

        if (isJunk && !isRefreshing) {
            return false;
        }

        if (scrollTop !== 0) {
            return false;
        }

        const plan = trimFeedAtBorder(feed, column.style);
        if (plan) {
            columnState.updateFeed(column.id, f => { f.splice(plan.spliceStart); });
            column.data.cursor = plan.cursor;
        }
    }

    function getScrollTop() {
        return getScrollElement().scrollTop;
    }

    function handleKeydown(event: { key: string; }) {
        const activeElement = document.activeElement?.tagName;

        if (event.key === 'r' && (activeElement === 'BODY' || activeElement === 'BUTTON')) {
            refresh().catch((e) => console.error(e));
        }
    }

    let lastRefreshSignal = -1;
    $effect(() => {
        const count = refreshSignal.count;
        if (lastRefreshSignal === -1) {
            lastRefreshSignal = count;
            return;
        }
        if (count === lastRefreshSignal) {
            return;
        }
        lastRefreshSignal = count;
        untrack(() => {
            refresh().catch((e) => console.error(e));
        });
    });

    function handleTimer(e) {
        if (column.settings?.autoRefresh && column.settings?.autoRefresh > 0) {
            if (e.data % Number(column.settings.autoRefresh) === 0) {
                refresh(true).catch((err) => console.error(err));
            }
        }
    }
    $workerTimer.addEventListener('message', handleTimer);

    onDestroy(() => {
        $workerTimer.removeEventListener('message', handleTimer);
    })
</script>

<svelte:window onkeydown={handleKeydown} />

{#if column.settings?.autoRefresh === -1}
  <button
          class="refresh-button refresh-button--realtime refresh-button--decks"
          aria-label="Realtime Connecting"
          onclick={() => {$isRealtimeListenersModalOpen = true}}
  >
    <Radio color={$realtimeStatuses.includes(host) ? 'var(--primary-color)' : 'var(--border-color-1)'} />
  </button>
{:else}
  {#if isJunk}
    <button
            class="refresh-button"
            class:refresh-button--decks={$settings.design.layout === 'decks' || isJunk}
            class:is-refreshing={isRefreshing}
            aria-label="Refresh"
            onclick={() => {refresh(false)}}
            disabled={isRefreshing}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="22.855" viewBox="0 0 16 22.855">
        <path id="refresh" d="M11,3.428V5.714a5.714,5.714,0,0,0-4.045,9.759L5.343,17.084A8,8,0,0,1,11,3.428Zm5.657,2.343A8,8,0,0,1,11,19.427V17.141a5.714,5.714,0,0,0,4.045-9.759ZM11,22.855,6.428,18.284,11,13.713ZM11,9.142V0L15.57,4.571Z" transform="translate(-2.999)" fill="var(--primary-color)"/>
      </svg>
    </button>
  {:else}
    {#if (isRefreshing === true && column.algorithm?.type !== 'chat' && column.algorithm?.type !== 'chatList')}
      <div class="refresher" transition:fly={{ duration: 300, y: -100}}>
        <LoadingSpinner padding={0} size={24}></LoadingSpinner>
      </div>
    {/if}
  {/if}
{/if}

<style lang="postcss">
  .refresher {
      position: absolute;
      width: 48px;
      height: 48px;
      display: grid;
      place-content: center;
      background-color: var(--bg-color-1);
      border-radius: 50%;
      box-shadow: 0 0 3px var(--box-shadow-color-1);
      left: 0;
      right: 0;
      margin: auto;
      top: 30px;
      z-index: 30;
      cursor: default;
      pointer-events: none;

      @media (max-width: 767px) {
        display: none;
      }
  }

  .refresh-button {
      order: -1;
  }
</style>