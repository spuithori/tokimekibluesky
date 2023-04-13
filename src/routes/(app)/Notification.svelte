<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { agent, replyRef } from '$lib/stores';
    import UserFollowButton from "./profile/[handle]/UserFollowButton.svelte";
    import { type AppBskyNotificationListNotifications, AppBskyFeedPost, AppBskyFeedLike, AppBskyFeedRepost } from '@atproto/api';
    import InfiniteLoading from 'svelte-infinite-loading';

    let notifications: AppBskyNotificationListNotifications.Notification[] = [];
    let cursor = '';

    type Filter = 'all' | 'reply_mention_quote' | 'like' | 'repost' | 'follow';
    let filter: Filter = 'all';
    let reasonSubjects = [];
    let feeds = [];
    let il;

    /* $: {
        if (isNotificationOpen) {
            getNotifications('all');
        }
    } */

    async function getNotifications(setFilter: Filter) {
        filter = setFilter;
        notifications = [];
        cursor = '';
        il.$$.update();
    }

    async function getFeedAll(promises) {
        await Promise.allSettled(promises)
            .then((results) => {
                results.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value !== null) {
                        feeds[result.value.post.uri] = result.value.post;
                    }
                })
            })
    }

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        const res = await $agent.agent.api.app.bsky.notification.listNotifications({
            limit: 30,
            cursor: cursor,
        });
        cursor = res.data.cursor;

        if (cursor) {
            res.data.notifications.forEach((item, index) => {
                if (item.reasonSubject) {
                    reasonSubjects.push(item.reasonSubject);
                }

                if (!item.author.viewer.muted) {
                    if (AppBskyFeedLike.isRecord(item.record) && (filter === 'like' || filter === 'all')) {
                        notifications = [...notifications, item];
                    } else if (AppBskyFeedRepost.isRecord(item.record) && (filter === 'repost' || filter === 'all')) {
                        notifications = [...notifications, item];
                    } else if ((item.reason === 'quote' && typeof item.reasonSubject === 'string') && (filter === 'reply_mention_quote' || filter === 'all')) {
                        notifications = [...notifications, item];
                    } else {
                        reasonSubjects[index] = null;
                        notifications = [...notifications, item];
                    }
                }
            });

            reasonSubjects = [...new Set(reasonSubjects)];
            let reasonSubjectsPromises = [];
            reasonSubjects.forEach(subject => {
                if (subject !== null) {
                    reasonSubjectsPromises.push($agent.getFeed(subject));
                }
            })

            await getFeedAll(reasonSubjectsPromises);
            reasonSubjects = [];

            notifications.forEach(item => {
                if (item.reasonSubject) {
                    item.feed = feeds[item.reasonSubject];
                }
            })
            notifications = notifications;
            console.log(notifications)

            loaded();
        } else {
            complete();
        }
    }
</script>

