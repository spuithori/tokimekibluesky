<script lang="ts">
  import {onMount} from "svelte";
  import {agent, settings} from "$lib/stores";
  import UserFollowButton from "./profile/[handle]/UserFollowButton.svelte";
  import { fade } from 'svelte/transition';
  import {_} from "svelte-i18n";
  import { offset, flip, shift } from '@floating-ui/dom';
  import { createFloatingActions } from 'svelte-floating-ui';
  import {BadgeCheck, CircleCheck} from "lucide-svelte";

  const [floatingRef, floatingContent] = createFloatingActions({
      strategy: 'fixed',
      placement: 'bottom-start',
      middleware: [offset(20), flip(), shift()],
  });

  let { _agent = $agent, handle, onmouseover, onmouseleave } = $props();
  let profile = $state();
  let el: HTMLElement | undefined = $state();

  onMount(async () => {
      const res = await _agent.agent.api.app.bsky.actor.getProfile({actor: handle});
      profile = res.data;
  })

  $effect(() => {
      if (el) {
          el.showPopover();
      }
  })
</script>

<span class="profile-card-target" use:floatingRef></span>
{#if profile}
  <aside class="profile-card" {onmouseover} {onmouseleave} transition:fade="{{ duration: 100 }}" use:floatingContent bind:this={el} popover="manual">
    <div class="profile-card-heading">
      <div class="profile-card-avatar">
        <img src="{profile.avatar}" alt="">
      </div>

      <div class="profile-card-name">
        {#if (profile.displayName)}
          <h3 class="profile-card-displayname">
            {profile.displayName}

            {#if profile?.verification?.trustedVerifierStatus === 'valid'}
              <span class="profile-card-verified">
                  <BadgeCheck size="16" color="var(--primary-color)" strokeWidth="2.25"></BadgeCheck>
              </span>
            {/if}

            {#if profile?.verification?.verifiedStatus === 'valid'}
              <span class="profile-card-verified">
                 <CircleCheck size="16" color="var(--primary-color)" strokeWidth="2.25"></CircleCheck>
              </span>
            {/if}
          </h3>
        {/if}

        <p class="profile-card-handle">@{profile.handle}</p>
      </div>
    </div>

    {#if (profile.description)}
      <p class="profile-card-description">
        {profile.description}
      </p>
    {/if}

    <div class="profile-relationship">
      <p class="profile-relationship__item"><span>{$settings.general?.hideProfileCounts ? '---' : profile.followsCount}</span> {$_('follows')}</p>
      <p class="profile-relationship__item"><span>{$settings.general?.hideProfileCounts ? '---' : profile.followersCount}</span> {$_('followers')}</p>

      {#if (profile.viewer?.followedBy)}
        <p class="profile-relationship__by">{$_('follows_you')}</p>
      {/if}
    </div>

    <div class="profile-card-button">
      {#if (profile.did !== _agent.did())}
        <div class="user-item__buttons">
          <UserFollowButton following={profile.viewer?.following} user={profile}></UserFollowButton>
        </div>
      {/if}
    </div>
  </aside>
{/if}

<style lang="postcss">
  .profile-card {
      font-weight: initial;
      left: 0;
      top: calc(100% + 10px);
      background-color: var(--bg-color-1);
      color: var(--text-color-1);
      box-shadow: 0 0 2px rgba(0, 0, 0, .12), 0 8px 16px rgba(0, 0, 0, .14);
      padding: 20px;
      border-radius: 6px;
      z-index: 100000;
      width: 300px;
      border: none;
      overflow: hidden;

      @media (max-width: 767px) {
          display: none;
      }

      @media (pointer: coarse) {
          display: none;
      }
  }

  .profile-card-heading {
      display: grid;
      grid-template-columns: 50px 1fr;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
  }

  .profile-card-name {
      min-width: 0;
  }

  .profile-card-displayname {
      font-size: 15px;
      white-space: wrap;
      overflow-wrap: break-word;
  }

  .profile-card-verified {
      display: inline-flex;
      vertical-align: middle;
  }

  .profile-card-handle {
      color: var(--text-color-3);
      font-size: 13px;
  }

  .profile-card-description {
      font-size: 13px;
      margin-bottom: 15px;
      white-space: pre-line;
  }

  .profile-card-avatar {
      display: flex;
      border-radius: 50%;
      overflow: hidden;
      background-color: var(--primary-color);
      aspect-ratio: 1 / 1;
      position: relative;

      img {
          width: 100%;
      }
  }

  .profile-relationship {
      font-size: 14px;
      font-weight: bold;
      line-height: 1.5;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0 10px;
      margin-bottom: 15px;

      &__by {
          font-weight: 400;
          font-size: 13px;
      }
  }

  .profile-relationship__item span {
      color: var(--text-color-2);
  }

  .profile-card-target {
      position: absolute;
      left: 0;
      bottom: 0;
      right: 0;
      top: 0;
      visibility: hidden;
  }
</style>