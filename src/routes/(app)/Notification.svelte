<script>
    import { agent } from '$lib/stores';
    let notifications = Promise;
    import UserFollowButton from "./profile/[handle]/UserFollowButton.svelte";

    async function load() {
        let n = await $agent.agent.api.app.bsky.notification.list();
        console.log(n.data.notifications)
        return n.data.notifications
    }
    notifications = load();
</script>

<div>
  {#await notifications}
  {:then list}
    {#each list as item}
      {#if (item.reason === 'vote')}
        <article class="notification-item">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a  href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> がいいねしました</h2>

          {#await $agent.getFeed(item.record.subject.uri)}
          {:then feed}
            <p class="notifications-item__content">{feed.post.record.text}</p>
          {/await}
        </article>
      {:else if (item.reason === 'repost')}
        <article class="notification-item">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> がリポストしました</h2>

          {#await $agent.getFeed(item.record.subject.uri)}
          {:then feed}
            <p class="notifications-item__content">{feed.post.record.text}</p>
          {/await}
        </article>
      {:else if (item.reason === 'reply')}
        <article class="notification-item">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> が返信しました</h2>

          <p class="notifications-item__content">{item.record.text}</p>
        </article>
      {:else if (item.reason === 'follow')}
        <article class="notification-item notification-item--follow">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}">{item.author.displayName || item.author.handle}</a></span> にフォローされたよ</h2>
          <UserFollowButton following="{item.author.viewer?.following}" user={item.author}></UserFollowButton>
        </article>
      {:else}
      {/if}
    {/each}
  {/await}
</div>

<style>
  .notification-item {
      border-bottom: 1px solid var(--border-color-1);
      padding: 10px 0;
  }

  .notification-item--follow {
      display: flex;
      justify-content: space-between;
      align-items: center;
  }

  .notifications-item__title {
      font-size: 15px !important;
      line-height: 1.5 !important;
      font-weight: 600;
  }

  .notifications-item__content {
      font-size: 14px !important;
  }
</style>