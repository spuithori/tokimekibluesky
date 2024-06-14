<script lang="ts">
  import SocialProofModal from "$lib/components/profile/SocialProofModal.svelte";
  import {_} from "svelte-i18n";

  export let knownFollowers;
  export let actor;
  let isModalOpen = false;
</script>

{#if knownFollowers.followers.length}
  <div class="social-proof">
    <div class="social-proof-avatars">
      {#each knownFollowers.followers as actor}
        <div class="social-proof-avatars__item">
          <img src="{actor.avatar}" alt="">
        </div>
      {/each}
    </div>

    <p class="social-proof-text">
      <button class="social-proof-button" on:click={() => {isModalOpen = true}}>{$_('social_proof_text', {values: {name: knownFollowers.followers[0].displayName || knownFollowers.followers[0].handle, count: knownFollowers.count}})}</button>
    </p>
  </div>
{/if}

{#if isModalOpen}
  <SocialProofModal {actor} on:close={() => {isModalOpen = false}}></SocialProofModal>
{/if}

<style lang="postcss">
  .social-proof {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      position: relative;
  }

  .social-proof-avatars {
      display: flex;
      flex-shrink: 0;

      &__item {
          width: 32px;
          height: 32px;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border-radius: 50%;
          background-color: var(--primary-color);
          border: 2px solid var(--bg-color-1);

          &:not(:last-child) {
              margin-right: -16px;
          }
      }

      img {
          width: 100%;
          height: 100%;
      }
  }
  
  .social-proof-text {
      color: var(--text-color-3);
      font-size: 14px;
  }

  .social-proof-button {
      color: inherit;
      text-align: left;

      &::before {
          content: '';
          display: block;
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          right: 0;
      }

      &:hover {
          text-decoration: underline;
      }
  }
</style>