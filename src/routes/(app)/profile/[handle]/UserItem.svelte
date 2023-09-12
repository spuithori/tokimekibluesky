<script lang="ts">
  import UserFollowButton from "./UserFollowButton.svelte";
  import {agent} from "$lib/stores";
  import Avatar from "../../Avatar.svelte";

  export let _agent = $agent;
  export let user;
  export let layout = 'default';

  function handleFollowChange(event) {
      user.viewer.following = event.detail.following;
  }
</script>

<div class="user-item user-item--{layout}">
  <article class="user-item__user">
    <Avatar href="/profile/{ user.handle }" avatar={user.avatar} handle={user.handle}></Avatar>

    <div class="user-item__content">
      <h3 class="user-item__title">{user.displayName || user.handle}</h3>
      <p class="user-item__text">{user.handle}</p>
    </div>
  </article>

  {#if (user.did !== _agent.did())}
    <div class="user-item__buttons">
      <UserFollowButton following="{user.viewer?.following}" user={user} on:followchange={handleFollowChange} {_agent}></UserFollowButton>
    </div>
  {/if}
</div>

<style lang="postcss">
  .user-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-color-1);
      gap: 15px;

      @container users-list (max-width: 320px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }

      &--notification {
          border-bottom: none;

          .user-item__user {
              display: none;
          }
      }

      &--noborder {
          border-bottom: none;
      }
  }

  .user-item__user {
      display: grid;
      grid-template-columns: 60px 1fr;
      align-items: center;
      gap: 15px;
  }

  .user-item__text {
      line-height: 1.3;
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