<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import {agent, settings} from '$lib/stores';
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import AtSign from '@lucide/svelte/icons/at-sign';
    import Heart from '@lucide/svelte/icons/heart';
    import Quote from '@lucide/svelte/icons/quote';
    import Repeat2 from '@lucide/svelte/icons/repeat-2';
    import Reply from '@lucide/svelte/icons/reply';
    import Star from '@lucide/svelte/icons/star';
    import UserPlus2 from '@lucide/svelte/icons/user-plus-2';
    import Pencil from '@lucide/svelte/icons/pencil';
    import NotificationFollowItem from "$lib/components/notification/NotificationFollowItem.svelte";
    import NotificationReactionItem from "$lib/components/notification/NotificationReactionItem.svelte";
    import NotificationStarterpackItem from "$lib/components/notification/NotificationStarterpackItem.svelte";
    import TimelineItem from "./TimelineItem.svelte";
    import {
        NOTIFICATION_FILTER_OPTIONS,
        ensureNotificationFilter,
        loadMoreNotificationColumn,
        refreshNotificationColumn,
        resetNotificationColumnData,
    } from "$lib/components/notification/notificationPipeline";
    import {playSound} from "$lib/sounds";
    import Infinite from "$lib/components/utils/Infinite.svelte";

    let { index, isJunk, _agent = $agent, unique, column: columnProp = undefined } = $props();
    let columnState = getColumnState(isJunk);
    let column = columnProp ?? columnState.getColumn(index);
    let sound = $derived(column.settings?.playSound);
    let isOnlyShowUnread = $derived(column.settings?.onlyShowUnread);
    let id = $derived(column.id);
    let notificationTimeoutId: ReturnType<typeof setTimeout>;

    const filterIcons: Record<string, typeof Heart> = {
        like: $settings?.design?.reactionMode === 'superstar' ? Star : Heart,
        repost: Repeat2,
        reply: Reply,
        mention: AtSign,
        quote: Quote,
        follow: UserPlus2,
        'subscribed-post': Pencil,
    };

    ensureNotificationFilter(column);

    if (!column.data.notifications) {
        column.data.notifications = [];
    }

    const handleServiceWorkerMessage = (event: MessageEvent) => {
        if (event.data.type === 'notification_event') {
            const eventDid = event.data.data?.did;

            if (eventDid && eventDid === column.did) {
                clearTimeout(notificationTimeoutId);
                notificationTimeoutId = setTimeout(putNotifications, 2000);
            }
        }
    };

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    $effect(() => {
        return () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
            }
            clearTimeout(notificationTimeoutId);
        }
    })

    async function putNotifications() {
        const { newestIndexedAt } = await refreshNotificationColumn({ column, columnState, _agent });

        if (sound) {
            playSound(newestIndexedAt, column.lastRefresh, sound);
        }
        column.lastRefresh = new Date().toISOString();
    }

    const handleLoadMore = async (loaded: () => void, complete: () => void) => {
        try {
            const result = await loadMoreNotificationColumn({ column, columnState, _agent });

            if (result === 'loaded') {
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            console.error(e);
            complete();
        }
    }

    function handleFilterChange() {
        resetNotificationColumnData(column);
        columnState.clearFeed(column.id);
    }
</script>

<div class="notifications-filter-display">
    <ul class="notifications-filter">
        {#each NOTIFICATION_FILTER_OPTIONS as item (item)}
            {@const Icon = filterIcons[item]}
            <li class="notifications-filter__item notifications-filter__item--{item}" aria-label={$_(item)}>
                <input class="notifications-filter__input" type="checkbox" id={id + '_' + item} bind:group={column.filter} value={item} onchange={handleFilterChange}>
                <label class="notifications-filter__label" for={id + '_' + item}>
                    <Icon size="20" strokeWidth="var(--icon-stroke-width, 2px)"></Icon>
                </label>
            </li>
        {/each}
    </ul>
</div>

<div class="timeline timeline--notification">
  <div class="notifications-list">
    {#each columnState.getFeed(column.id) as item (item.key)}
      <div class="notifications-list__item">
        {#if item?.notifications[0]?.isRead === false}
          <span class="notifications-list__new"></span>
        {/if}

        {#if (column.filter.includes(item.reason))}
          {#if (item.reason === 'quote' || item.reason === 'reply' || item.reason === 'mention')}
            {#if item.post}
              <TimelineItem {_agent} data={{post: item.post}} {column}></TimelineItem>
            {/if}
          {:else if (item.reason === 'follow')}
            <NotificationFollowItem {_agent} item={item.notifications[0]}></NotificationFollowItem>
          {:else if (item.reason === 'starterpack-joined')}
            <NotificationStarterpackItem {_agent} item={item.notifications[0]}></NotificationStarterpackItem>
          {:else if item.post}
            <NotificationReactionItem {_agent} {item} post={item.post}></NotificationReactionItem>
          {/if}
        {/if}
      </div>
    {/each}
  </div>

  {#key unique}
    <Infinite oninfinite={handleLoadMore}>
      <p class="infinite-nomore">
        {$_('no_more')}
        {#if isOnlyShowUnread}
          <br>({$_('only_show_unread')})
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
    }

    .notifications-filter-display {
        border-bottom: var(--notification-filter-border);
        background-color: var(--notification-filter-bg-color, transparent);
        border-radius: var(--notification-filter-border-radius, 0);
        margin: var(--notification-filter-margin, 0);
        padding: 12px 16px;
    }
</style>
