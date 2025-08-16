<script lang="ts">
    import { m } from "$lib/paraglide/messages.js";
    import {agent, settings} from '$lib/stores';
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {AtSign, Heart, Quote, Repeat2, Reply, Star, UserPlus2, Pencil} from "lucide-svelte";
    import NotificationFollowItem from "$lib/components/notification/NotificationFollowItem.svelte";
    import NotificationReactionItem from "$lib/components/notification/NotificationReactionItem.svelte";
    import TimelineItem from "./TimelineItem.svelte";
    import {getNotifications, mergeNotifications} from "$lib/components/notification/notificationUtil";
    import {playSound} from "$lib/sounds";
    import Infinite from "$lib/components/utils/Infinite.svelte";

    type Filter = 'reply' | 'mention' | 'quote' | 'like' | 'repost' | 'follow' | 'like-via-repost' | 'repost-via-repost' | 'subscribed-post';

    let { index, isJunk, _agent = $agent, unique } = $props();
    let columnState = getColumnState(isJunk);
    let column = columnState.getColumn(index);
    let sound = $derived(column.settings?.playSound);
    let isOnlyShowUnread = $derived(column.settings?.onlyShowUnread);
    let id = $derived(column.id);

    let filters: Filter[] = $state(['like', 'repost', 'reply', 'mention', 'quote', 'follow', 'like-via-repost', 'repost-via-repost', 'subscribed-post']);
    let filterIcons = {
        like: $settings?.design?.reactionMode === 'superstar' ? Star : Heart,
        repost: Repeat2,
        reply: Reply,
        mention: AtSign,
        quote: Quote,
        follow: UserPlus2,
        'subscribed-post': Pencil,
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

    if (!column.filter) {
        column.filter = ['like', 'repost', 'reply', 'mention', 'quote', 'follow', 'subscribed-post'];
    }

    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data.type === 'notification_event') {
        const eventDid = event.data.data?.did;

        if (eventDid && eventDid === column.did) {
          setTimeout(putNotifications, 2000);
        }
      }
    });

    async function getNotificationsFilter(setFilter: Filter[]) {
        column.filter = setFilter;
        column.data.notifications = [];
        column.data.feed = [];
        column.data.feedPool = [];
        column.data.cursor = '';
    }

    async function putNotifications() {
        const res = await _agent.agent.api.app.bsky.notification.listNotifications({
            limit: 10,
            cursor: '',
        });
        const __notifications = res.data.notifications.filter(item => {
            return column.filter.includes(item.reason);
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

    const handleLoadMore = async (loaded, complete) => {
        try {
            const res = await _agent.agent.api.app.bsky.notification.listNotifications({
                limit: 25,
                cursor: column.data.cursor,
                reasons: column.filter,
            });
            column.data.cursor = res.data.cursor;

            const _notifications = res.data.notifications.filter(item => {
                return column.filter.includes(item.reason);
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
    }
</script>

<div class="notifications-filter-display">
    <ul class="notifications-filter">
        {#each filters as item (item)}
            <li class="notifications-filter__item notifications-filter__item--{item}">
                <input class="notifications-filter__input" type="checkbox" id={id + '_' + item} bind:group={column.filter} value={item} onchange={() => {changeFilter(column.filter)}}>
                <label class="notifications-filter__label" for={id + '_' + item}>
                    <svelte:component this={filterIcons[item]} size="20" strokeWidth="var(--icon-stroke-width, 2px)"></svelte:component>
                </label>
            </li>
        {/each}
    </ul>
</div>

<div class="timeline timeline--notification">
  <div class="notifications-list">
    {#each column.data.feed as item (item)}
      <div class="notifications-list__item">
        {#if item?.notifications[0]?.isRead === false}
          <span class="notifications-list__new"></span>
        {/if}

        {#if (column.filter.includes(item.reason))}
          {#if (item.reason === 'quote' || item.reason === 'reply' || item.reason === 'mention')}
            <TimelineItem {_agent} data={column.data.feedPool[item.postIndex]} {column}></TimelineItem>
          {:else if (item.reason === 'follow')}
            <NotificationFollowItem {_agent} item={item.notifications[0]}></NotificationFollowItem>
          {:else if (item.reason === 'starterpack-joined')}

          {:else}
            <NotificationReactionItem {_agent} {item} post={column?.data?.feedPool[item.postIndex]?.post}></NotificationReactionItem>
          {/if}
        {/if}
      </div>
    {/each}
  </div>

  {#key unique}
    <Infinite oninfinite={handleLoadMore}>
      <p class="infinite-nomore">
        {m.no_more()}
        {#if isOnlyShowUnread}
          <br>({m.only_show_unread()})
        {/if}
      </p>
    </Infinite>
  {/key}
</div>

<style lang="postcss">
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

        &__item {
            &--like-via-repost,
            &--repost-via-repost {
                display: none;
            }
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