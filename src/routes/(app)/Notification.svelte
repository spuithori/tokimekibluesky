<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {agent, realtime, settings} from '$lib/stores';
    import { type AppBskyNotificationListNotifications, AppBskyFeedPost, AppBskyFeedLike, AppBskyFeedRepost } from '@atproto/api';
    import InfiniteLoading from 'svelte-infinite-loading';
    import ProfileCardWrapper from "./ProfileCardWrapper.svelte";
    import Repost from "$lib/components/post/Repost.svelte";
    import Like from "$lib/components/post/Like.svelte";
    import Reply from "$lib/components/post/Reply.svelte";
    import Avatar from "./Avatar.svelte";
    import UserItem from "./profile/[handle]/UserItem.svelte";
    import {createEventDispatcher} from "svelte";
    const dispatch = createEventDispatcher();

    export let _agent = $agent;
    export let isPage = false;

    let notifications: AppBskyNotificationListNotifications.Notification[] = [];
    let cursor = '';

    type Filter = 'reply' | 'mention' | 'quote' | 'like' | 'repost' | 'follow';
    let filter: Filter[] = ['like', 'repost', 'reply', 'mention', 'quote', 'follow'];
    let reasonSubjects = [];
    let feeds = [];
    let il;

    async function getNotifications(setFilter: Filter[]) {
        filter = setFilter;
        notifications = [];
        cursor = '';
        il.$$.update();
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
        console.log(res.data.count);
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
            limit: 20,
            cursor: '',
        });
        cursor = res.data.cursor;
        const newNotifications = res.data.notifications;

        await updateNotifications(newNotifications, true);

        if ($settings?.general.se && count > 0) {
            const se = new Audio('https://holybea.com/wp-content/uploads/2023/06/noti.mp3');
            se.volume = 0.5;
            se.play();
        }
    }

    async function updateNotifications(ctx, putBefore = false) {
        if (putBefore) {
            notifications = [];
        }

        ctx.forEach((item, index) => {
            if (!item.author.viewer.muted) {
                notifications = [...notifications, item];

                if (filter.includes(item.reason)) {
                    if (item.reason === 'reply' || item.reason === 'mention') {
                        reasonSubjects.push(item.uri);
                    } else {
                        reasonSubjects.push(item.reasonSubject);
                    }

                    if (item.reason === 'quote') {
                        reasonSubjects.push(item.uri);
                    }
                }
            }
        });

        reasonSubjects = [...new Set(reasonSubjects)];
        reasonSubjects = reasonSubjects.filter(v => v);

        if (reasonSubjects.length) {
            const postsRes = await _agent.agent.api.app.bsky.feed.getPosts({uris: reasonSubjects});

            reasonSubjects = [];

            notifications.forEach(notification => {
                postsRes.data.posts.forEach(item => {
                    if (notification.reasonSubject === item.uri) {
                        notification.feed = item;
                    }

                    if (notification.reason === 'reply' || notification.reason === 'mention' || notification.reason === 'quote') {
                        if (notification.uri === item.uri) {
                            notification.feedThis = item;
                        }
                    }
                });
            });
            notifications = notifications;
        }

        //console.log(notifications)
    }

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        const res = await _agent.agent.api.app.bsky.notification.listNotifications({
            limit: 20,
            cursor: cursor,
        });
        cursor = res.data.cursor;

        if (cursor) {
            await updateNotifications(res.data.notifications);

            loaded();
        } else {
            complete();
        }
    }

    function getReasonText(reason: string) {
        switch (reason) {
            case 'quote':
                return 'quoted_your_post';
            case 'reply':
                return 'replied_your_post';
            case 'mention':
                return 'mentioned_your_post';
            case 'like':
                return 'liked_your_post';
            case 'repost':
                return 'reposted_your_post';
            default:
                return 'liked_your_post';
        }
    }
</script>

