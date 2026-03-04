<script lang="ts">
  import ProfileCard from "./ProfileCard.svelte";
  import {agent, isDataSaving, settings} from '$lib/stores';
  import {goto} from "$app/navigation";
  import {page} from "$app/state";
  import {profileHintState} from "$lib/classes/profileHintState.svelte";
  import {modalState} from "$lib/classes/modalState.svelte";
  import {onDestroy} from "svelte";

  let {
    _agent = $agent,
    avatar,
    handle,
    href,
    profile = undefined,
  } = $props();

  let avatarMouseOverTimeId: ReturnType<typeof setTimeout>;
  let isProfileShown = $state(false);

  const enableMochiHoppe = true;

  let linkEl: HTMLAnchorElement;
  let isDragging = false;
  let wasDragged = false;
  let startX = 0;
  let startY = 0;
  let dx = $state(0);
  let dy = $state(0);
  let currentAnimation: Animation | null = null;

  function handlePointerDown(e: PointerEvent) {
    if (!enableMochiHoppe) return;
    isDragging = true;
    wasDragged = false;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    dy = 0;
    if (currentAnimation) {
      currentAnimation.cancel();
      currentAnimation = null;
    }
    linkEl.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;
    dx = e.clientX - startX;
    dy = e.clientY - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      wasDragged = true;
      e.preventDefault();
    }
  }

  function handlePointerUp() {
    if (!isDragging) return;
    isDragging = false;

    if (wasDragged) {
      const currentTransform = linkEl.style.transform;
      linkEl.style.transform = '';
      dx = 0;
      dy = 0;

      currentAnimation = linkEl.animate([
        { transform: currentTransform },
        { transform: 'scale(1.1, 0.9)', offset: 0.25 },
        { transform: 'scale(0.95, 1.05)', offset: 0.5 },
        { transform: 'scale(1.03, 0.97)', offset: 0.75 },
        { transform: 'scale(1, 1)' }
      ], {
        duration: 500,
        easing: 'ease-out',
      });
      currentAnimation.onfinish = () => { currentAnimation = null; };
    }
  }

  function handleDragStart(e: DragEvent) {
    if (!enableMochiHoppe) return;
    e.preventDefault();
  }

  let mochiTransform = $derived.by(() => {
    if (!enableMochiHoppe) return undefined;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return undefined;

    const factor = Math.min(dist, 80) / 80;
    const angle = Math.atan2(dy, dx);

    const t = 20 * Math.tanh(dist / 60);
    const tx = t * Math.cos(angle);
    const ty = t * Math.sin(angle);

    const stretch = 1 + factor * 0.25;
    const compress = 1 / Math.sqrt(stretch);

    return `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${angle.toFixed(3)}rad) scale(${stretch.toFixed(3)}, ${compress.toFixed(3)}) rotate(${(-angle).toFixed(3)}rad)`;
  });

  async function handleAvatarMouseOver() {
      if (isDragging) return;

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

  function handleClick(e: Event) {
      e.preventDefault();
      e.stopPropagation();

      if (wasDragged) {
          wasDragged = false;
          return;
      }

      if (profile) {
          profileHintState.set(profile);
      }

      goto(href, {
          replaceState: page.state.showModal && page.url.pathname !== '/',
      });

      modalState.isVideoModalOpen = false;
      modalState.isMediaModalOpen = false;
  }

  onDestroy(() => {
    if (avatarMouseOverTimeId) {
      clearTimeout(avatarMouseOverTimeId);
    }
  });
</script>

<div class="avatar" class:avatar--live={profile?.status?.isActive}>
  <a bind:this={linkEl}
     href={href}
     onmouseover={handleAvatarMouseOver}
     onmouseleave={handleAvatarMouseLeave}
     onclick={handleClick}
     onpointerdown={handlePointerDown}
     onpointermove={handlePointerMove}
     onpointerup={handlePointerUp}
     ondragstart={handleDragStart}
     style:transform={mochiTransform}>
    {#if (avatar && !$isDataSaving)}
      <img loading="lazy" src={avatar} width="1000" height="1000" alt="" draggable="false">
    {/if}
  </a>

  {#if (isProfileShown)}
    <ProfileCard {handle} onmouseover={handleAvatarMouseOver} onmouseleave={handleAvatarMouseLeave} {_agent}></ProfileCard>
  {/if}

  {#if (profile?.status?.isActive)}
    <div class="profile-live-label">LIVE</div>
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
          -webkit-user-drag: none;
          user-select: none;
          touch-action: manipulation;

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
          aspect-ratio: 1 / 1;
          border-radius: var(--avatar-border-radius);
          height: auto;
          vertical-align: middle;
          display: block;
          pointer-events: none;
      }

      &--live {
        a {
          border: 2px solid var(--danger-color);
        }

        img {
          border: 2px solid var(--bg-color-1);
        }
      }
  }

  .profile-live-label {
    position: absolute;
    pointer-events: none;
    bottom: -4px;
    left: 0;
    right: 0;
    margin: auto;
    font-size: 10px;
    width: fit-content;
    background-color: var(--danger-color);
    color: #fff;
    font-weight: bold;
    padding: 2px;
    line-height: 1.2;
    border-radius: var(--border-radius-1);
  }
</style>
