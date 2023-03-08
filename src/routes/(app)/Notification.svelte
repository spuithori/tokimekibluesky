<script>
    import { agent } from '$lib/stores';
    import { onMount } from 'svelte';
    let notifications = Promise;
    import { fade, fly } from 'svelte/transition';
    import UserFollowButton from "./profile/[handle]/UserFollowButton.svelte";

    async function load() {
        let n = await $agent.agent.api.app.bsky.notification.list();
        console.log(n.data.notifications)
        return n.data.notifications
    }
    notifications = load();
</script>

<div class="notification" in:fly="{{ y: 50, duration: 350 }}">
  {#await notifications}
  {:then list}
    {#each list as item}
      {#if (item.reason === 'vote')}
        <article class="notification-item">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a  href="/profile/{item.author.handle}" data-sveltekit-reload>{item.author.displayName || item.author.handle}</a></span> がいいねしました</h2>

          {#await $agent.getFeed(item.record.subject.uri)}
          {:then feed}
            <p class="notifications-item__content">{feed.post.record.text}</p>
          {/await}
        </article>
      {:else if (item.reason === 'repost')}
        <article class="notification-item">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}" data-sveltekit-reload>{item.author.displayName || item.author.handle}</a></span> がリポストしました</h2>

          {#await $agent.getFeed(item.record.subject.uri)}
          {:then feed}
            <p class="notifications-item__content">{feed.post.record.text}</p>
          {/await}
        </article>
      {:else if (item.reason === 'reply')}
        <article class="notification-item">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}" data-sveltekit-reload>{item.author.displayName || item.author.handle}</a></span> が返信しました</h2>

          <p class="notifications-item__content">{item.record.text}</p>
        </article>
      {:else if (item.reason === 'follow')}
        <article class="notification-item notification-item--follow">
          <h2 class="notifications-item__title"><span class="notifications-item__name"><a href="/profile/{item.author.handle}" data-sveltekit-reload>{item.author.displayName || item.author.handle}</a></span> にフォローされたよ</h2>
          <UserFollowButton following="{item.author.viewer?.following}" user={item.author}></UserFollowButton>
        </article>
      {:else}
      {/if}
    {/each}
  {/await}
</div>

<style>
  .notification {
      position: absolute;
      top: 80px;
      right: 0;
      width: 500px;
      height: 600px;
      overflow: auto;
      background-color: #fff;
      border-radius: 8px;
      border: 1px solid #aaa;
      box-shadow: 0 0 16px rgba(0, 0, 0, .16);
      padding: 20px;
      z-index: 200;
  }

  @media (max-width: 767px) {
      .notification {
          position: fixed;
          top: 70px;
          bottom: 0;
          left: 0;
          right: 0;
          width: auto;
          height: auto;
      }
  }

  .notification-item {
      border-bottom: 1px solid #aaa;
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