<div class="notifications-wrap">
  <div class="notifications-menu">
    <ul class="notifications-filter-list">
      <li class="notifications-filter-list__item">
        <button class="notifications-filter-button" on:click={() => {getNotifications(['like', 'repost', 'reply', 'mention', 'quote', 'follow'])}} class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['like', 'repost', 'reply', 'mention', 'quote', 'follow'])}>{$_('all')}</button>
      </li>

      <li class="notifications-filter-list__item">
        <button class="notifications-filter-button" on:click={() => {getNotifications(['reply', 'mention', 'quote'])}} class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['reply', 'mention', 'quote'])} aria-label="Reply, Mention, and Quotes"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-at-sign"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg></button>
      </li>

      <li class="notifications-filter-list__item">
        <button class="notifications-filter-button" on:click={() => {getNotifications(['like'])}} class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['like'])} aria-label="Like"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></button>
      </li>

      <li class="notifications-filter-list__item">
        <button class="notifications-filter-button" on:click={() => {getNotifications(['repost'])}} class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['repost'])} aria-label="Repost"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-repeat-2"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg></button>
      </li>

      <li class="notifications-filter-list__item">
        <button class="notifications-filter-button" on:click={() => {getNotifications(['follow'])}} class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['follow'])} aria-label="Follow"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-plus-2"><path d="M14 19a6 6 0 0 0-12 0"/><circle cx="8" cy="9" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg></button>
      </li>
    </ul>
  </div>

  <div class="notifications-list">
    {#each notifications as item}
      {#if (filter.includes(item.reason))}
        {#if (item.reason !== 'follow')}
          <article class="notifications-item notifications-item--{item.reason}">
            {#if (!item.isRead)}
              <div class="notifications-new" aria-label="New Notification"></div>
            {/if}

            <div class="notification-column">
              <div>
                {#if $settings?.design.postsLayout !== 'minimum'}
                  <Avatar href="/profile/{ item.author.handle }" avatar={item.author.avatar}
                          handle={item.author.handle} {_agent}></Avatar>
                {/if}
              </div>
              
              <div class="notification-column__content">
                <h2 class="notifications-item__title">
                <span class="notifications-item__name">
                  <ProfileCardWrapper handle="{item.author.handle}" {_agent}>
                    <a href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a>
                  </ProfileCardWrapper>
                </span> {$_(getReasonText(item.reason))}
                  {#if (item.reason === 'quote' || item.reason === 'reply' || item.reason === 'mention')}
                    ・<a href="/profile/{item.author.handle}/post/{item.uri.split('/').slice(-1)[0]}">{$_('show_thread')}</a>
                  {/if}
                </h2>

                {#if (item.reason === 'quote' || item.reason === 'reply' || item.reason === 'mention')}
                  <p class="notifications-item__content">{item.record.text}</p>
                {:else}
                  {#if (item.feed)}
                    <p class="notifications-item__content">{item.feed.record.text}</p>
                  {/if}
                {/if}

                {#if (item.reason === 'quote' && item.feed)}
                  <p class="notifications-item__quote">{item.feed.record.text}</p>
                {/if}

                {#if item.feedThis}
                  <div class="timeline-reaction timeline-reaction--notification">
                    <Reply
                        post={item.feedThis}
                        reply={item.feedThis.record.reply}
                        count={item.feedThis.replyCount}
                        {_agent}
                    ></Reply>

                    <Repost
                        cid={item.feedThis.cid}
                        uri={item.feedThis.uri}
                        repostViewer={item.feedThis.viewer?.repost}
                        count={item.feedThis.repostCount}
                        {_agent}
                        on:repost
                    ></Repost>

                    <Like
                        cid={item.feedThis.cid}
                        uri={item.feedThis.uri}
                        likeViewer={item.feedThis.viewer?.like}
                        count={item.feedThis.likeCount}
                        {_agent}
                        on:like
                    ></Like>
                  </div>
                {/if}
              </div>
            </div>
          </article>
        {:else}
          <article class="notifications-item notifications-item--follow notifications-item--filter-{filter}">
            <div class="notifications-item__contents">
              <h2 class="notifications-item__title">
              <span class="notifications-item__name">
                <ProfileCardWrapper handle="{item.author.handle}" {_agent}>
                  <a href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a>
              </ProfileCardWrapper>
              </span> {$_('followed_you')}
              </h2>

              {#if (item.author.description)}
                <p class="notifications-item__description">{item.author.description}</p>
              {/if}
            </div>

            <div class="notifications-item__buttons">
              <UserItem user={item.author} layout={'notification'} {_agent}></UserItem>
            </div>
          </article>
        {/if}
      {/if}
    {/each}
  </div>

  <InfiniteLoading on:infinite={handleLoadMore} bind:this={il}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style lang="postcss">
  .notification-column {
      &__content {
          min-width: 0;
      }
  }

  .notifications-item {
      border-bottom: 1px solid var(--border-color-1);
      padding: 10px 0;
      position: relative;

      &__contents {
          min-height: 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
      }

      &__title {
          font-size: 14px;
          line-height: 1.5;
          font-weight: 600;
          margin-bottom: 5px;
      }

      &__content {
          font-size: 14px;
      }

      &__quote {
          border: 1px solid var(--border-color-1);
          padding: 10px;
          font-size: 13px;
          margin-top: 10px;
      }

      &__heading {
          display: flex;
          flex-wrap: wrap;
          gap: 4px 5px;
      }

      &__buttons {
          flex-shrink: 0;
      }

      &__description {
          font-size: 13px;
          margin-top: 5px;
      }

      &--follow {
          display: flex;
          justify-content: space-between;
          flex-direction: column;
          align-items: flex-start;
          gap: 5px;

          @container timeline-item (max-width: 320px) {

          }
      }

      &--filter-follow {
          align-items: flex-start;

          .notifications-item__title {
              line-height: 1.3;
          }
      }

      &--reply {
          background-color: var(--base-bg-color);
          margin-left: -16px;
          margin-right: -16px;
          padding-left: 16px;
          padding-right: 16px;

          .notifications-new {
              display: none;
          }
      }

      &--like,
      &--repost {
          .notifications-item__content {
              color: var(--text-color-3);
              white-space: nowrap;
              text-overflow: ellipsis;
              overflow: hidden;
          }
      }
  }

  .notifications-new {
      position: absolute;
      width: 3px;
      background-color: var(--primary-color);
      left: -16px;
      top: 0;
      bottom: 0;
  }

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

  .notification-column {
      display: grid;
      grid-template-columns: 40px 1fr;
      gap: 10px;
  }
</style>