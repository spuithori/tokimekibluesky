<script lang="ts">
  import {_} from 'svelte-i18n';
  import UserFollowButton from "./UserFollowButton.svelte";
  import {agent, settings} from "$lib/stores";
  import Avatar from "../../Avatar.svelte";
  import {BadgeCheck, CircleCheck, Handshake} from "lucide-svelte";

  interface Props {
    _agent?: any;
    user: any;
    layout?: string;
  }

  let { _agent = $agent, user = $bindable(), layout = 'default' }: Props = $props();

  function handleFollowChange(obj) {
      user.viewer.following = obj.following;
  }
</script>

<div class="user-item user-item--{layout}">
  <article class="user-item__user">
    <Avatar href="/profile/{ user.handle }" avatar={user.avatar} handle={user.handle}></Avatar>

    <div class="user-item__content">
      <h3 class="user-item__title">
        {user.displayName || user.handle}

        {#if user?.verification?.trustedVerifierStatus === 'valid'}
          <span class="timeline__verified">
              <BadgeCheck size="16" color="var(--primary-color)" strokeWidth="2.25"></BadgeCheck>
          </span>
        {/if}

        {#if user?.verification?.verifiedStatus === 'valid'}
          <span class="timeline__verified">
             <CircleCheck size="16" color="var(--primary-color)" strokeWidth="2.25"></CircleCheck>
          </span>
        {/if}
      </h3>
      <p class="user-item__text">@{user.handle}</p>

      {#if (user.viewer?.followedBy && $settings?.design?.mutualDisplay)}
        <p class="profile-relationship-by">
          <Handshake size="18" color="var(--text-color-3)"></Handshake>
          {$_('follows_you')}
        </p>
      {/if}
    </div>
  </article>

  {#if (user.did !== _agent.did())}
    <div class="user-item__buttons">
      <UserFollowButton following="{user.viewer?.following}" user={user} followChange={handleFollowChange} {_agent}></UserFollowButton>
    </div>
  {/if}
</div>

<style lang="postcss">
  .user-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-color-1);
      gap: 15px;

      @container users-list (max-width: 320px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }

    &:last-child {
      border-bottom: none;
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

  .user-item__title {
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 4px;
  }

  .user-item__user {
      display: grid;
      grid-template-columns: 56px 1fr;
      align-items: center;
      gap: 12px;
  }

  .user-item__text {
      font-size: 14px;
      line-height: 1.5;
      color: var(--text-color-3);
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