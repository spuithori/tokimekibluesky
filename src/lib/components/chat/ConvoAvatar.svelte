<script lang="ts">
    import Avatar from "../../../routes/(app)/Avatar.svelte";
    import Users from '@lucide/svelte/icons/users';
    import { isDataSaving } from "$lib/stores";
    import { isGroupConvo, getConvoAvatarMembers, getOtherMembers } from "$lib/components/chat/convoUtil";

    let { convo, _agent, size = 46 } = $props();

    const isGroup = $derived(isGroupConvo(convo));
    const myDid = $derived(_agent?.did?.());
    const groupMembers = $derived(getConvoAvatarMembers(convo, myDid, 2));
    const other = $derived(getOtherMembers(convo, myDid)[0]);
</script>

<div class="convo-avatar" style:--convo-avatar-size="{size}px">
  {#if isGroup}
    {#if groupMembers.length >= 2}
      <div class="convo-avatar__stack">
        {#each groupMembers as member, i (member.did)}
          <div class="convo-avatar__bubble" class:convo-avatar__bubble--front={i === 1}>
            {#if member.avatar && !$isDataSaving}
              <img loading="lazy" src={member.avatar} alt="" width="100" height="100">
            {:else}
              <Users size={size * 0.32} color="var(--bg-color-1)"></Users>
            {/if}
          </div>
        {/each}
      </div>
    {:else if groupMembers.length === 1}
      <div class="convo-avatar__single">
        {#if groupMembers[0].avatar && !$isDataSaving}
          <img loading="lazy" src={groupMembers[0].avatar} alt="" width="100" height="100">
        {:else}
          <Users size={size * 0.5} color="var(--bg-color-1)"></Users>
        {/if}
      </div>
    {:else}
      <div class="convo-avatar__single">
        <Users size={size * 0.5} color="var(--bg-color-1)"></Users>
      </div>
    {/if}
  {:else}
    <Avatar href="/profile/{other?.handle}" avatar={other?.avatar} handle={other?.handle} {_agent}></Avatar>
  {/if}
</div>

<style lang="postcss">
  .convo-avatar {
      width: var(--convo-avatar-size);

      &__stack {
          position: relative;
          width: var(--convo-avatar-size);
          aspect-ratio: 1 / 1;
      }

      &__bubble {
          position: absolute;
          top: 0;
          left: 0;
          width: calc(var(--convo-avatar-size) * .68);
          aspect-ratio: 1 / 1;
          border-radius: 50%;
          background-color: var(--primary-color);
          display: grid;
          place-content: center;
          overflow: hidden;

          &--front {
              top: auto;
              left: auto;
              bottom: 0;
              right: 0;
              outline: 2px solid var(--bg-color-1);
          }
      }

      &__single {
          width: var(--convo-avatar-size);
          aspect-ratio: 1 / 1;
          border-radius: var(--avatar-border-radius);
          background-color: var(--primary-color);
          display: grid;
          place-content: center;
          overflow: hidden;
      }

      img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
      }
  }
</style>
