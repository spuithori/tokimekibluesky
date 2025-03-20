<script lang="ts">
  import ProfileCard from "./ProfileCard.svelte";
  import {agent, isDataSaving, settings} from '$lib/stores';
  import {goto} from "$app/navigation";
  import {page} from "$app/stores";
  import {profileHintState} from "$lib/classes/profileHintState.svelte";
  import {modalState} from "$lib/classes/modalState.svelte";

  let {
    _agent = $agent,
    avatar,
    handle,
    href,
    profile = undefined,
  } = $props();

  let avatarMouseOverTimeId;
  let isProfileShown = $state(false);

  async function handleAvatarMouseOver() {
      if ($settings?.design?.disableProfilePopup) {
          return false;
      }

      if (avatarMouseOverTimeId) {
          clearTimeout(avatarMouseOverTimeId);
      }

      avatarMouseOverTimeId = setTimeout(() => {
          isProfileShown = true;
      }, 500)
  }

  async function handleAvatarMouseLeave() {
      if ($settings?.design?.disableProfilePopup) {
          return false;
      }

      if (avatarMouseOverTimeId) {
          clearTimeout(avatarMouseOverTimeId);
      }

      avatarMouseOverTimeId = setTimeout(() => {
          isProfileShown = false;
      }, 350)
  }

  function handleClick(e) {
      e.preventDefault();

      if (profile) {
          profileHintState.set(profile);
      }

      goto(href, {
          replaceState: $page.state.showModal && $page.url.pathname !== '/',
      });

      modalState.isVideoModalOpen = false;
      modalState.isMediaModalOpen = false;
  }
</script>

<div class="avatar">
  <a href={href} onmouseover={handleAvatarMouseOver} onmouseleave={handleAvatarMouseLeave} onclick={handleClick}>
    {#if (avatar && !$isDataSaving)}
      <img loading="lazy" src="{avatar}" width="1000" height="1000" alt="">
    {/if}
  </a>

  {#if (isProfileShown)}
    <ProfileCard {handle} on:mouseover={handleAvatarMouseOver} on:mouseleave={handleAvatarMouseLeave} {_agent}></ProfileCard>
  {/if}
</div>

<style lang="postcss">
  .avatar {
      position: relative;
      z-index: 1;

      a {
          background-color: var(--primary-color);
          aspect-ratio: 1 / 1;
          border-radius: var(--avatar-border-radius);
          overflow: hidden;
          display: block;

          &::before {
              content: '';
              display: block;
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              border-radius: 30px;
              transition: background-color .2s ease-in-out;
          }

          &:hover {
              &::before {
                  background-color: rgba(0, 0, 0, .2);
              }
          }
      }

      img {
          width: 100%;
          height: auto;
          vertical-align: middle;
          display: block;
      }
  }
</style>