<div class="notifications-wrap">
  <ul class="notifications-filter-list">
    <li class="notifications-filter-list__item">
      <button class="notifications-filter-button" on:click={() => {getNotifications('all')}} class:notifications-filter-button--active={filter === 'all'}>{$_('all')}</button>
    </li>

    <li class="notifications-filter-list__item">
      <button class="notifications-filter-button" on:click={() => {getNotifications('reply_mention_quote')}} class:notifications-filter-button--active={filter === 'reply_mention_quote'} aria-label="Reply, Mention, and Quotes"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13.001" viewBox="0 0 13 13.001">
        <path id="at-symbol" d="M8.84,8.759A3.25,3.25,0,1,1,8.45,3.9v-.65h1.3V7.478a.975.975,0,1,0,1.95,0V6.5a5.2,5.2,0,1,0-2.873,4.654l.585,1.163A6.5,6.5,0,1,1,13,6.5h-.006v.975a2.275,2.275,0,0,1-4.16,1.28ZM6.5,8.453A1.95,1.95,0,1,0,4.55,6.5,1.95,1.95,0,0,0,6.5,8.453Z" transform="translate(0 -0.009)" fill="var(--primary-color)"/>
      </svg></button>
    </li>

    <li class="notifications-filter-list__item">
      <button class="notifications-filter-button" on:click={() => {getNotifications('like')}} class:notifications-filter-button--active={filter === 'like'} aria-label="Like"><svg xmlns="http://www.w3.org/2000/svg" width="15.78" height="14.101" viewBox="0 0 15.78 14.101">
        <path id="heart" d="M8,2.792l-.487-.479a4.388,4.388,0,0,0-6.206,6.2l0,0L8,15.206,14.7,8.5a4.388,4.388,0,0,0-6.21-6.2l0,0L8,2.792Z" transform="translate(-0.111 -1.105)" fill="var(--primary-color)"/>
      </svg></button>
    </li>

    <li class="notifications-filter-list__item">
      <button class="notifications-filter-button" on:click={() => {getNotifications('repost')}} class:notifications-filter-button--active={filter === 'repost'} aria-label="Repost"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="12" viewBox="0 0 20 12">
        <path id="retweet" d="M13.333,17.667A.342.342,0,0,1,13,18H3c-.385,0-.333-.406-.333-.667v-6h-2A.671.671,0,0,1,0,10.667a.638.638,0,0,1,.156-.427l3.333-4a.683.683,0,0,1,1.021,0l3.333,4A.636.636,0,0,1,8,10.667a.671.671,0,0,1-.667.667h-2v4h6a.356.356,0,0,1,.261.115l1.667,2A.42.42,0,0,1,13.333,17.667ZM20,13.333a.638.638,0,0,1-.156.427l-3.333,4a.664.664,0,0,1-1.021,0l-3.333-4A.636.636,0,0,1,12,13.333a.671.671,0,0,1,.667-.667h2v-4h-6a.332.332,0,0,1-.261-.125l-1.667-2a.357.357,0,0,1-.073-.209A.342.342,0,0,1,7,6H17c.385,0,.333.406.333.667v6h2A.671.671,0,0,1,20,13.333Z" transform="translate(0 -6)" fill="var(--primary-color)"/>
      </svg></button>
    </li>

    <li class="notifications-filter-list__item">
      <button class="notifications-filter-button" on:click={() => {getNotifications('follow')}} class:notifications-filter-button--active={filter === 'follow'} aria-label="Follow"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="11.25" viewBox="0 0 15 11.25">
        <path id="user-add" d="M1.5,5.25H0v1.5H1.5v1.5H3V6.75H4.5V5.25H3V3.75H1.5Zm5.25,0a2.25,2.25,0,0,1,4.5,0v1.5a2.25,2.25,0,0,1-4.5,0ZM15,12.105a12.017,12.017,0,0,0-12,0V14.25H15Z" transform="translate(0 -3)" fill="var(--primary-color)"/>
      </svg></button>
    </li>
  </ul>

  <div class="notifications-list">
    {#each notifications as item}
      {#if (AppBskyFeedLike.isRecord(item.record) && (filter === 'all' || filter === 'like'))}
        <article class="notifications-item notifications-item--like">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a  href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> {$_('liked_your_post')}</h2>

          {#if (item.feed)}
            <p class="notifications-item__content">{item.feed.record.text}</p>
          {/if}
        </article>
      {:else if (AppBskyFeedRepost.isRecord(item.record) && (filter === 'all' || filter === 'repost'))}
        <article class="notifications-item notifications-item--repost">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> {$_('reposted_your_post')}</h2>

          {#if (item.feed)}
            <p class="notifications-item__content">{item.feed.record.text}</p>
          {/if}
        </article>
      {:else if ((item.reason === 'quote' && typeof item.reasonSubject === 'string') && (filter === 'all' || filter === 'reply_mention_quote'))}
        <article class="notifications-item notifications-item--quote">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> {$_('quoted_your_post')}</h2>

          {#if (AppBskyFeedPost.isRecord(item.record))}
            <p class="notifications-item__content">{item.record.text}</p>
          {/if}

          {#if (item.feed)}
            <p class="notifications-item__quote">{item.feed.record.text}</p>
          {/if}
        </article>
      {:else if ((item.reason === 'reply' && AppBskyFeedPost.isRecord(item.record)) && (filter === 'all' || filter === 'reply_mention_quote'))}
        <article class="notifications-item notifications-item--reply">
          <div class="notifications-item__heading">
            <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> {$_('replied_your_post')}・<a href="/profile/{item.author.handle}/post/{item.uri.split('/').slice(-1)[0]}">{$_('show_thread')}</a></h2>

            <div class="notifications-item-buttons">
              <button class="notifications-item-button" on:click={() => {$replyRef = item.uri}} aria-label="返信"><svg xmlns="http://www.w3.org/2000/svg" width="15" height="14" viewBox="0 0 15 14">
                <path id="reply" d="M77,110v-2.99s0-.006,0-.01a4,4,0,0,0-4-4H70v5l-6-6,6-6v5h3a6,6,0,0,1,6,6h0v3Z" transform="translate(-64 -96)" fill="var(--primary-color)"/>
              </svg></button>
            </div>
          </div>

          <p class="notifications-item__content">{item.record.text}</p>
        </article>
      {:else if ((item.reason === 'mention' && AppBskyFeedPost.isRecord(item.record)) && (filter === 'all' || filter === 'reply_mention_quote'))}
        <article class="notifications-item notifications-item--reply">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> {$_('mentioned_your_post')}</h2>

          <p class="notifications-item__content">{item.record.text}</p>
        </article>
      {:else if (item.reason === 'follow' && (filter === 'all' || filter === 'follow'))}
        <article class="notifications-item notifications-item--follow notifications-item--filter-{filter}">
          <div class="notifications-item__contents">
            <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> {$_('followed_you')}</h2>

            {#if (filter === 'follow' && item.author.description)}
              <p class="notifications-item__description">{item.author.description}</p>
            {/if}
          </div>

          <div class="notifications-item__buttons">
            <UserFollowButton following="{item.author.viewer?.following}" user={item.author}></UserFollowButton>
          </div>
        </article>
      {:else}
        <!-- svelte-ignore empty-block -->
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
      flex-wrap: wrap;
      align-items: center;
      gap: 5px 10px;
      margin-bottom: 15px;

      &__item {
          font-size: 14px;
      }
  }

  .notifications-filter-button {
      border: 1px solid var(--primary-color);
      min-width: 50px;
      height: 30px;
      padding: 0 10px;
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

  .notifications-item-buttons {

  }
</style>