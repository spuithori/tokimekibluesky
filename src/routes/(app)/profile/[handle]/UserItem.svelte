<script lang="ts">
  import UserFollowButton from "./UserFollowButton.svelte";
  import {agent} from "$lib/stores";

  export let user;

</script>

<div class="user-item">
  <article class="user-item__user">
    <div class="user-item__avatar">
      <a href="/profile/{user.handle}">
        {#if (user.avatar)}
          <img src="{user.avatar}" alt="">
        {/if}
      </a>
    </div>

    <div class="user-item__content">
      <h3 class="user-item__title">{user.displayName || user.handle}</h3>
      <p class="user-item__text">{user.handle}</p>
    </div>
  </article>

  {#if (user.did !== $agent.did())}
    <div class="user-item__buttons">
      <UserFollowButton following="{user.viewer?.following}" user={user}></UserFollowButton>
    </div>
  {/if}
</div>

<style>
  .user-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-color-1);
      gap: 15px;
  }

  .user-item__user {
      display: grid;
      grid-template-columns: 60px 1fr;
      align-items: center;
      gap: 15px;
  }

  .user-item__avatar {
      display: flex;
      border-radius: 50%;
      overflow: hidden;
      background-color: var(--primary-color);
      aspect-ratio: 1 / 1;
  }

  .user-item__text {
      line-height: 1.3;
  }

  .user-item__avatar a {
      display: flex;
  }

  .user-item__avatar img {
      width: 100%;
      height: auto;
  }

  .user-item__buttons {
      flex-shrink: 0;
  }

  @media (max-width: 767px) {
      .user-item__user {
          grid-template-columns: 50px 1fr;
      }

      .user-item__title {
          font-size: 14px;
      }

      .user-item__text {
          font-size: 12px;
      }
  }
</style>