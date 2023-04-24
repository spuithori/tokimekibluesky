<script lang="ts">
    import ProfileCard from "./ProfileCard.svelte";

    export let handle;

    let avatarMouseOverTimeId;
    let isProfileShown = false;

    async function handleMouseOver() {
        if (avatarMouseOverTimeId) {
            clearTimeout(avatarMouseOverTimeId);
        }

        avatarMouseOverTimeId = setTimeout(() => {
            isProfileShown = true;
        }, 750)
    }

    async function handleMouseLeave() {
        if (avatarMouseOverTimeId) {
            clearTimeout(avatarMouseOverTimeId);
        }

        avatarMouseOverTimeId = setTimeout(() => {
            isProfileShown = false;
        }, 750)
    }
</script>

<div class="profile-card-wrap" on:mouseover={handleMouseOver} on:mouseleave={handleMouseLeave}>
  <slot></slot>

  {#if (isProfileShown)}
    <ProfileCard handle={handle} on:mouseover={handleMouseOver} on:mouseleave={handleMouseLeave}></ProfileCard>
  {/if}
</div>

<style lang="postcss">
    .profile-card-wrap {
        display: inline-block;
        position: relative;
    }
</style>