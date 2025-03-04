<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {agent, realtime, settings} from '$lib/stores';
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {AtSign, Heart, Quote, Repeat2, Reply, Star, UserPlus2} from "lucide-svelte";
    import InfiniteLoading from "svelte-infinite-loading";
    import NotificationFollowItem from "$lib/components/notification/NotificationFollowItem.svelte";
    import NotificationReactionItem from "$lib/components/notification/NotificationReactionItem.svelte";
    import TimelineItem from "./TimelineItem.svelte";
    import {getNotifications, mergeNotifications} from "$lib/components/notification/notificationUtil";
    import {playSound} from "$lib/sounds";

    type Filter = 'reply' | 'mention' | 'quote' | 'like' | 'repost' | 'follow';

    let { index, isJunk, _agent = $agent, unique } = $props();
    let columnState = getColumnState(isJunk);
    let column = columnState.getColumn(index);
    let sound = $derived(column.settings?.playSound);
    let isOnlyShowUnread = $derived(column.settings?.onlyShowUnread);
    let filter = $state(column.filter || ['like', 'repost', 'reply', 'mention', 'quote', 'follow']);
    let id = $derived(column.id);

    let filters: Filter[] = $state(['like', 'repost', 'reply', 'mention', 'quote', 'follow']);
    let filterIcons = {
        like: $settings?.design?.reactionMode === 'superstar' ? Star : Heart,
        repost: Repeat2,
        reply: Reply,
        mention: AtSign,
        quote: Quote,
        follow: UserPlus2,
    };

    if (!column.data.notifications) {
        column.data.notifications = [];
    }

    if (!column.data.feed) {
        column.data.feed = [];
    }

    if (!column.data.feedPool) {
        column.data.feedPool = [];
    }

    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data.type === 'notification_event') {
        const eventDid = event.data.data?.did;

        if (eventDid && eventDid === column.did) {
          setTimeout(putNotifications, 2000);
        }
      }
    });

    function onupdate(count: number) {
        column.unreadCount = count;
    }

    function onchange(filter: any) {
        column.filter = filter;
    }

    async function getNotificationsFilter(setFilter: Filter[]) {
        filter = setFilter;
        column.data.notifications = [];
        column.data.feed = [];
        column.data.feedPool = [];
        column.data.cursor = '';
    }

    $effect(() => {
        realtimeNotificationCount($realtime.data);
    })

    async function realtimeNotificationCount(data) {
        if (!data) {
            return false;
        }

        const record = data.record;

        if (!record) {
            return false;
        }

        if (record.$type === 'app.bsky.feed.like' || record.$type === 'app.bsky.feed.repost') {
            const subjectUri = record.subject.uri;
            const subjectRepo = subjectUri.split('/')[2];

            if (subjectRepo === _agent.did()) {
                await observeRealtimeNotification();
            }
        }

        if (record.$type === 'app.bsky.graph.follow') {
            const subject = record.subject;

            if (subject === _agent.did()) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await observeRealtimeNotification();
            }
        }

        if (record.$type === 'app.bsky.feed.post' && typeof record.text === 'string') {
            const subjectUri = record.reply?.parent.uri ?? undefined;
            if (!subjectUri) {
                return false;
            }
            const subjectRepo = subjectUri.split('/')[2];

            if (subjectRepo === _agent.did()) {
                await observeRealtimeNotification();
            }
        }
    }

    async function observeRealtimeNotification() {
        const res = await _agent.agent.api.app.bsky.notification.getUnreadCount();
        onupdate(res.data.count)
        await putNotifications();
    }

    async function putNotifications() {
        const res = await _agent.agent.api.app.bsky.notification.listNotifications({
            limit: 10,
            cursor: '',
        });
        const __notifications = res.data.notifications.filter(item => {
            return filter.includes(item.reason);
        });
        const resNotifications = isOnlyShowUnread
            ? __notifications.filter(notification => !notification.isRead)
            : __notifications;

        const _notifications = mergeNotifications([...resNotifications, ...column.data.notifications]);
        const { notifications: newNotificationGroup, feedPool: newFeedPool } = await getNotifications(_notifications, true, _agent, column.data.feedPool || []);

        column.data.notifications = _notifications;
        column.data.feed = newNotificationGroup;
        column.data.feedPool = newFeedPool;

        if (sound) {
            playSound(column.data.notifications[0]?.indexedAt, column.lastRefresh, sound)
        }

        // column.lastRefresh = new Date().toISOString();
    }

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        try {
            if (!filter.length) {
                filter = ['like', 'repost', 'reply', 'mention', 'quote', 'follow'];
            }

            const res = await _agent.agent.api.app.bsky.notification.listNotifications({
                limit: 25,
                cursor: column.data.cursor,
                reasons: filter,
            });
            column.data.cursor = res.data.cursor;

            const _notifications = res.data.notifications.filter(item => {
                return filter.includes(item.reason);
            });
            const resNotifications = isOnlyShowUnread
                ? _notifications.filter(notification => !notification.isRead)
                : _notifications;

            const { notifications: newNotificationGroup, feedPool: newFeedPool } = await getNotifications(resNotifications, true, _agent, column.data.feedPool);
            column.data.notifications = [...column.data.notifications, ...resNotifications];
            column.data.feed = [...column.data.feed, ...newNotificationGroup];
            column.data.feedPool = newFeedPool;

            if (column.data.cursor && isOnlyShowUnread ? resNotifications.length : res.data.notifications.length) {
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            console.error(e);
            complete();
        }
    }

    function changeFilter(filter: Filter[]) {
        getNotificationsFilter(filter);
        unique = Symbol();
        onchange(filter);
    }
</script>

