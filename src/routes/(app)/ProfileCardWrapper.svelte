<script lang="ts">
    import ProfileCard from "./ProfileCard.svelte";
    import { agent, settings } from '$lib/stores';

    let { _agent = $agent, handle, children } = $props();

    let avatarMouseOverTimeId;
    let isProfileShown = $state(false);

    async function handleMouseOver() {
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

    async function handleMouseLeave() {
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
</script>

<div class="profile-card-wrap" onmouseover={handleMouseOver} onmouseleave={handleMouseLeave}>
  {@render children?.()}

  {#if (isProfileShown)}
    <ProfileCard handle={handle} on:mouseover={handleMouseOver} on:mouseleave={handleMouseLeave} {_agent}></ProfileCard>
  {/if}
</div>

<style lang="postcss">
    .profile-card-wrap {
      display: inline;
      position: relative;
    }
</style>