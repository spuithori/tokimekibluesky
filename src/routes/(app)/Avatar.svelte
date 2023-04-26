<script lang="ts">
  import ProfileCard from "./ProfileCard.svelte";

  export let avatar;
  export let handle;
  export let href;

  let avatarMouseOverTimeId;
  let isProfileShown = false;

  async function handleAvatarMouseOver() {
      if (avatarMouseOverTimeId) {
          clearTimeout(avatarMouseOverTimeId);
      }

      avatarMouseOverTimeId = setTimeout(() => {
          isProfileShown = true;
      }, 500)
  }

  async function handleAvatarMouseLeave() {
      if (avatarMouseOverTimeId) {
          clearTimeout(avatarMouseOverTimeId);
      }

      avatarMouseOverTimeId = setTimeout(() => {
          isProfileShown = false;
      }, 350)
  }
</script>

<div class="avatar">
  <a href={href} on:mouseover={handleAvatarMouseOver} on:mouseleave={handleAvatarMouseLeave}>
    {#if (avatar)}
      <img src="{avatar}" alt="" loading="lazy">
    {/if}
  </a>

  {#if (isProfileShown)}
    <ProfileCard handle={handle} on:mouseover={handleAvatarMouseOver} on:mouseleave={handleAvatarMouseLeave}></ProfileCard>
  {/if}
</div>

<style lang="postcss">
  .avatar {
      position: relative;

      a {
          background-color: var(--primary-color);
          aspect-ratio: 1 / 1;
          border-radius: 50%;
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
      }
  }
</style>