<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {agent, notificationCount, realtime, settings} from '$lib/stores';
    import UserFollowButton from "./profile/[handle]/UserFollowButton.svelte";
    import { type AppBskyNotificationListNotifications, AppBskyFeedPost, AppBskyFeedLike, AppBskyFeedRepost } from '@atproto/api';
    import InfiniteLoading from 'svelte-infinite-loading';
    import ProfileCardWrapper from "./ProfileCardWrapper.svelte";
    import Repost from "$lib/components/post/Repost.svelte";
    import Like from "$lib/components/post/Like.svelte";
    import Reply from "$lib/components/post/Reply.svelte";
    import Avatar from "./Avatar.svelte";
    import UserItem from "./profile/[handle]/UserItem.svelte";

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

    $: putNotifications($notificationCount);

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
        <button class="notifications-filter-button" on:click={() => {getNotifications(['reply', 'mention', 'quote'])}} class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['reply', 'mention', 'quote'])} aria-label="Reply, Mention, and Quotes"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13.001" viewBox="0 0 13 13.001">
          <path id="at-symbol" d="M8.84,8.759A3.25,3.25,0,1,1,8.45,3.9v-.65h1.3V7.478a.975.975,0,1,0,1.95,0V6.5a5.2,5.2,0,1,0-2.873,4.654l.585,1.163A6.5,6.5,0,1,1,13,6.5h-.006v.975a2.275,2.275,0,0,1-4.16,1.28ZM6.5,8.453A1.95,1.95,0,1,0,4.55,6.5,1.95,1.95,0,0,0,6.5,8.453Z" transform="translate(0 -0.009)" fill="var(--primary-color)"/>
        </svg></button>
      </li>

      <li class="notifications-filter-list__item">
        <button class="notifications-filter-button" on:click={() => {getNotifications(['like'])}} class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['like'])} aria-label="Like"><svg xmlns="http://www.w3.org/2000/svg" width="15.78" height="14.101" viewBox="0 0 15.78 14.101">
          <path id="heart" d="M8,2.792l-.487-.479a4.388,4.388,0,0,0-6.206,6.2l0,0L8,15.206,14.7,8.5a4.388,4.388,0,0,0-6.21-6.2l0,0L8,2.792Z" transform="translate(-0.111 -1.105)" fill="var(--primary-color)"/>
        </svg></button>
      </li>

      <li class="notifications-filter-list__item">
        <button class="notifications-filter-button" on:click={() => {getNotifications(['repost'])}} class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['repost'])} aria-label="Repost"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="12" viewBox="0 0 20 12">
          <path id="retweet" d="M13.333,17.667A.342.342,0,0,1,13,18H3c-.385,0-.333-.406-.333-.667v-6h-2A.671.671,0,0,1,0,10.667a.638.638,0,0,1,.156-.427l3.333-4a.683.683,0,0,1,1.021,0l3.333,4A.636.636,0,0,1,8,10.667a.671.671,0,0,1-.667.667h-2v4h6a.356.356,0,0,1,.261.115l1.667,2A.42.42,0,0,1,13.333,17.667ZM20,13.333a.638.638,0,0,1-.156.427l-3.333,4a.664.664,0,0,1-1.021,0l-3.333-4A.636.636,0,0,1,12,13.333a.671.671,0,0,1,.667-.667h2v-4h-6a.332.332,0,0,1-.261-.125l-1.667-2a.357.357,0,0,1-.073-.209A.342.342,0,0,1,7,6H17c.385,0,.333.406.333.667v6h2A.671.671,0,0,1,20,13.333Z" transform="translate(0 -6)" fill="var(--primary-color)"/>
        </svg></button>
      </li>

      <li class="notifications-filter-list__item">
        <button class="notifications-filter-button" on:click={() => {getNotifications(['follow'])}} class:notifications-filter-button--active={JSON.stringify(filter) === JSON.stringify(['follow'])} aria-label="Follow"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="11.25" viewBox="0 0 15 11.25">
          <path id="user-add" d="M1.5,5.25H0v1.5H1.5v1.5H3V6.75H4.5V5.25H3V3.75H1.5Zm5.25,0a2.25,2.25,0,0,1,4.5,0v1.5a2.25,2.25,0,0,1-4.5,0ZM15,12.105a12.017,12.017,0,0,0-12,0V14.25H15Z" transform="translate(0 -3)" fill="var(--primary-color)"/>
        </svg></button>
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
          font-size: 15px;
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
          align-items: center;
          gap: 10px;
      }

      &--filter-follow {
          align-items: flex-start;

          .notifications-item__title {
              line-height: 1.3;
          }
      }

      &--reply {
          background-color: var(--base-bg-color);
          margin-left: -20px;
          margin-right: -20px;
          padding-left: 20px;
          padding-right: 20px;
      }
  }

  .notifications-new {
      position: absolute;
      width: 3px;
      background-color: var(--primary-color);
      left: -20px;
      top: 0;
      bottom: 0;
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
      margin-bottom: 15px;

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
      border: 1px solid var(--primary-color);
      min-width: 50px;
      height: 30px;
      padding: 0 8px;
      border-radius: 15px;
      display: grid;
      place-content: center;
      color: var(--text-color-1);

      &--active {
          background-color: var(--primary-color);
          color: var(--bg-color-1);

          path {
              fill: var(--bg-color-1);
          }
      }
  }

  .notification-column {
      display: grid;
      grid-template-columns: 40px 1fr;
      gap: 10px;
  }
</style>