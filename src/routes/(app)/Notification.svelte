<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {agent, realtime, settings} from '$lib/stores';
    import { type AppBskyNotificationListNotifications } from '@atproto/api';
    import InfiniteLoading from 'svelte-infinite-loading';
    import {createEventDispatcher} from "svelte";
    import TimelineItem from "./TimelineItem.svelte";
    const dispatch = createEventDispatcher();
    import {getNotifications, mergeNotifications} from "$lib/components/notification/notificationUtil";
    import NotificationFollowItem from "$lib/components/notification/NotificationFollowItem.svelte";
    import {AtSign, Heart, Repeat2, UserPlus2} from 'lucide-svelte';
    import NotificationReactionItem from "$lib/components/notification/NotificationReactionItem.svelte";

    export let _agent = $agent;
    export let isPage = false;

    export let notifications: AppBskyNotificationListNotifications.Notification[] = [];
    export let cursor = '';

    type Filter = 'reply' | 'mention' | 'quote' | 'like' | 'repost' | 'follow';
    export let filter: Filter[] = ['like', 'repost', 'reply', 'mention', 'quote', 'follow'];
    export let feedPool = [];
    export let notificationGroup = [];
    let unique = Symbol();

    async function getNotificationsFilter(setFilter: Filter[]) {
        filter = setFilter;
        notifications = [];
        notificationGroup = [];
        feedPool = [];
        cursor = '';
    }

    $: realtimeNotificationCount($realtime.data)

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
        dispatch('update', {
            count: res.data.count,
        });
        await putNotifications(res.data.count);
    }

    async function putNotifications(count) {
        if (!$realtime.isConnected) {
            return false;
        }

        if (!isPage) {
            return false;
        }

        const res = await _agent.agent.api.app.bsky.notification.listNotifications({
            limit: 10,
            cursor: '',
        });

        const _notifications = mergeNotifications([...res.data.notifications, ...notifications]);
        const { notifications: newNotificationGroup, feedPool: newFeedPool } = await getNotifications(_notifications, true, _agent, feedPool || []);

        notifications = _notifications;
        notificationGroup = newNotificationGroup;
        feedPool = newFeedPool;

        if ($settings?.general.se && count > 0) {
            const se = new Audio('https://holybea.com/wp-content/uploads/2023/06/noti.mp3');
            se.volume = 0.5;
            se.play();
        }
    }

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        const res = await _agent.agent.api.app.bsky.notification.listNotifications({
            limit: 25,
            cursor: cursor,
        });
        cursor = res.data.cursor;

        if (cursor) {
            const { notifications: newNotificationGroup, feedPool: newFeedPool } = await getNotifications(res.data.notifications, true, _agent, feedPool);
            notifications = [...notifications, ...res.data.notifications];
            notificationGroup = [...notificationGroup, ...newNotificationGroup];
            feedPool = newFeedPool;
            loaded();
        } else {
            complete();
        }
    }

    function changeFilter(filter: Filter[]) {
        getNotificationsFilter(filter);
        unique = Symbol();
        dispatch('change', {
            filter: filter,
        });
    }
</script>

<div class="notifications-wrap">
    <div class="notifications-menu">
        <ul class="notifications-filter-list">
            <li class="notifications-filter-list__item">
                <button class="notifications-filter-button"
                        on:click={() => {changeFilter(['like', 'repost', 'reply', 'mention', 'quote', 'follow'])}}
                        class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['like', 'repost', 'reply', 'mention', 'quote', 'follow'])}>{$_('all')}</button>
            </li>

            <li class="notifications-filter-list__item">
                <button class="notifications-filter-button"
                        on:click={() => {changeFilter(['reply', 'mention', 'quote'])}}
                        class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['reply', 'mention', 'quote'])}
                        aria-label="Reply, Mention, and Quotes">
                    <AtSign size="18" color="var(--text-color-1)"></AtSign>
                </button>
            </li>

            <li class="notifications-filter-list__item">
                <button class="notifications-filter-button" on:click={() => {changeFilter(['like'])}}
                        class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['like'])}
                        aria-label="Like">
                    <Heart size="18" color="var(--text-color-1)"></Heart>
                </button>
            </li>

            <li class="notifications-filter-list__item">
                <button class="notifications-filter-button" on:click={() => {changeFilter(['repost'])}}
                        class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['repost'])}
                        aria-label="Repost">
                    <Repeat2 size="18" color="var(--text-color-1)"></Repeat2>
                </button>
            </li>

            <li class="notifications-filter-list__item">
                <button class="notifications-filter-button" on:click={() => {changeFilter(['follow'])}}
                        class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['follow'])}
                        aria-label="Follow">
                    <UserPlus2 size="20" color="var(--text-color-1)"></UserPlus2>
                </button>
            </li>
        </ul>
    </div>

    {#key unique}
        <div class="notifications-list">
          {#each notificationGroup as item, index (item)}
              {#if (filter.includes(item.reason))}
                  {#if (item.reason === 'quote' || item.reason === 'reply' || item.reason === 'mention')}
                      <TimelineItem {_agent} data={{post: item.feed || item.notifications[0]}}></TimelineItem>
                  {:else if (item.reason === 'follow')}
                      <NotificationFollowItem {_agent} item={item.notifications[0]} {filter}></NotificationFollowItem>
                  {:else}
                      <NotificationReactionItem {_agent} {item}></NotificationReactionItem>
                  {/if}
              {/if}
          {/each}
        </div>

        <InfiniteLoading on:infinite={handleLoadMore}>
            <p slot="noMore" class="infinite-nomore">もうないよ</p>
        </InfiniteLoading>
    {/key}
</div>

<style lang="postcss">
  .notifications-menu {
      margin: 0 -16px;
      padding: 0 16px;
      border-bottom: 1px solid var(--border-color-1);

      @container timeline-item (max-width: 310px) {
          padding: 0 8px;
      }
  }

  .notifications-wrap {
      height: 100%;
      display: flex;
      flex-direction: column;
  }

  .notifications-list {
      flex: 1;
  }

  .notifications-filter-list {
      list-style: none;
      display: flex;
      overflow: auto;
      white-space: nowrap;
      align-items: center;
      gap: 5px 10px;

      @container timeline-item (max-width: 320px) {
        gap: 5px;
        justify-content: space-between;
      }

      &__item {
          font-size: 14px;

          &--push {
              margin-left: auto;

              @media (max-width: 767px) {

              }
          }
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
</style>