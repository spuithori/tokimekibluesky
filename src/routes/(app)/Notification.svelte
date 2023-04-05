<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { agent } from '$lib/stores';
    import UserFollowButton from "./profile/[handle]/UserFollowButton.svelte";
    import { type AppBskyNotificationListNotifications, AppBskyFeedPost, AppBskyFeedLike, AppBskyFeedRepost, AppBskyFeedDefs } from '@atproto/api';

    let notifications: Promise<AppBskyNotificationListNotifications.Notification[]>;

    async function load() {
        let n = await $agent.agent.api.app.bsky.notification.listNotifications();
        console.log(n.data.notifications)
        return n.data.notifications
    }
    notifications = load();
</script>

<div>
  {#await notifications}
   <!-- svelte-ignore empty-block -->
  {:then list}
    {#each list as item}
      {#if (AppBskyFeedLike.isRecord(item.record))}
        <article class="notifications-item">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a  href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> {$_('liked_your_post')}</h2>

          {#await $agent.getFeed(item.record.subject.uri)}
            <!-- svelte-ignore empty-block -->
          {:then feed}
            {#if (AppBskyFeedDefs.isThreadViewPost(feed) && AppBskyFeedPost.isRecord(feed.post.record))}
              <p class="notifications-item__content">{feed.post.record.text}</p>
            {/if}
          {/await}
        </article>
      {:else if (AppBskyFeedRepost.isRecord(item.record))}
        <article class="notifications-item">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> {$_('reposted_your_post')}</h2>

          {#await $agent.getFeed(item.record.subject.uri)}
            <!-- svelte-ignore empty-block -->
          {:then feed}
            {#if (AppBskyFeedDefs.isThreadViewPost(feed) && AppBskyFeedPost.isRecord(feed.post.record))}
              <p class="notifications-item__content">{feed.post.record.text}</p>
            {/if}
          {/await}
        </article>
      {:else if (item.reason === 'quote' && typeof item.reasonSubject === 'string')}
        <article class="notifications-item">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> {$_('quoted_your_post')}</h2>

          {#if (AppBskyFeedPost.isRecord(item.record))}
            <p class="notifications-item__content">{item.record.text}</p>
          {/if}

          {#await $agent.getFeed(item.reasonSubject)}
            <!-- svelte-ignore empty-block -->
          {:then feed}
            {#if (AppBskyFeedDefs.isThreadViewPost(feed) && AppBskyFeedPost.isRecord(feed.post.record))}
              <p class="notifications-item__quote">{feed.post.record.text}</p>
            {/if}
          {/await}
        </article>
      {:else if (item.reason === 'reply' && AppBskyFeedPost.isRecord(item.record))}
        <article class="notifications-item">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> {$_('replied_your_post')}</h2>

          <p class="notifications-item__content">{item.record.text}</p>
        </article>
      {:else if (item.reason === 'follow')}
        <article class="notifications-item notifications-item--follow">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> {$_('followed_you')}</h2>
          <UserFollowButton following="{item.author.viewer?.following}" user={item.author}></UserFollowButton>
        </article>
      {:else}
       <!-- svelte-ignore empty-block -->
      {/if}
    {/each}
  {/await}
</div>

<style lang="postcss">
  .notifications-item {
      border-bottom: 1px solid var(--border-color-1);
      padding: 10px 0;

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

      &--follow {
          display: flex;
          justify-content: space-between;
          align-items: center;
      }
  }
</style>