{#if (isJunk)}
  <div class="notifications-menu">
    <ul class="notifications-filter-list">
      <li class="notifications-filter-list__item">
        <button class="notifications-filter-button"
                onclick={() => {changeFilter(['like', 'repost', 'reply', 'mention', 'quote', 'follow'])}}
                class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['like', 'repost', 'reply', 'mention', 'quote', 'follow'])}>{$_('all')}</button>
      </li>

      <li class="notifications-filter-list__item">
        <button class="notifications-filter-button"
                onclick={() => {changeFilter(['reply', 'mention', 'quote'])}}
                class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['reply', 'mention', 'quote'])}
                aria-label="Reply, Mention, and Quotes">
          <AtSign size="18" color="var(--text-color-1)"></AtSign>
        </button>
      </li>

      <li class="notifications-filter-list__item">
        <button class="notifications-filter-button" onclick={() => {changeFilter(['like'])}}
                class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['like'])}
                aria-label="Like">
          {#if ($settings?.design?.reactionMode === 'superstar')}
            <Star color="var(--text-color-1)" size="18"></Star>
          {:else}
            <Heart size="18" color="var(--text-color-1)"></Heart>
          {/if}
        </button>
      </li>

      <li class="notifications-filter-list__item">
        <button class="notifications-filter-button" onclick={() => {changeFilter(['repost'])}}
                class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['repost'])}
                aria-label="Repost">
          <Repeat2 size="18" color="var(--text-color-1)"></Repeat2>
        </button>
      </li>

      <li class="notifications-filter-list__item">
        <button class="notifications-filter-button" onclick={() => {changeFilter(['follow'])}}
                class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['follow'])}
                aria-label="Follow">
          <UserPlus2 size="20" color="var(--text-color-1)"></UserPlus2>
        </button>
      </li>
    </ul>
  </div>
{:else}
  <div class="notifications-filter-display">
    <ul class="notifications-filter">
      {#each filters as item, index (item)}
        <li class="notifications-filter__item" aria-label={$_(item)}>
          <input class="notifications-filter__input" type="checkbox" id={id + '_' + item} bind:group={filter} value={item} onchange={() => {changeFilter(filter)}}>
          <label class="notifications-filter__label" for={id + '_' + item}>
            <svelte:component this={filterIcons[item]} size="20"></svelte:component>
          </label>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<div class="timeline timeline--notification">
  <div class="notifications-list">
    {#each column.data.feed as item, index}
      <div class="notifications-list__item">
        {#if item?.notifications[0]?.isRead === false}
          <span class="notifications-list__new"></span>
        {/if}

        {#if (filter.includes(item.reason))}
          {#if (item.reason === 'quote' || item.reason === 'reply' || item.reason === 'mention')}
            <TimelineItem {_agent} data={column.data.feedPool[item.postIndex]} {column}></TimelineItem>
          {:else if (item.reason === 'follow')}
            <NotificationFollowItem {_agent} item={item.notifications[0]} {filter}></NotificationFollowItem>
          {:else if (item.reason === 'starterpack-joined')}

          {:else}
            <NotificationReactionItem {_agent} {item} post={column?.data?.feedPool[item.postIndex]?.post}></NotificationReactionItem>
          {/if}
        {/if}
      </div>
    {/each}
  </div>

  {#key unique}
    <InfiniteLoading on:infinite={handleLoadMore}>
      <p slot="noMore" class="infinite-nomore">
        {$_('no_more')}
        {#if isOnlyShowUnread}
          <br>({$_('only_show_unread')})
        {/if}
      </p>
      <p slot="noResults" class="infinite-nomore">
        {$_('no_results')}
        {#if isOnlyShowUnread}
          <br>({$_('only_show_unread')})
        {/if}
      </p>
    </InfiniteLoading>
  {/key}
</div>

<style lang="postcss">
    .notifications-menu {
        padding: 16px 8px 0;
        margin: var(--notification-filter-margin, 0);
        border-bottom: 1px solid var(--border-color-1);
    }

    .notifications-list {
        &__item {
            position: relative;
        }

        &__new {
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: var(--primary-color);
            right: var(--notifications-new-right, -12px);
            top: var(--notifications-new-top, 4px);;
            z-index: 1;
        }
    }

    .notifications-filter-list {
        list-style: none;
        display: flex;
        overflow: auto;
        white-space: nowrap;
        align-items: center;
        gap: 5px;
        justify-content: space-between;

        &__item {
            font-size: 14px;
        }
    }

    .notifications-filter-button {
        min-width: 40px;
        height: 30px;
        padding: 0 8px 12px;
        display: grid;
        place-content: center;
        color: var(--text-color-1);
        position: relative;

        @container timeline-item (max-width: 320px) {

        }

        &::before {
            content: '';
            display: block;
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            width: 20px;
            height: 4px;
            border-radius: 2px;
            background-color: var(--primary-color);
            margin: auto;
            transform: scaleX(0);
            transition: transform .25s cubic-bezier(0, 0, 0.18, 1);
        }

        &--active {
            &::before {
                transform: scaleX(1);
            }
        }
    }

    .notifications-filter {
        list-style: none;
        display: flex;
        justify-content: space-around;
        gap: 8px;

        &__input {
            &:checked {
                & + label {
                    color: var(--primary-color);
                }
            }
        }

        &__label {
            cursor: pointer;
            color: var(--border-color-2);
        }
    }

    .notifications-filter-display {
        border-bottom: var(--notification-filter-border);
        background-color: var(--notification-filter-bg-color, transparent);
        border-radius: var(--notification-filter-border-radius, 0);
        margin: var(--notification-filter-margin, 0);
        padding: 12px 16px;
    }
</style>