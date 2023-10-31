<script lang="ts">
    import ProfileCard from "./ProfileCard.svelte";
    import { agent } from '$lib/stores';

    export let _agent = $agent;
    export let handle;

    let avatarMouseOverTimeId;
    let isProfileShown = false;

    async function handleMouseOver() {
        if (avatarMouseOverTimeId) {
            clearTimeout(avatarMouseOverTimeId);
        }

        avatarMouseOverTimeId = setTimeout(() => {
            isProfileShown = true;
        }, 500)
    }

    async function handleMouseLeave() {
        if (avatarMouseOverTimeId) {
            clearTimeout(avatarMouseOverTimeId);
        }

        avatarMouseOverTimeId = setTimeout(() => {
            isProfileShown = false;
        }, 350)
    }
</script>

<div class="profile-card-wrap" on:mouseover={handleMouseOver} on:mouseleave={handleMouseLeave}>
  <slot></slot>

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