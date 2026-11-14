<script lang="ts">
  import {_} from 'tokimeki-i18n';
  import UserFollowButton from "./UserFollowButton.svelte";
  import {agent, settings} from "$lib/stores";
  import Avatar from "../../Avatar.svelte";
  import BadgeCheck from '@lucide/svelte/icons/badge-check';
  import CircleCheck from '@lucide/svelte/icons/circle-check';
  import Handshake from '@lucide/svelte/icons/handshake';

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
  <div class="user-item__avatar">
    <Avatar href="/profile/{ user.handle }" avatar={user.avatar} handle={user.handle} profile={user} {_agent}></Avatar>
  </div>

  <div class="user-item__content">
    <a class="user-item__identity" href="/profile/{user.handle}">
      <h3 class="user-item__title">
        <span class="user-item__name">{user.displayName || user.handle}</span>

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
    </a>

    {#if (user.viewer?.followedBy && $settings?.design?.mutualDisplay)}
      <p class="user-item__relation">
        <Handshake size="14"></Handshake>
        <span>{$_('follows_you')}</span>
      </p>
    {/if}
  </div>

  {#if (user.did !== _agent.did())}
    <div class="user-item__buttons">
      <UserFollowButton following={user.viewer?.following} user={user} followChange={handleFollowChange} {_agent} style={layout === 'notification' ? 'tiny' : 'compact'}></UserFollowButton>
    </div>
  {/if}

  {#if user.description}
    <p class="user-item__description">{user.description}</p>
  {/if}
</div>

<style lang="postcss">
  .user-item {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr) auto;
      column-gap: 12px;
      row-gap: 4px;
      align-items: start;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-color-2);

      &:last-child {
          border-bottom: none;
      }

      &--notification {
          display: block;
          border-bottom: none;

          .user-item__avatar,
          .user-item__content,
          .user-item__description {
              display: none;
          }

          .user-item__buttons {
              padding-top: 0;
          }
      }

      &--noborder {
          border-bottom: none;
      }
  }

  .user-item__content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
  }

  .user-item__identity {
      display: block;
      min-width: 0;
      color: inherit;

      &:hover {
          text-decoration: none;

          .user-item__name {
              text-decoration: underline;
          }
      }
  }

  .user-item__title {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      font-size: 15px;
      line-height: 22px;
  }

  .user-item__name,
  .user-item__text,
  .user-item__relation span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
  }

  .user-item__text {
      font-size: 13px;
      line-height: 20px;
      color: var(--text-color-3);
  }

  .user-item__relation {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      font-size: 12px;
      line-height: 18px;
      color: var(--text-color-3);

      :global(svg) {
          flex: none;
      }
  }

  .user-item__description {
      grid-column: 2 / -1;
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-color-2);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
  }

  .user-item__buttons {
      grid-column: 3;
      padding-top: 5px;
  }
</style>
